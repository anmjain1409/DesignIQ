import os
import json
from fastapi import UploadFile
from backend.neo4j_client import neo4j_client
from backend.ai_engine import ai_engine

class CADPipeline:
    def __init__(self):
        self.industry_config = self._load_config()

    def _load_config(self):
        config_path = os.path.join(os.path.dirname(__file__), "config", "industry_config.json")
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception:
            return {}

    async def run_full_flow(self, file: UploadFile, user_email: str):
        # 1. Validation Layer
        filename = file.filename.lower()
        extension = filename.split('.')[-1]
        
        # 2. Routing Engine
        if extension in ['step', 'stp']:
            # 3D Pipeline
            raw_data = await self._run_3d_pipeline(file)
            type_label = "3D"
        elif extension in ['dwg', 'dxf']:
            # 2D Pipeline
            raw_data = await self._run_2d_pipeline(file)
            type_label = "2D"
        else:
            raise ValueError("Unsupported file format. Please upload STEP, DWG, or DXF.")

        # 3. Normalization Layer -> Convert to Generic Model
        generic_model = self._normalize_to_generic_model(raw_data, type_label)
        
        # 3. Neo4j Ingestion & Mapping Layer
        # Ingest into Neo4j - mapping logic is handled inside ingest_cad_data
        neo4j_client.ingest_cad_data(generic_model, generic_model['industry'], user_email)
        
        # 4. Impact Analysis
        impact_report = ai_engine.perform_impact_analysis(generic_model['part'], "Component")
        
        return {
            "status": "success",
            "file": filename,
            "pipeline": f"{type_label} Pipeline",
            "extracted_data": generic_model,
            "impact_analysis": impact_report,
            "industry": generic_model['industry']
        }

    async def _run_3d_pipeline(self, file: UploadFile):
        # STEP Parser (Simulated: FreeCAD / pythonOCC)
        # Extracting: Components, Assembly Structure, Connections
        filename = file.filename.lower()
        
        if "car" in filename or "auto" in filename:
            product, ind = "Car Alpha", "Automotive"
        elif "jet" in filename or "aero" in filename:
            product, ind = "Jet Alpha", "Aerospace"
        elif "rig" in filename or "oil" in filename:
            product, ind = "Rig Alpha", "Oil & Gas"
        else:
            product, ind = "Ship Alpha", "Ship"

        return {
            "entities": {
                "components": ["Turbine Housing", "Shaft", "Blade Set"],
                "assembly_structure": "Main Engine Block",
                "connections": ["Housing-Shaft (Mechanical)", "Shaft-Blade (Fixed)"]
            },
            "metadata": {
                "product": product,
                "system": "Main Propulsion",
                "industry": ind
            }
        }

    async def _run_2d_pipeline(self, file: UploadFile):
        # DWG -> DXF Converter & DXF Parser (Simulated: ezdxf)
        # Extracting: Geometry, Dimensions, Text/Annotations
        filename = file.filename.lower()
        
        # Industry mapping based on filename or dummy
        if "car" in filename or "auto" in filename:
            product, ind = "Car Alpha", "Automotive"
        elif "jet" in filename or "aero" in filename:
            product, ind = "Jet Alpha", "Aerospace"
        elif "rig" in filename or "oil" in filename:
            product, ind = "Rig Alpha", "Oil & Gas"
        else:
            product, ind = "Ship Alpha", "Ship"

        return {
            "entities": {
                "geometry": "Polyline[42], Circle[12]",
                "dimensions": "L=450mm, W=200mm",
                "annotations": "Material: Grade A Steel"
            },
            "metadata": {
                "product": product,
                "system": "Main Propulsion",
                "part": "Turbine Blade",
                "assembly": "Engine Block",
                "industry": ind
            }
        }

    def _normalize_to_generic_model(self, raw_data, type_label):
        # Generic Model: Component Entities, Connection Entities, Property Entities
        meta = raw_data.get("metadata", {})
        entities = raw_data.get("entities", {})
        industry = meta.get("industry", "Unknown")
        
        system = meta.get("system", "Unknown System")
        generic_system = self.industry_config.get(industry, {}).get(system, "Standard Component")

        return {
            "product": meta.get("product", "Default Product"),
            "system": system,
            "generic_system": generic_system,
            "assembly": meta.get("assembly", entities.get("assembly_structure", "Main Assembly")),
            "part": meta.get("part", entities.get("components", ["Unknown"])[0]),
            "supplier": "Simulated Supplier",
            "type": type_label,
            "industry": industry,
            "version": "1.0.3",
            "raw_metadata": {k: str(v) for k, v in entities.items()} # Ensure all values are strings
        }

cad_pipeline = CADPipeline()
