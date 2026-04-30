import os
import json
from neo4j import GraphDatabase

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "designiq123")

class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))

    def close(self):
        self.driver.close()

    def _execute_query(self, query, parameters=None):
        with self.driver.session() as session:
            result = session.run(query, parameters)
            return [record.data() for record in result]

    def get_systems_by_industry(self, industry: str, user_email: str):
        query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset {industry: $industry})-[:HAS_SYSTEM]->(s:System)
        RETURN a.name AS product, s.name AS system, s.generic AS generic_system
        """
        return self._execute_query(query, {"industry": industry, "user_email": user_email})

    def create_user(self, email, hashed_password, name=None, role="Engineer"):
        query = """
        MERGE (u:User {email: $email})
        ON CREATE SET u.password = $password, u.name = $name, u.role = $role
        RETURN u
        """
        # Default name to email prefix if not provided
        user_name = name or email.split('@')[0].replace('.', ' ').title()
        return self._execute_query(query, {"email": email, "password": hashed_password, "name": user_name, "role": role})

    def get_user(self, email):
        query = "MATCH (u:User {email: $email}) RETURN u"
        result = self._execute_query(query, {"email": email})
        return result[0]['u'] if result else None

    def get_graph_by_asset(self, asset_name: str, user_email: str, filter_type: str = "Both"):
        query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset {name: $asset_name})
        OPTIONAL MATCH (a)-[r1:HAS_SYSTEM]->(s:System)
        OPTIONAL MATCH (s)-[r2:HAS_COMPONENT]->(c:Component)
        WHERE $filter_type = 'Both' OR c.type = $filter_type
        
        OPTIONAL MATCH (c)-[r3:CONNECTED_TO]->(c2:Component)
        WHERE $filter_type = 'Both' OR c2.type = $filter_type
        
        OPTIONAL MATCH (c)-[r_rep:REPRESENTS]-(c_rep:Component)
        WHERE $filter_type = 'Both'
        
        OPTIONAL MATCH (c)-[r4:HAS_PROPERTY]->(prop:Property)
        
        RETURN a, r1, s, r2, c, r3, c2, r4, prop, r_rep, c_rep
        """
        records = self._execute_query(query, {"asset_name": asset_name, "user_email": user_email, "filter_type": filter_type})
        
        # Transform to node and link format for react-force-graph
        nodes_dict = {}
        links = []
        
        def add_node(node_obj, node_type, extra_labels=None):
            if not node_obj: return None
            node_id = f"{node_type}_{node_obj['name']}"
            if node_id not in nodes_dict:
                nodes_dict[node_id] = {
                    "id": node_id,
                    "name": node_obj["name"],
                    "group": node_type,
                    "val": 1
                }
                if extra_labels:
                    nodes_dict[node_id].update(extra_labels)
                if 'type' in node_obj:
                    nodes_dict[node_id]["type"] = node_obj['type']
            return node_id

        for record in records:
            a_id = add_node(record.get('a'), "Asset", {"industry": record.get('a', {}).get('industry')})
            s_id = add_node(record.get('s'), "System", {"generic": record.get('s', {}).get('generic')})
            c_id = add_node(record.get('c'), "Component")
            c2_id = add_node(record.get('c2'), "Component")
            c_rep_id = add_node(record.get('c_rep'), "Component")
            prop_id = add_node(record.get('prop'), "Property")
            
            if a_id and s_id and {"source": a_id, "target": s_id} not in links:
                links.append({"source": a_id, "target": s_id})
            if s_id and c_id and {"source": s_id, "target": c_id} not in links:
                links.append({"source": s_id, "target": c_id})
            if c_id and c2_id and {"source": c_id, "target": c2_id} not in links:
                links.append({"source": c_id, "target": c2_id})
            if c_id and prop_id and {"source": c_id, "target": prop_id} not in links:
                links.append({"source": c_id, "target": prop_id})
            if c_id and c_rep_id and {"source": c_id, "target": c_rep_id} not in links:
                links.append({"source": c_id, "target": c_rep_id})
                
        return {
            "nodes": list(nodes_dict.values()),
            "links": links
        }

    def ingest_cad_data(self, data: dict, industry_prefix: str, user_email: str = None):
        # Ingestion logic with Asset/System/Component hierarchy from flowchart
        # We ensure isolation by merging nodes relative to their parents and the user
        query = f"""
        MATCH (u:User {{email: $user_email}})
        
        // Asset is unique to user
        MERGE (u)-[:OWNS]->(a:Asset {{name: $product, industry: $industry}})
        ON CREATE SET a.createdAt = timestamp(), a.owner = $user_email
        
        // System is unique to asset
        MERGE (a)-[:HAS_SYSTEM]->(s:System {{name: $system}})
        ON CREATE SET s.generic = $generic_system
        
        // Component is unique to system
        MERGE (s)-[:HAS_COMPONENT]->(comp:Component {{name: $part, type: $type}})
        ON CREATE SET 
            comp.assembly = $assembly,
            comp.supplier = $supplier,
            comp.version = $version
            
        // Add Properties unique to component
        WITH comp, $raw_metadata AS raw
        UNWIND keys(raw) AS prop_name
        MERGE (comp)-[:HAS_PROPERTY]->(p:Property {{name: prop_name, value: toString(raw[prop_name])}})
        
        // Dynamic Connection Parser: Link components if they appear in a connection string
        WITH comp, $raw_metadata AS raw
        WHERE raw.connections IS NOT NULL
        WITH comp, split(replace(replace(replace(raw.connections, "[", ""), "]", ""), "'", ""), ",") AS conn_list
        UNWIND conn_list AS conn
        WITH comp, trim(split(conn, "(")[0]) AS link_str
        WHERE link_str CONTAINS "-"
        WITH comp, split(link_str, "-")[0] AS source_name, split(link_str, "-")[1] AS target_name
        MATCH (u:User {{email: $user_email}})-[:OWNS]->(asset:Asset)-[:HAS_SYSTEM|HAS_COMPONENT*1..2]->(other:Component)
        WHERE (other.name = source_name OR other.name = target_name) AND id(other) <> id(comp)
        MERGE (comp)-[:CONNECTED_TO]->(other)
        
        // Mapping Layer: Link 2D and 3D counterparts within the SAME asset/user context
        WITH comp
        MATCH (u:User {{email: $user_email}})-[:OWNS]->(asset:Asset)-[:HAS_SYSTEM|HAS_COMPONENT*1..2]->(other:Component)
        WHERE id(other) <> id(comp) 
          AND other.name = comp.name
          AND other.type <> comp.type
        MERGE (comp)-[:REPRESENTS]-(other)
        
        RETURN comp
        """
        parameters = {**data, "user_email": user_email}
        self._execute_query(query, parameters)
        return True

    def run_impact_analysis(self, node_name: str, node_type: str, user_email: str):
        # Impact Analysis Engine: Graph Traversal CONNECTED_TO*
        # Ensure the node belongs to the user first
        query = f"""
        MATCH (u:User {{email: $user_email}})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*0..]->(n:{node_type} {{name: $node_name}})
        WITH n
        MATCH (n)<-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*]-(upstream)
        RETURN DISTINCT labels(upstream)[0] AS type, upstream.name AS name
        """
        records = self._execute_query(query, {"node_name": node_name, "user_email": user_email})
        return records

    def create_change_request(self, component_name: str, node_type: str, user_email: str,
                               title: str = None, priority: str = 'Medium', discipline: str = 'General'):
        cr_title = title or f'Design Change: {component_name}'
        query_simple = """
        MATCH (u:User {email: $user_email})
        OPTIONAL MATCH (u)-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*0..]->(c:Component {name: $component_name})
        WITH DISTINCT u, c
        CREATE (cr:ChangeRequest {
            id: 'CR-' + toString(timestamp()),
            title: $cr_title,
            status: 'Pending',
            priority: $priority,
            discipline: $discipline,
            component: $component_name,
            createdAt: timestamp(),
            user: $user_email
        })
        FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
            MERGE (cr)-[:AFFECTS]->(c)
        )
        RETURN cr
        """
        return self._execute_query(query_simple, {
            "component_name": component_name,
            "user_email": user_email,
            "cr_title": cr_title,
            "priority": priority,
            "discipline": discipline
        })

    def get_change_requests(self, user_email: str):
        query = """
        MATCH (cr:ChangeRequest {user: $user_email})
        OPTIONAL MATCH (cr)-[:AFFECTS]->(c:Component)
        RETURN DISTINCT cr.id AS id, cr.title AS title, cr.status AS status, cr.priority AS priority,
               coalesce(c.name, cr.component) AS component, cr.createdAt AS time
        ORDER BY cr.createdAt DESC
        """
        return self._execute_query(query, {"user_email": user_email})

    def get_full_user_graph(self, user_email: str):
        """Return the complete BOM graph for all assets owned by a user."""
        query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)
        OPTIONAL MATCH (a)-[r1:HAS_SYSTEM]->(s:System)
        OPTIONAL MATCH (s)-[r2:HAS_COMPONENT]->(c:Component)
        OPTIONAL MATCH (c)-[r3:CONNECTED_TO]->(c2:Component)
        RETURN a, r1, s, r2, c, r3, c2
        """
        records = self._execute_query(query, {"user_email": user_email})
        nodes_dict = {}
        links = []
        
        def add_node(obj, group):
            if not obj: return None
            node_id = f"{group}_{obj.get('name','?')}"
            if node_id not in nodes_dict:
                nodes_dict[node_id] = {"id": node_id, "name": obj.get("name", "?"), "group": group}
            return node_id

        for r in records:
            a_id = add_node(r.get("a"), "Asset")
            s_id = add_node(r.get("s"), "System")
            c_id = add_node(r.get("c"), "Component")
            c2_id = add_node(r.get("c2"), "Component")
            
            if a_id and s_id and {"source": a_id, "target": s_id} not in links:
                links.append({"source": a_id, "target": s_id})
            if s_id and c_id and {"source": s_id, "target": c_id} not in links:
                links.append({"source": s_id, "target": c_id})
            if c_id and c2_id and {"source": c_id, "target": c2_id} not in links:
                links.append({"source": c_id, "target": c2_id})
                
        return {"nodes": list(nodes_dict.values()), "links": links}

    def get_assets(self, user_email: str):
        query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)
        RETURN a.name AS name, a.industry AS industry, id(a) AS id, a.createdAt AS createdAt
        ORDER BY a.createdAt DESC
        """
        return self._execute_query(query, {"user_email": user_email})

    def get_dashboard_stats(self, user_email: str):
        query = """
        MATCH (u:User {email: $user_email})
        OPTIONAL MATCH (u)-[:OWNS]->(a:Asset)
        OPTIONAL MATCH (a)-[:HAS_SYSTEM]->(s:System)
        OPTIONAL MATCH (s)-[:HAS_COMPONENT]->(c:Component)
        WITH u,
             count(DISTINCT a) AS total_assets,
             count(DISTINCT s) AS total_systems,
             count(DISTINCT c) AS total_components
        OPTIONAL MATCH (u)-[:OWNS]->(asset:Asset)
        WITH u, total_assets, total_systems, total_components, asset
        ORDER BY asset.createdAt DESC
        RETURN
            total_assets, total_systems, total_components,
            [x IN collect({
                id: id(asset),
                title: asset.name,
                type: 'ingestion',
                time: 'Recently',
                action: 'CAD Data Ingested',
                user: u.email
            }) WHERE x.id IS NOT NULL][0..5] AS recent_activity
        """
        result = self._execute_query(query, {"user_email": user_email})
        if not result:
            return {"total_assets": 0, "total_systems": 0, "total_components": 0, "recent_activity": []}
        row = result[0]
        # Ensure recent_activity is always a list
        if row.get("recent_activity") is None:
            row["recent_activity"] = []
        return row

    def get_node_properties(self, node_name: str, node_type: str, user_email: str):
        query = f"""
        MATCH (u:User {{email: $user_email}})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*0..]->(n:{node_type} {{name: $node_name}})
        OPTIONAL MATCH (n)-[:HAS_PROPERTY]->(p:Property)
        RETURN n, collect({{key: p.name, value: p.value}}) AS properties
        """
        result = self._execute_query(query, {"node_name": node_name, "user_email": user_email})
        if not result:
            return None
        
        node_data = result[0]['n']
        properties = {item['key']: item['value'] for item in result[0]['properties'] if item['key'] is not None}
        
        return {**node_data, "properties": properties}

neo4j_client = Neo4jClient()
