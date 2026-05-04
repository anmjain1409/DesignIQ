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
from backend.analysis_service import analysis_service

app = FastAPI(title="VarunaDarshi - Secure CAD Platform")

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
    name: Optional[str] = None
    role: Optional[str] = "Engineer"

class UserLogin(BaseModel):
    email: str
    password: str

class ImpactRequest(BaseModel):
    component_name: str
    node_type: str
    title: Optional[str] = None
    priority: Optional[str] = 'Medium'
    discipline: Optional[str] = 'General'

class AnalyzeChangeRequest(BaseModel):
    title: str
    description: str
    component: str
    discipline: str
    priority: str

class SubmitChangeRequestModel(BaseModel):
    title: str
    description: str
    component: str
    discipline: str
    priority: str
    analysis_results: dict

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
    neo4j_client.create_user(user.email, hashed_password, user.name, user.role)
    return {"message": "User created successfully"}

@app.post("/auth/login")
def login(user: UserLogin):
    db_user = neo4j_client.get_user(user.email)
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token(data={"sub": user.email})
    return {
        "access_token": token, 
        "token_type": "bearer",
        "user": {
            "email": db_user.get("email"),
            "name": db_user.get("name", user.email.split('@')[0]),
            "role": db_user.get("role", "Engineer")
        }
    }

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
    return neo4j_client.create_change_request(
        request.component_name, request.node_type, user_email,
        title=request.title, priority=request.priority, discipline=request.discipline
    )

@app.get("/change-requests")
def get_crs(user_email: str = Depends(get_current_user)):
    return neo4j_client.get_change_requests(user_email)

@app.get("/user-graph")
def get_user_graph(user_email: str = Depends(get_current_user)):
    return neo4j_client.get_full_user_graph(user_email)

@app.post("/analyze-change")
def analyze_change(request: AnalyzeChangeRequest, user_email: str = Depends(get_current_user)):
    return analysis_service.analyze_change(request.component, request.discipline, user_email)

@app.post("/submit-change")
def submit_change(request: SubmitChangeRequestModel, user_email: str = Depends(get_current_user)):
    cr_title = request.title or f'Design Change: {request.component}'
    query = """
    MATCH (u:User {email: $user_email})
    OPTIONAL MATCH (u)-[:OWNS]->(a:Asset)-[:HAS_SYSTEM|HAS_COMPONENT|CONNECTED_TO*0..]->(c:Component {name: $component_name})
    WITH DISTINCT u, c
    CREATE (cr:ChangeRequest {
        id: 'CR-' + toString(timestamp()),
        title: $cr_title,
        description: $description,
        status: 'Pending',
        priority: $priority,
        discipline: $discipline,
        component: $component_name,
        createdAt: timestamp(),
        user: $user_email,
        analysis_results: $analysis_results
    })
    FOREACH (_ IN CASE WHEN c IS NOT NULL THEN [1] ELSE [] END |
        MERGE (cr)-[:AFFECTS]->(c)
    )
    RETURN cr
    """
    result = neo4j_client._execute_query(query, {
        "user_email": user_email,
        "component_name": request.component,
        "cr_title": cr_title,
        "description": request.description,
        "priority": request.priority,
        "discipline": request.discipline,
        "analysis_results": json.dumps(request.analysis_results)
    })
    return {"message": "Change request submitted", "data": result}

@app.on_event("shutdown")
def shutdown_event():
    neo4j_client.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
