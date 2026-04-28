# DesignIQ

DesignIQ is a multi-industry BOM (Bill of Materials) intelligence and design impact analysis platform. It uses a universal engineering ontology to map industry-specific systems to generic types and visualizes the relationships using a Neo4j graph database.

## Prerequisites

1.  **Docker & Docker Compose** (for running Neo4j)
2.  **Python 3.9+** (for the backend API and data ingestion)
3.  **Node.js & npm** (for the frontend React application)

## Setup Instructions

### 1. Start the Neo4j Database

Open a terminal in the root of this project (`DesignIQ`) and run:
```bash
docker-compose up -d
```
*This will start a Neo4j instance on `localhost:7687` with the password `designiq123`.*
*Wait a few seconds for the database to fully initialize.*

### 2. Setup the Python Backend

Open a terminal in the root of the project:

```bash
# Create a virtual environment
python -m venv venv

# Activate the virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
# source venv/bin/activate

# Install dependencies
pip install -r backend/requirements.txt
```

### 3. Ingest Data into Neo4j

With the virtual environment activated and Neo4j running, ingest the sample CSV data:

```bash
python ingest.py
```
*You should see output indicating that the data for ship, automobile, aerospace, and oil_gas was ingested.*

### 4. Start the Backend API

Start the FastAPI server:

```bash
python -m uvicorn backend.main:app --reload --port 8001
```
*The API will be available at `http://localhost:8000`.*

### 5. Setup and Start the Frontend

Open a **new** terminal, navigate to the `frontend` folder, and run:

```bash
cd frontend
npm install
npm run dev
```
*The React app will typically be available at `http://localhost:5173`.*

## Features

-   **Multi-Industry Support**: Select between Shipbuilding, Automotive, Aerospace, and Oil & Gas.
-   **Universal Ontology Toggle**: Toggle the "Terminology" at the top right to see how industry-specific systems (like "Hull Structure") map to generic systems ("Structure System").
-   **Interactive BOM Graph**: Visualize the relationships from Product down to Supplier. 
-   **Impact Analysis**: Click on any **Part** node (colored amber) in the graph to instantly calculate upstream design impact, showing affected assemblies, systems, and products, along with a risk level.
