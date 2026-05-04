from backend.neo4j_client import neo4j_client
from backend.analysis_service import analysis_service

class AIEngine:
    def __init__(self):
        self.db = neo4j_client
        self.analysis = analysis_service

    def perform_impact_analysis(self, component_name: str, node_type: str, user_email: str):
        """
        Delegates to analysis_service for comprehensive hierarchical impact tracing
        and property retrieval.
        """
        # discipline is mapped from node_type for the service call
        report = self.analysis.analyze_change(component_name, node_type, user_email)
        return report

ai_engine = AIEngine()
