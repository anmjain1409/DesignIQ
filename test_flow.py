import requests
import io

BASE_URL = "http://localhost:8001" 

def test_full_flow():
    # 1. Login/Signup
    print("Logging in...")
    login_data = {"email": "test_v4@designiq.com", "password": "password123"}
    try:
        # Try signup first
        s_resp = requests.post(f"{BASE_URL}/auth/signup", json=login_data)
        print(f"Signup response: {s_resp.status_code} {s_resp.text}")
        
        resp = requests.post(f"{BASE_URL}/auth/login", json=login_data)
        resp.raise_for_status()
        token = resp.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print("Login successful.")
    except Exception as e:
        print(f"Login failed: {e}")
        return

    # 2. Ingest 3D File (STEP)
    print("\nIngesting STEP file...")
    file_3d = io.BytesIO(b"dummy step content")
    files = {'file': ('engine_block.step', file_3d, 'application/octet-stream')}
    resp = requests.post(f"{BASE_URL}/cad-ingest", headers=headers, files=files)
    if resp.status_code == 200:
        print("STEP Ingestion Success!")
        print(resp.json()["extracted_data"])
    else:
        print(f"STEP Ingestion Failed: {resp.text}")

    # 3. Ingest 2D File (DXF) - should trigger REPRESENTS mapping
    print("\nIngesting DXF file...")
    file_2d = io.BytesIO(b"dummy dxf content")
    files = {'file': ('turbine_blade.dxf', file_2d, 'application/octet-stream')}
    resp = requests.post(f"{BASE_URL}/cad-ingest", headers=headers, files=files)
    if resp.status_code == 200:
        print("DXF Ingestion Success!")
    else:
        print(f"DXF Ingestion Failed: {resp.text}")

    # 4. Run Impact Analysis
    print("\nRunning Impact Analysis on 'Turbine Blade'...")
    impact_resp = requests.post(
        f"{BASE_URL}/impact-analysis", 
        json={"component_name": "Turbine Blade"}
    )
    if impact_resp.status_code == 200:
        print("Impact Analysis Results:")
        print(impact_resp.json())
    else:
        print(f"Impact Analysis Failed: {impact_resp.text}")

if __name__ == "__main__":
    test_full_flow()
