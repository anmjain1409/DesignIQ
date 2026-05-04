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

        # 3. Normalization & Recursive Ingestion
        normalized_data = self._normalize_to_generic_model(raw_data, type_label)
        
        # If we have an assembly tree, we ingest it recursively
        if normalized_data.get("assembly_tree"):
            neo4j_client.ingest_recursive_structure(
                normalized_data["assembly_tree"], 
                normalized_data["product"],
                normalized_data["industry"],
                normalized_data["system"],
                normalized_data["generic_system"],
                user_email,
                type_label
            )
        else:
            # Fallback for 2D or simple files
            components = raw_data.get("entities", {}).get("components", ["Main Component"])
            for component_name in components:
                comp_data = normalized_data.copy()
                comp_data['part'] = component_name
                neo4j_client.ingest_cad_data(comp_data, comp_data['industry'], user_email)
        
        # 4. Impact Analysis (on a representative component)
        main_component = "Hull Plate" if normalized_data['industry'] == "Ship" else "Main Component"
        impact_report = ai_engine.perform_impact_analysis(main_component, "Component", user_email)
        
        return {
            "status": "success",
            "file": filename,
            "pipeline": f"{type_label} Pipeline",
            "extracted_data": normalized_data,
            "impact_analysis": impact_report,
            "industry": normalized_data['industry']
        }

    async def _run_3d_pipeline(self, file: UploadFile):
        # STEP Parser (Simulated: FreeCAD / pythonOCC)
        filename = file.filename.lower()
        base_name = filename.split('.')[0].replace('_', ' ').replace('-', ' ').title()
        
        # Industry mapping based on keywords
        import random
        random.seed(filename) # Use filename as seed for deterministic but unique variety per file
        
        if any(kw in filename for kw in ["car", "auto", "vehicle"]):
            product, ind = f"{base_name} Model", "Automotive"
            assembly_tree = {
                "name": f"{base_name} Powertrain",
                "type": "Assembly",
                "properties": {"Material": "Cast Aluminum", "Weight": f"{random.randint(100, 300)}kg"},
                "children": [
                    {
                        "name": f"{base_name} Engine",
                        "type": "SubAssembly",
                        "properties": {"Displacement": f"{random.uniform(2.0, 5.0):.1f}L", "HP": random.randint(200, 600)},
                        "children": [
                            {"name": f"Piston Group {random.randint(1,9)}", "properties": {"Bore": "93mm", "Stroke": "73.5mm"}},
                            {"name": "Cylinder Head", "properties": {"Valves": random.choice([16, 24, 32])}}
                        ]
                    },
                    {
                        "name": "Transmission Unit",
                        "type": "SubAssembly",
                        "children": [
                            {"name": "Gearbox Case", "properties": {"Pressure": f"{random.randint(15, 25)}bar"}}
                        ]
                    }
                ]
            }
        elif any(kw in filename for kw in ["jet", "aero", "plane", "wing"]):
            product, ind = f"{base_name} Airframe", "Aerospace"
            assembly_tree = {
                "name": f"{base_name} Assembly",
                "type": "Assembly",
                "properties": {"Safety_Factor": "1.5", "Material": "Carbon Composite"},
                "children": [
                    {
                        "name": "Propulsion Module",
                        "type": "SubAssembly",
                        "properties": {"Thrust": f"{random.randint(20, 50)}k lbf"},
                        "children": [
                            {"name": "Turbofan Intake", "properties": {"Diameter": f"{random.uniform(1.5, 3.0):.1f}m"}},
                            {"name": "Combustion Chamber", "properties": {"Temp": "1800C"}}
                        ]
                    },
                    {
                        "name": "Avionics Core",
                        "type": "SubAssembly",
                        "children": [
                            {"name": "Flight Computer", "properties": {"CPU": "Radiation Hardened"}},
                            {"name": "Sensor Array", "properties": {"Accuracy": "0.01deg"}}
                        ]
                    }
                ]
            }
        elif any(kw in filename for kw in ["rig", "oil", "pipe", "pump"]):
            product, ind = f"{base_name} Rig", "Oil & Gas"
            assembly_tree = {
                "name": f"{base_name} Platform",
                "type": "Assembly",
                "properties": {"Max_Depth": f"{random.randint(1000, 5000)}m", "Material": "Corrosion Resistant Steel"},
                "children": [
                    {
                        "name": "Extraction Unit",
                        "type": "SubAssembly",
                        "children": [
                            {"name": "Drill Bit", "properties": {"Teeth": "PDC", "Size": "12.25in"}},
                            {"name": "Mud Pump", "properties": {"Flow": "500GPM"}}
                        ]
                    },
                    {
                        "name": "Safety Systems",
                        "type": "SubAssembly",
                        "children": [
                            {"name": "BOP Stack", "properties": {"Pressure": "15,000psi"}},
                            {"name": "Flare System", "properties": {"Height": "50m"}}
                        ]
                    }
                ]
            }
        else:
            product, ind = f"{base_name} Module", "Ship"
            assembly_tree = {
                "name": f"{base_name} Unit",
                "type": "Assembly",
                "properties": {"Class": "DNV-GL", "Material": "Marine Steel Grade A"},
                "children": [
                    {
                        "name": "Hull Section",
                        "type": "SubAssembly",
                        "properties": {"LOA": f"{random.randint(50, 300)}m"},
                        "children": [
                            {"name": f"Plate {random.randint(100, 999)}", "properties": {"Thickness": f"{random.randint(15, 40)}mm"}},
                            {"name": "Bulkhead", "properties": {"Fire_Rating": "A60"}}
                        ]
                    },
                    {
                        "name": "Propulsion",
                        "type": "SubAssembly",
                        "children": [
                            {"name": "Main Engine", "properties": {"Cylinders": random.choice([6, 8, 12])}},
                            {"name": "Shaft Line", "properties": {"Length": "15m"}}
                        ]
                    }
                ]
            }

        return {
            "entities": {
                "assembly_tree": assembly_tree,
                "connections": [f"{assembly_tree['children'][0]['name']}-{assembly_tree['children'][1]['name']} (Interface)"]
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
                "annotations": "Material: High Strength Alloy",
                "components": [f"{base_name} Frame", f"{base_name} Core", f"{base_name} Interface"]
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
            "assembly": meta.get("assembly", entities.get("assembly_tree", {}).get("name", "Main Assembly")),
            "part": meta.get("part", "Main Component"), # Will be overridden
            "supplier": "Simulated Supplier",
            "type": type_label,
            "industry": industry,
            "version": "1.0.3",
            "raw_metadata": {k: str(v) for k, v in entities.items()},
            "assembly_tree": entities.get("assembly_tree")
        }

cad_pipeline = CADPipeline()
