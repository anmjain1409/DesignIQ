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
        if any(kw in filename for kw in ["car", "auto", "vehicle"]):
            product, ind = f"{base_name} Model", "Automotive"
            assembly_tree = {
                "name": "Vehicle Powertrain",
                "type": "Assembly",
                "properties": {"Material": "Cast Aluminum", "Weight": "150kg", "Service_Interval": "12 months"},
                "children": [
                    {
                        "name": "Engine System",
                        "type": "SubAssembly",
                        "properties": {"Displacement": "4.0L", "HP": "450", "Fuel_Type": "Octane 95"},
                        "children": [
                            {"name": "V8 Engine Block", "properties": {"Bore": "93mm", "Stroke": "73.5mm", "Alloy": "AlSi7Mg"}},
                            {"name": "Cylinder Head", "properties": {"Valves": "32", "Inlet": "Titanium"}},
                            {"name": "Crankshaft", "properties": {"Forged": "Yes", "Material": "4340 Steel"}}
                        ]
                    },
                    {
                        "name": "Transmission System",
                        "type": "SubAssembly",
                        "properties": {"Gears": "7", "Type": "Dual Clutch"},
                        "children": [
                            {"name": "Gearbox Case", "properties": {"Pressure": "20bar", "Seal": "EPDM"}},
                            {"name": "Clutch Assembly", "properties": {"Torque": "600Nm", "Plates": "8"}}
                        ]
                    }
                ]
            }
        elif any(kw in filename for kw in ["jet", "aero", "plane", "wing"]):
            product, ind = f"{base_name} Airframe", "Aerospace"
            assembly_tree = {
                "name": "Main Airframe Assembly",
                "type": "Assembly",
                "properties": {"Safety_Factor": "1.5", "Max_Altitude": "40,000ft", "Material": "Carbon Composite"},
                "children": [
                    {
                        "name": "Propulsion Module",
                        "type": "SubAssembly",
                        "properties": {"Thrust": "35,000lbf", "Bypass_Ratio": "10:1"},
                        "children": [
                            {"name": "Turbofan Intake", "properties": {"Diameter": "2.8m", "Blades": "22"}},
                            {"name": "Combustion Chamber", "properties": {"Temp": "1800C", "Material": "Inconel"}}
                        ]
                    },
                    {
                        "name": "Wing Assembly",
                        "type": "SubAssembly",
                        "properties": {"Span": "35m", "Fuel_Capacity": "12,000L"},
                        "children": [
                            {"name": "Wing Spar", "properties": {"Load": "100kN", "Material": "7075-T6"}},
                            {"name": "Aileron", "properties": {"Degrees": "25", "Actuator": "Hydraulic"}}
                        ]
                    }
                ]
            }
        else:
            product, ind = f"{base_name} Module", "Ship"
            assembly_tree = {
                "name": "Marine Propulsion Unit",
                "type": "Assembly",
                "properties": {"Power": "12,000kW", "Class": "Lloyds Register", "Material": "Marine Steel"},
                "children": [
                    {
                        "name": "Hull Structure",
                        "type": "SubAssembly",
                        "properties": {"Length": "120m", "Beam": "22m", "Draft": "8.5m"},
                        "children": [
                            {"name": "Hull Plate", "properties": {"Thickness": "25mm", "Grade": "EH36", "Coating": "Epoxy"}},
                            {"name": "Keel Section", "properties": {"Weight": "45t", "Stress": "120MPa"}}
                        ]
                    },
                    {
                        "name": "Drive Train",
                        "type": "SubAssembly",
                        "properties": {"RPM": "105", "Shaft_Dia": "650mm"},
                        "children": [
                            {"name": "Propeller Shaft", "properties": {"Length": "12m", "Forged": "Yes"}},
                            {"name": "Rudder Blade", "properties": {"Area": "14.5m2", "Angle": "35deg"}}
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
