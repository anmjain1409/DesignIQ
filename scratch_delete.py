import sys
import os

# Add parent directory to path so we can import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.neo4j_client import neo4j_client

query = """
MATCH (cr:ChangeRequest)
WHERE cr.title <> 'Engine power by 10%'
DETACH DELETE cr
"""

neo4j_client._execute_query(query)
print("Deleted other Change Requests.")
