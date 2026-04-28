import requests
import json

URL = "http://localhost:8001/cad-ingest"

test_data = [
    {
        "product": "Ship Alpha",
        "system": "Main Engine",
        "assembly": "Engine Block",
        "part": "Turbine Blade",
        "supplier": "Marine Parts Co",
        "industry": "Ship"
    },
    {
        "product": "Car Model S",
        "system": "Drive Train",
        "assembly": "Electric Motor",
        "part": "Motor Coil",
        "supplier": "AutoElec",
        "industry": "Automotive"
    },
    {
        "product": "Oil Rig Beta",
        "system": "Drilling Unit",
        "assembly": "Drill String",
        "part": "Drill Bit",
        "supplier": "RigSupply Inc",
        "industry": "Oil & Gas"
    }
]

for data in test_data:
    print(f"Testing ingestion for {data['industry']}...")
    try:
        response = requests.post(URL, json=data)
        response.raise_for_status()
        print("Success!")
        print(json.dumps(response.json(), indent=2))
    except requests.exceptions.RequestException as e:
        print(f"Failed: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(e.response.text)
    print("-" * 50)
