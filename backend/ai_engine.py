from backend.neo4j_client import neo4j_client

class AIEngine:
    def __init__(self):
        self.db = neo4j_client

    def perform_impact_analysis(self, component_name: str, node_type: str, user_email: str):
        """
        Given a node name and type, find all affected systems and assets,
        and also fetch the node's own properties.
        """
        affected_nodes = self.db.run_impact_analysis(component_name, node_type, user_email)
        node_details = self.db.get_node_properties(component_name, node_type, user_email)
        
        impact_report = {
            "target_component": component_name,
            "node_type": node_type,
            "details": node_details,
            "affected_systems": [],
            "affected_assets": [],
            "risk_level": "Low"
        }
        
        print(f"DEBUG: Impact Report for {component_name}: {impact_report}")
        
        for record in affected_nodes:
            node_type = record['type']
            name = record['name']
            
            if node_type == "System":
                impact_report["affected_systems"].append(name)
            elif node_type == "Asset":
                impact_report["affected_assets"].append(name)
                
        # Basic heuristic for risk
        impact_count = len(impact_report["affected_systems"]) + len(impact_report["affected_assets"])
        if impact_count > 5:
            impact_report["risk_level"] = "High"
        elif impact_count > 2:
            impact_report["risk_level"] = "Medium"
            
        return impact_report

ai_engine = AIEngine()
