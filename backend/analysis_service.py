from backend.neo4j_client import neo4j_client
import random

class AnalysisService:
    def __init__(self):
        self.db = neo4j_client

    def analyze_change(self, component_name: str, discipline: str, user_email: str):
        # Query Neo4j to find impacted components using dependency relationships
        # Example query: MATCH (c {name: $component})-[*]->(n) RETURN n
        query = """
        MATCH (u:User {email: $user_email})-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*0..]->(c:Component {name: $component_name})
        OPTIONAL MATCH (c)-[:CONNECTED_TO|HAS_COMPONENT|HAS_SYSTEM*1..5]-(n:Component)
        WHERE id(n) <> id(c)
        RETURN DISTINCT n.name AS name
        """
        records = self.db._execute_query(query, {"component_name": component_name, "user_email": user_email})
        impacted_components = [r["name"] for r in records if r.get("name")]

        # Compute Risk level
        dependency_count = len(impacted_components)
        if dependency_count > 5:
            risk_level = "High"
        elif dependency_count > 2:
            risk_level = "Medium"
        else:
            risk_level = "Low"

        # Compute Estimated cost
        base_cost = 5000
        estimated_cost = base_cost + (dependency_count * 1500)

        # Estimated timeline
        timeline_weeks = 1 + dependency_count // 2
        estimated_timeline = f"{timeline_weeks} weeks"

        return {
            "impacted_components": impacted_components,
            "risk_level": risk_level,
            "estimated_cost": f"₹{estimated_cost}",
            "timeline": estimated_timeline
        }

analysis_service = AnalysisService()
