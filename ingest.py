import pandas as pd
import json
import os
from neo4j import GraphDatabase

NEO4J_URI = "bolt://localhost:7687"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "designiq123"

CONFIG_PATH = "backend/config/industry_config.json"

def ingest_data():
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    
    with open(CONFIG_PATH, "r") as f:
        config = json.load(f)

    data_files = [
        "data/ship.csv",
        "data/automobile.csv",
        "data/aerospace.csv",
        "data/oil_gas.csv"
    ]

    with driver.session() as session:
        # Clear existing data
        session.run("MATCH (n) DETACH DELETE n")
        print("Cleared existing graph data.")

        for file in data_files:
            if not os.path.exists(file):
                print(f"File {file} not found. Skipping.")
                continue
                
            df = pd.read_csv(file)
            print(f"Ingesting {file} ({len(df)} rows)")
            
            for _, row in df.iterrows():
                product = row['product']
                industry = row['industry']
                system = row['system']
                assembly = row['assembly']
                part = row['part']
                supplier = row['supplier']
                
                generic_system = config.get(industry, {}).get(system, "Unknown System")

                query = """
                MERGE (p:Product {name: $product, industry: $industry})
                MERGE (s:System {name: $system})
                ON CREATE SET s.generic = $generic_system
                MERGE (a:Assembly {name: $assembly})
                MERGE (pt:Part {name: $part})
                MERGE (sup:Supplier {name: $supplier})
                
                MERGE (p)-[:HAS_SYSTEM]->(s)
                MERGE (s)-[:HAS_ASSEMBLY]->(a)
                MERGE (a)-[:HAS_PART]->(pt)
                MERGE (pt)-[:SUPPLIED_BY]->(sup)
                """
                
                session.run(query, {
                    "product": product,
                    "industry": industry,
                    "system": system,
                    "generic_system": generic_system,
                    "assembly": assembly,
                    "part": part,
                    "supplier": supplier
                })
                
    driver.close()
    print("Data ingestion complete.")

if __name__ == "__main__":
    ingest_data()
