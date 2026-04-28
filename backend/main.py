import os
import json
from fastapi import FastAPI, HTTPException, UploadFile, File, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from backend.neo4j_client import neo4j_client
from backend.ai_engine import ai_engine
from backend.pipeline import cad_pipeline
from backend.auth import get_password_hash, verify_password, create_access_token, decode_access_token

app = FastAPI(title="DesignIQ - Secure CAD Platform")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class UserSignup(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class ImpactRequest(BaseModel):
    component_name: str
    node_type: str

# Auth Dependency
async def get_current_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload["sub"]

# Routes
@app.post("/auth/signup")
def signup(user: UserSignup):
    existing_user = neo4j_client.get_user(user.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = get_password_hash(user.password)
    neo4j_client.create_user(user.email, hashed_password)
    return {"message": "User created successfully"}

@app.post("/auth/login")
def login(user: UserLogin):
    db_user = neo4j_client.get_user(user.email)
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}

@app.get("/systems")
def get_systems(industry: str, user_email: str = Depends(get_current_user)):
    data = neo4j_client.get_systems_by_industry(industry, user_email)
    return {"industry": industry, "systems": data}

@app.get("/graph")
def get_graph(asset: str, type: str = "Both", user_email: str = Depends(get_current_user)):
    graph_data = neo4j_client.get_graph_by_asset(asset, user_email, type)
    return graph_data

@app.post("/cad-ingest")
async def cad_ingest(file: UploadFile = File(...), user_email: str = Depends(get_current_user)):
    try:
        report = await cad_pipeline.run_full_flow(file, user_email)
        return report
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/impact-analysis")
def impact_analysis(request: ImpactRequest, user_email: str = Depends(get_current_user)):
    report = ai_engine.perform_impact_analysis(request.component_name, request.node_type, user_email)
    return report

@app.get("/dashboard-stats")
def get_dashboard_stats(user_email: str = Depends(get_current_user)):
    stats = neo4j_client.get_dashboard_stats(user_email)
    return stats

@app.get("/assets")
def get_assets(user_email: str = Depends(get_current_user)):
    assets = neo4j_client.get_assets(user_email)
    return assets

@app.post("/change-requests")
def create_cr(request: ImpactRequest, user_email: str = Depends(get_current_user)):
    return neo4j_client.create_change_request(request.component_name, request.node_type, user_email)

@app.get("/change-requests")
def get_crs(user_email: str = Depends(get_current_user)):
    return neo4j_client.get_change_requests(user_email)

@app.on_event("shutdown")
def shutdown_event():
    neo4j_client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
