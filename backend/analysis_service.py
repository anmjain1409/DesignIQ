from backend.neo4j_client import neo4j_client

class AnalysisService:
    def __init__(self):
        self.db = neo4j_client

    def analyze_change(self, component_name: str, discipline: str, user_email: str):
        # Use CONTAINS for flexible matching (title-based input from frontend)
        # 1. Fetch Node Details first (including extracted CAD properties)
        node_query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_ASSEMBLY|HAS_SUBASSEMBLY|HAS_COMPONENT*0..5]->(c)
        WHERE (c:Asset OR c:System OR c:Assembly OR c:SubAssembly OR c:Component)
          AND (toLower(c.name) CONTAINS toLower($component_name) OR toLower($component_name) CONTAINS toLower(c.name))
        OPTIONAL MATCH (c)-[:HAS_PROPERTY]->(p:Property)
        RETURN properties(c) AS base_details, collect({key: p.name, value: p.value}) AS extra_properties, labels(c) AS types
        LIMIT 1
        """
        node_records = self.db._execute_query(node_query, {"component_name": component_name, "user_email": user_email})
        
        if not node_records:
            return {"error": "Node not found"}
            
        # Merge base properties with extra properties from Property nodes
        node_details = node_records[0]["base_details"]
        for prop in node_records[0]["extra_properties"]:
            if prop["key"]:
                node_details[prop["key"]] = prop["value"]
                
        actual_type = node_records[0]["types"][0] if node_records[0]["types"] else node_type

        # 2. Fetch Impacts
        impact_query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_ASSEMBLY|HAS_SUBASSEMBLY|HAS_COMPONENT*0..4]->(c)
        WHERE (toLower(c.name) CONTAINS toLower($component_name) OR toLower($component_name) CONTAINS toLower(c.name))
        WITH c
        MATCH (c)-[:CONNECTED_TO|CONTAINS*1..3]-(affected)
        WHERE id(affected) <> id(c)
          AND (affected:Component OR affected:SubAssembly OR affected:Assembly OR affected:System)
        RETURN DISTINCT affected.name AS name
        """
        impact_records = self.db._execute_query(impact_query, {"component_name": component_name, "user_email": user_email})
        impacted_components = [r["name"].strip() for r in impact_records if r.get("name") and str(r["name"]).strip()]

        # Risk level
        dependency_count = len(impacted_components)
        if dependency_count > 5:
            risk_level = "High"
        elif dependency_count > 2:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        base_cost = 5000
        estimated_cost = base_cost + (dependency_count * 1500)
        timeline_weeks = 1 + dependency_count // 2
        estimated_timeline = f"{timeline_weeks} weeks"

        # Fetch the CAD hierarchy for the matching component
        cad_query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM]->(s:System)-[:HAS_COMPONENT]->(c:Component)
        WHERE toLower(c.name) CONTAINS toLower($component_name)
           OR toLower($component_name) CONTAINS toLower(c.name)
        RETURN a.name AS asset, a.industry AS industry, s.name AS system, c.name AS component
        LIMIT 1
        """
        cad_records = self.db._execute_query(cad_query, {"component_name": component_name, "user_email": user_email})

        if cad_records:
            r = cad_records[0]
            cad_graph = {
                "asset": r.get("asset", "Asset"),
                "industry": r.get("industry", ""),
                "system": r.get("system", "System"),
                "component": r.get("component", component_name),
            }
        else:
            cad_graph = {
                "asset": "Uploaded Asset",
                "industry": discipline,
                "system": f"{discipline} System",
                "component": component_name,
            }

        # Build hub-and-spoke affected graph
        affected_nodes = [{"id": "root", "name": component_name, "type": "root"}]
        affected_links = []
        for i, comp in enumerate(impacted_components[:12]):
            node_id = f"imp_{i}"
            affected_nodes.append({"id": node_id, "name": comp, "type": "impacted"})
            affected_links.append({"source": "root", "target": node_id})

        return {
            "target_component": component_name,
            "node_type": actual_type,
            "impacted_components": impacted_components,
            "risk_level": risk_level,
            "estimated_cost": f"₹{estimated_cost:,}",
            "timeline": estimated_timeline,
            "cad_graph": cad_graph,
            "details": node_details,
            "affected_graph": {
                "nodes": affected_nodes,
                "links": affected_links,
            },
        }

analysis_service = AnalysisService()
