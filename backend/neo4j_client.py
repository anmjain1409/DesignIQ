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

    def get_systems_by_industry(self, industry: str):
        query = """
        MATCH (a:Asset {industry: $industry})-[:HAS_SYSTEM]->(s:System)
        RETURN a.name AS product, s.name AS system, s.generic AS generic_system
        """
        return self._execute_query(query, {"industry": industry})

    def create_user(self, email, hashed_password):
        query = """
        MERGE (u:User {email: $email})
        ON CREATE SET u.password = $password
        RETURN u
        """
        return self._execute_query(query, {"email": email, "password": hashed_password})

    def get_user(self, email):
        query = "MATCH (u:User {email: $email}) RETURN u"
        result = self._execute_query(query, {"email": email})
        return result[0]['u'] if result else None

    def get_graph_by_asset(self, asset_name: str):
        query = """
        MATCH (a:Asset {name: $asset_name})
        OPTIONAL MATCH (a)-[r1:HAS_SYSTEM]->(s:System)
        OPTIONAL MATCH (s)-[r2:HAS_COMPONENT]->(c:Component)
        OPTIONAL MATCH (c)-[r3:CONNECTED_TO]->(c2:Component)
        OPTIONAL MATCH (c)-[r4:HAS_PROPERTY]->(prop:Property)
        
        RETURN a, r1, s, r2, c, r3, c2, r4, prop
        """
        records = self._execute_query(query, {"asset_name": asset_name})
        
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
            return node_id

        for record in records:
            a_id = add_node(record.get('a'), "Asset", {"industry": record.get('a', {}).get('industry')})
            s_id = add_node(record.get('s'), "System", {"generic": record.get('s', {}).get('generic')})
            c_id = add_node(record.get('c'), "Component")
            c2_id = add_node(record.get('c2'), "Component")
            prop_id = add_node(record.get('prop'), "Property")
            
            if a_id and s_id and {"source": a_id, "target": s_id} not in links:
                links.append({"source": a_id, "target": s_id})
            if s_id and c_id and {"source": s_id, "target": c_id} not in links:
                links.append({"source": s_id, "target": c_id})
            if c_id and c2_id and {"source": c_id, "target": c2_id} not in links:
                links.append({"source": c_id, "target": c2_id})
            if c_id and prop_id and {"source": c_id, "target": prop_id} not in links:
                links.append({"source": c_id, "target": prop_id})
                
        return {
            "nodes": list(nodes_dict.values()),
            "links": links
        }

    def ingest_cad_data(self, data: dict, industry_prefix: str, user_email: str = None):
        # Ingestion logic with Asset/System/Component hierarchy from flowchart
        query = f"""
        MATCH (u:User {{email: $user_email}})
        MERGE (a:Asset {{name: $product, industry: $industry}})
        MERGE (u)-[:OWNS]->(a)
        
        MERGE (s:System {{name: $system}})
        ON CREATE SET s.generic = $generic_system
        MERGE (a)-[:HAS_SYSTEM]->(s)
        
        MERGE (comp:Component {{name: $part, type: $type}})
        ON CREATE SET 
            comp.assembly = $assembly,
            comp.supplier = $supplier,
            comp.version = $version
            
        MERGE (s)-[:HAS_COMPONENT]->(comp)
        
        // Add Properties from flowchart
        WITH comp, $raw_metadata AS raw
        UNWIND keys(raw) AS prop_name
        MERGE (p:Property {{name: prop_name, value: toString(raw[prop_name])}})
        MERGE (comp)-[:HAS_PROPERTY]->(p)
        
        // Mapping Layer: Link 2D and 3D counterparts if they share same name
        WITH comp
        MATCH (other:Component {{name: comp.name}})
        WHERE id(other) <> id(comp) AND other.type <> comp.type
        MERGE (comp)-[:REPRESENTS]-(other)
        
        RETURN comp
        """
        parameters = {**data, "user_email": user_email}
        self._execute_query(query, parameters)
        return True

    def run_impact_analysis(self, node_name: str, node_type: str):
        # Impact Analysis Engine: Graph Traversal CONNECTED_TO*
        # Find all upstream (affected) nodes
        query = f"""
        MATCH (n:{node_type} {{name: $node_name}})<-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*]-(upstream)
        RETURN DISTINCT labels(upstream)[0] AS type, upstream.name AS name
        """
        records = self._execute_query(query, {"node_name": node_name})
        return records

    def get_node_properties(self, node_name: str, node_type: str):
        query = f"""
        MATCH (n:{node_type} {{name: $node_name}})
        OPTIONAL MATCH (n)-[:HAS_PROPERTY]->(p:Property)
        RETURN n, collect({{key: p.name, value: p.value}}) AS properties
        """
        result = self._execute_query(query, {"node_name": node_name})
        if not result:
            return None
        
        node_data = result[0]['n']
        properties = {item['key']: item['value'] for item in result[0]['properties'] if item['key'] is not None}
        
        return {**node_data, "properties": properties}

neo4j_client = Neo4jClient()
