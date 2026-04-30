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

        # 3. Normalization Layer & Multi-Component Ingestion
        components = raw_data.get("entities", {}).get("components", ["Main Component"])
        
        for component_name in components:
            # Create a specific generic model for this component
            comp_data = self._normalize_to_generic_model(raw_data, type_label)
            comp_data['part'] = component_name # Override with current component
            neo4j_client.ingest_cad_data(comp_data, comp_data['industry'], user_email)
        
        # 4. Impact Analysis (on the first/main component)
        main_component = components[0]
        impact_report = ai_engine.perform_impact_analysis(main_component, "Component", user_email)
        
        return {
            "status": "success",
            "file": filename,
            "pipeline": f"{type_label} Pipeline",
            "extracted_data": comp_data, # Return the last processed component model as a sample
            "impact_analysis": impact_report,
            "industry": comp_data['industry']
        }

    async def _run_3d_pipeline(self, file: UploadFile):
        # STEP Parser (Simulated: FreeCAD / pythonOCC)
        filename = file.filename.lower()
        base_name = filename.split('.')[0].replace('_', ' ').replace('-', ' ').title()
        
        # Industry mapping based on keywords
        if any(kw in filename for kw in ["car", "auto", "vehicle"]):
            product, ind = f"{base_name} Model", "Automotive"
            components = ["Chassis Frame", "V8 Engine Block", "Transmission Case", "Brake Assembly"]
            assembly = "Vehicle Powertrain"
        elif any(kw in filename for kw in ["jet", "aero", "plane", "wing"]):
            product, ind = f"{base_name} Airframe", "Aerospace"
            components = ["Turbofan Intake", "Fuselage Section", "Landing Gear", "Wing Spar"]
            assembly = "Main Airframe Assembly"
        elif any(kw in filename for kw in ["rig", "oil", "pipe", "pump"]):
            product, ind = f"{base_name} Platform", "Oil & Gas"
            components = ["Drill Bit", "Pressure Valve", "Flow Meter", "Centrifugal Pump"]
            assembly = "Subsea Extraction Unit"
        else:
            product, ind = f"{base_name} Module", "Ship"
            components = ["Hull Plate", "Propeller Shaft", "Rudder Blade", "Main Deck Section"]
            assembly = "Marine Propulsion Unit"

        return {
            "entities": {
                "components": components,
                "assembly_structure": assembly,
                "connections": [f"{components[0]}-{components[1]} (Internal)", f"{components[1]}-{components[2]} (Linked)"]
            },
            "metadata": {
                "product": product,
                "system": "Primary System",
                "industry": ind
            }
        }

    async def _run_2d_pipeline(self, file: UploadFile):
        # DWG -> DXF Converter & DXF Parser (Simulated: ezdxf)
        filename = file.filename.lower()
        base_name = filename.split('.')[0].replace('_', ' ').replace('-', ' ').title()
        
        if any(kw in filename for kw in ["car", "auto", "vehicle"]):
            product, ind = f"{base_name} Blueprint", "Automotive"
        elif any(kw in filename for kw in ["jet", "aero", "plane", "wing"]):
            product, ind = f"{base_name} Schematic", "Aerospace"
        elif any(kw in filename for kw in ["rig", "oil", "pipe", "pump"]):
            product, ind = f"{base_name} Layout", "Oil & Gas"
        else:
            product, ind = f"{base_name} Design", "Ship"

        return {
            "entities": {
                "geometry": f"Polyline[{len(filename)*2}], Circle[{len(filename)}]",
                "dimensions": f"L={len(filename)*10}mm, W={len(filename)*5}mm",
                "annotations": "Material: High Strength Alloy"
            },
            "metadata": {
                "product": product,
                "system": "Primary System",
                "part": f"{base_name} Component",
                "assembly": f"{base_name} Assembly",
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
