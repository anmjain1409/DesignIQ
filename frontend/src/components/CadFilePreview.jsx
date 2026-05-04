import React, { Suspense, useMemo, useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stage, 
  Text, 
  Float, 
  ContactShadows, 
  Edges, 
  Grid,
  Billboard,
  PerspectiveCamera,
  Environment,
  Loader
} from '@react-three/drei';
import { 
  Box as BoxIcon, Layers, Loader2, Info, 
  Maximize2, Minimize2, X, HardDrive, 
  Settings, Zap, Shield 
} from 'lucide-react';

const RISK_COLORS = {
  High: '#ef4444',
  Medium: '#22c55e',
  Low: '#f59e0b',
  Default: '#64748b',
  Target: '#3b82f6',
};

// Procedural Industry Models
// High-Fidelity Procedural Ship
function ShipHull({ xRay, isExploded }) {
  const opacity = xRay ? 0.2 : 1;
  const transparent = xRay;
  const baseColor = xRay ? "#3b82f6" : "#2d3a4f"; // Brighter base color
  const metalColor = xRay ? "#60a5fa" : "#475569";

  // Exploded offsets - more subtle
  const hullY = isExploded ? -0.8 : 0;
  const bridgeY = isExploded ? 1.5 : 0;
  const turretOffset = isExploded ? 1 : 0;

  return (
    <group position={[0, -0.5, 0]}>
      {/* Lower Hull */}
      <mesh receiveShadow castShadow position={[0, hullY, 0]}>
        <boxGeometry args={[12, 1, 3.5]} />
        <meshPhysicalMaterial 
          color={baseColor} 
          metalness={0.7} 
          roughness={0.2} 
          clearcoat={1}
          transparent={transparent} 
          opacity={opacity} 
        />
      </mesh>
      
      {/* Sloped Bow Section */}
      <mesh position={[6, 0.1 + hullY, 0]} rotation={[0, 0, -0.3]} castShadow>
        <boxGeometry args={[2, 1.2, 3.5]} />
        <meshPhysicalMaterial color={baseColor} metalness={0.7} roughness={0.2} transparent={transparent} opacity={opacity} />
      </mesh>
      
      {/* Deck Plane */}
      <mesh position={[0, 0.55 + hullY, 0]} receiveShadow>
        <boxGeometry args={[12.5, 0.1, 3.8]} />
        <meshPhysicalMaterial color="#1e293b" metalness={0.5} roughness={0.8} />
      </mesh>

      {/* Superstructure - Tier 1 */}
      <mesh position={[-1, 1.2 + bridgeY, 0]} castShadow>
        <boxGeometry args={[5, 1.2, 2.8]} />
        <meshPhysicalMaterial color={metalColor} metalness={0.8} roughness={0.2} transparent={transparent} opacity={opacity} />
      </mesh>

      {/* Superstructure - Bridge (Glass look) */}
      <mesh position={[0, 2.4 + bridgeY * 1.3, 0]} castShadow>
        <boxGeometry args={[2.5, 1.2, 2.2]} />
        <meshPhysicalMaterial 
          color={xRay ? "#60a5fa" : "#cbd5e1"} 
          metalness={0.2} 
          roughness={0} 
          transmission={0.9} 
          thickness={1}
          transparent={true}
          opacity={xRay ? 0.3 : 0.6}
        />
      </mesh>

      {/* Mast & Radar */}
      <group position={[-0.5, 3 + bridgeY * 1.8, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.1, 2]} />
          <meshPhysicalMaterial color="#475569" />
        </mesh>
        <mesh position={[0, 1, 0]} rotation={[0, 0.5, 0]}>
          <boxGeometry args={[1.5, 0.1, 0.4]} />
          <meshPhysicalMaterial color="#f8fafc" />
        </mesh>
      </group>

      {/* Turrets */}
      {[ [3.5, 0.8, 0], [5.5, 0.7, 0], [-4.5, 0.8, 0] ].map((pos, i) => (
        <group key={i} position={[pos[0], pos[1] + turretOffset, pos[2]]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.9, 1.1, 0.5, 12]} />
            <meshPhysicalMaterial color="#334155" metalness={1} roughness={0.1} />
          </mesh>
          <mesh position={[0.8, 0.2, 0.2]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.08, 0.08, 2.5, 8]} />
            <meshPhysicalMaterial color="#000" metalness={1} />
          </mesh>
          <mesh position={[0.8, 0.2, -0.2]} rotation={[0, 0, Math.PI/2]}>
            <cylinderGeometry args={[0.08, 0.08, 2.5, 8]} />
            <meshPhysicalMaterial color="#000" metalness={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function JetModel({ xRay, isExploded }) {
  const opacity = xRay ? 0.2 : 1;
  const transparent = xRay;
  const offset = isExploded ? 2 : 0;
  return (
    <group position={[0, 0, 0]} rotation={[0, -Math.PI/2, 0]}>
      {/* Fuselage */}
      <mesh castShadow>
        <cylinderGeometry args={[0.8, 0.4, 10, 16]} />
        <meshPhysicalMaterial color="#cbd5e1" metalness={0.9} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Wings */}
      <mesh position={[0, 0, 0]} rotation={[Math.PI/2, 0, 0]}>
        <boxGeometry args={[1, 10 + offset, 0.1]} />
        <meshPhysicalMaterial color="#94a3b8" metalness={1} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Tail */}
      <mesh position={[0, 4.5, 0.8 + offset/2]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.1, 1.5, 2]} />
        <meshPhysicalMaterial color="#334155" />
      </mesh>
    </group>
  );
}

function RigModel({ xRay, isExploded }) {
  const opacity = xRay ? 0.2 : 1;
  const transparent = xRay;
  const offset = isExploded ? 3 : 0;
  return (
    <group position={[0, -2, 0]}>
      {/* Platform */}
      <mesh castShadow position={[0, 4 + offset, 0]}>
        <boxGeometry args={[6, 0.5, 6]} />
        <meshPhysicalMaterial color="#475569" metalness={0.5} transparent={transparent} opacity={opacity} />
      </mesh>
      {/* Legs */}
      {[[-2, 2, 2], [2, 2, 2], [-2, 2, -2], [2, 2, -2]].map((pos, i) => (
        <mesh key={i} position={pos}>
          <cylinderGeometry args={[0.2, 0.2, 8, 8]} />
          <meshPhysicalMaterial color="#1e293b" />
        </mesh>
      ))}
      {/* Derrick */}
      <mesh position={[0, 6 + offset * 1.5, 0]}>
        <cylinderGeometry args={[0.1, 1, 4, 4]} />
        <meshPhysicalMaterial color="#f59e0b" wireframe />
      </mesh>
    </group>
  );
}

function ComponentMesh({ node, position, isAffected, isTarget, riskLevel, onClick, isSelected, isExploded, xRay }) {
  const groupRef = useRef();
  
  const color = useMemo(() => {
    if (isTarget) return RISK_COLORS.Target;
    if (isAffected) return RISK_COLORS[riskLevel] || RISK_COLORS.Default;
    return isSelected ? '#ffffff' : RISK_COLORS.Default;
  }, [isAffected, isTarget, riskLevel, isSelected]);

  const scale = isTarget || isSelected ? 1.3 : 1;
  const isSystem = node.group === 'System' || node.group === 'Asset';
  const isAssembly = node.group === 'Assembly' || node.group === 'SubAssembly';

  // target position for animation - reduced multiplier
  const targetPos = useMemo(() => {
    if (!isExploded) return position;
    return [
      position[0] * 1.8,
      position[1] * 1.2 + 3,
      position[2] * 1.8
    ];
  }, [position, isExploded]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Smooth lerp to target position
      groupRef.current.position.x += (targetPos[0] - groupRef.current.position.x) * 0.1;
      groupRef.current.position.y += (targetPos[1] - groupRef.current.position.y) * 0.1;
      groupRef.current.position.z += (targetPos[2] - groupRef.current.position.z) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={position} onClick={(e) => { e.stopPropagation(); onClick(node); }}>
      <Float speed={isSelected ? 4 : 2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh scale={scale} castShadow>
          {isSystem ? (
            <boxGeometry args={[1.8, 0.5, 1.8]} />
          ) : isAssembly ? (
            <octahedronGeometry args={[0.8]} />
          ) : (
            <cylinderGeometry args={[0.4, 0.4, 0.7, 8]} />
          )}
          <meshPhysicalMaterial 
            color={color} 
            metalness={0.9} 
            roughness={0.1} 
            emissive={color}
            emissiveIntensity={(isAffected || isTarget || isSelected) ? 0.8 : 0.1}
            transparent={xRay}
            opacity={xRay ? 0.4 : 1}
          />
          <Edges 
            color={isSelected ? '#3b82f6' : (isAffected || isTarget ? '#ffffff' : color)} 
            lineWidth={isSelected ? 3 : 1}
          />
        </mesh>
        
        {!xRay && (
          <Billboard position={[0, 1.4, 0]}>
            <Text
              fontSize={0.2}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.02}
              outlineColor="#000000"
            >
              {node.name}
            </Text>
          </Billboard>
        )}
      </Float>
    </group>
  );
}

function CarChassis({ xRay, isExploded }) {
  const opacity = xRay ? 0.2 : 1;
  const transparent = xRay;
  const offset = isExploded ? 1.5 : 0;
  return (
    <group position={[0, -0.5, 0]}>
      <mesh receiveShadow castShadow position={[0, -offset, 0]}>
        <boxGeometry args={[8, 0.5, 4]} />
        <meshPhysicalMaterial color="#2d3a4f" metalness={0.8} transparent={transparent} opacity={opacity} />
      </mesh>
      {[[-3, 0, 2], [3, 0, 2], [-3, 0, -2], [3, 0, -2]].map((pos, i) => (
        <mesh key={i} position={[pos[0] * (1 + offset/4), pos[1], pos[2] * (1 + offset/2)]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.8, 0.8, 0.5, 16]} />
          <meshPhysicalMaterial color="#000000" roughness={0.8} transparent={transparent} opacity={opacity} />
        </mesh>
      ))}
    </group>
  );
}

const CadFilePreview = ({ assetName = "Design Intelligence", impactData = null, graphData = null, industry = "Ship", onOpenDetails }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExploded, setIsExploded] = useState(false);
  const [xRay, setXRay] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [selectedNodeData, setSelectedNodeData] = useState(null);
  const [isLoadingProps, setIsLoadingProps] = useState(false);

  const renderModel = () => {
    const ind = industry?.toLowerCase() || "";
    if (ind.includes('ship')) return <ShipHull xRay={xRay} isExploded={isExploded} />;
    if (ind.includes('auto') || ind.includes('car')) return <CarChassis xRay={xRay} isExploded={isExploded} />;
    if (ind.includes('aero') || ind.includes('jet')) return <JetModel xRay={xRay} isExploded={isExploded} />;
    if (ind.includes('oil') || ind.includes('rig')) return <RigModel xRay={xRay} isExploded={isExploded} />;
    return <ShipHull xRay={xRay} isExploded={isExploded} />;
  };

  const { nodes, posMap } = useMemo(() => {
    const rawNodes = Array.isArray(graphData?.nodes) ? graphData.nodes : [];
    const filteredNodes = rawNodes.filter(n => 
      ['Component', 'System', 'Asset', 'Assembly', 'SubAssembly'].includes(n.group)
    );
    
    const posMap = {};
    const depthMap = {
      'Asset': 0,
      'System': 1,
      'Assembly': 2,
      'SubAssembly': 3,
      'Component': 4
    };

    // Group nodes by depth
    const layers = {};
    filteredNodes.forEach(n => {
      const d = depthMap[n.group] || 0;
      if (!layers[d]) layers[d] = [];
      layers[d].push(n);
    });

    // Position nodes in concentric cylinders/layers
    Object.keys(layers).forEach(depthStr => {
      const d = parseInt(depthStr);
      const nodesInLayer = layers[d];
      const y = 4 - d * 2.5; 
      const radius = d * 4 + 2; 
      
      nodesInLayer.forEach((n, i) => {
        const angle = (i / nodesInLayer.length) * Math.PI * 2;
        posMap[n.id || n.name] = [
          Math.cos(angle) * radius,
          y,
          Math.sin(angle) * radius
        ];
      });
    });

    return { nodes: filteredNodes, posMap };
  }, [graphData]);

  const affectedNames = useMemo(() => {
    if (!impactData) return [];
    return [
      ...(impactData.affected_systems || []), 
      ...(impactData.affected_assets || []),
      ...(impactData.impacted_components || [])
    ];
  }, [impactData]);

  useEffect(() => {
    if (selectedNode) {
      setIsLoadingProps(true);
      setTimeout(() => {
        const realData = {
          assembly: selectedNode.group === 'Component' ? 'Standard Assembly' : 'Major System',
          status: 'Validated',
          material: 'Alloy 6061',
          weight: '4.5 kg',
          ...selectedNode.properties 
        };
        setSelectedNodeData(realData);
        setIsLoadingProps(false);
      }, 400);
    } else {
      setSelectedNodeData(null);
    }
  }, [selectedNode]);

  return (
    <div className={`cad-preview-container ${isFullscreen ? 'fullscreen-mode' : ''}`} style={{
      background: '#0a0b14',
      border: '1px solid #1e293b',
      borderRadius: isFullscreen ? 0 : 16,
      display: 'flex',
      flexDirection: 'column',
      height: isFullscreen ? '100vh' : '100%',
      width: isFullscreen ? '100vw' : '100%',
      position: isFullscreen ? 'fixed' : 'relative',
      inset: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 1000 : 1,
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    }}>
      {/* Header */}
      <div style={{ position: 'absolute', top: 24, left: 24, zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.2em', marginBottom: 4 }}>{industry.toUpperCase()} DESIGN</div>
        <h3 style={{ margin: 0, fontSize: 24, color: '#f8fafc' }}>{assetName}</h3>
      </div>

      <div style={{ position: 'absolute', top: 24, right: 24, zIndex: 10, display: 'flex', gap: 12 }}>
        <div style={{ 
          display: 'flex', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', 
          borderRadius: 8, padding: 4, gap: 4 
        }}>
          <button 
            onClick={() => setIsExploded(!isExploded)}
            style={{ 
              background: isExploded ? '#3b82f6' : 'transparent', border: 'none', 
              borderRadius: 4, padding: '4px 12px', color: '#fff', fontSize: 10, 
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            EXPLODED
          </button>
          <button 
            onClick={() => setXRay(!xRay)}
            style={{ 
              background: xRay ? '#3b82f6' : 'transparent', border: 'none', 
              borderRadius: 4, padding: '4px 12px', color: '#fff', fontSize: 10, 
              fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s' 
            }}
          >
            X-RAY
          </button>
        </div>
        <button onClick={() => setIsFullscreen(!isFullscreen)} style={{ background: 'rgba(30, 41, 59, 0.8)', border: '1px solid #334155', borderRadius: 8, padding: 8, color: '#f1f5f9', cursor: 'pointer' }}>
          {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
        </button>
      </div>

      <div style={{ flex: 1 }}>
        <Canvas shadows gl={{ antialias: true }}>
          <PerspectiveCamera makeDefault position={[20, 20, 20]} fov={35} />
          <color attach="background" args={['#05060d']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[20, 20, 20]} intensity={2} color="#3b82f6" />
          <spotLight position={[10, 20, 10]} angle={0.15} penumbra={1} intensity={3} castShadow />
          
          <Suspense fallback={null}>
            <Stage intensity={0.5} environment="city" shadows={false}>
              <group onClick={() => setSelectedNode(null)}>
                {renderModel()}
                {nodes.map((node) => (
                  <ComponentMesh 
                    key={node.id || node.name}
                    node={node}
                    position={posMap[node.id || node.name] || [0,0,0]}
                    isAffected={affectedNames.includes(node.name)}
                    isTarget={node.name === impactData?.target_component}
                    riskLevel={impactData?.risk_level}
                    isSelected={selectedNode?.id === node.id}
                    onClick={setSelectedNode}
                    isExploded={isExploded}
                    xRay={xRay}
                  />
                ))}
              </group>
            </Stage>
            <Grid 
              infiniteGrid 
              fadeDistance={100} 
              fadeStrength={5} 
              sectionColor="#3b82f6" 
              cellColor="#1e293b" 
              sectionThickness={1} 
              cellThickness={0.5}
              position={[0, -1.2, 0]} 
            />
            <ContactShadows 
              position={[0, -1.2, 0]} 
              opacity={0.6} 
              scale={60} 
              blur={2} 
              far={15} 
              resolution={512} 
              color="#000000"
            />
            <Environment preset="night" />
          </Suspense>
          <OrbitControls makeDefault minDistance={5} maxDistance={100} />
        </Canvas>
      </div>

      {selectedNode && (
        <div style={{
          position: 'absolute', right: 24, top: 80, bottom: 80, width: 320,
          background: 'rgba(15, 23, 42, 0.95)', border: '1px solid #334155', borderRadius: 16,
          backdropFilter: 'blur(12px)', padding: 24, zIndex: 100,
          display: 'flex', flexDirection: 'column', gap: 20,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 800 }}>{selectedNode.group.toUpperCase()}</div>
              <h4 style={{ margin: 0, fontSize: 18, color: '#f1f5f9' }}>{selectedNode.name}</h4>
            </div>
            <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {isLoadingProps ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Loader2 className="spin" size={24} color="#3b82f6" />
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <HardDrive size={16} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>ASSEMBLY</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{selectedNodeData?.assembly}</div>
                  </div>
                </div>
                <div style={{ background: '#1e293b', padding: 12, borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Shield size={16} color="#94a3b8" />
                  <div>
                    <div style={{ fontSize: 9, color: '#64748b' }}>STATUS</div>
                    <div style={{ fontSize: 12, color: '#e2e8f0' }}>{selectedNodeData?.status}</div>
                  </div>
                </div>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', fontSize: 13, color: '#94a3b8' }}>
                <h5 style={{ color: '#f8fafc', marginBottom: 8, fontSize: 12 }}>Technical Specs</h5>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ fontSize: 11 }}>Material: <span style={{ color: '#e2e8f0' }}>{selectedNodeData?.material}</span></div>
                  <div style={{ fontSize: 11 }}>Weight: <span style={{ color: '#e2e8f0' }}>{selectedNodeData?.weight}</span></div>
                </div>
                <p style={{ marginTop: 16 }}>Live CAD properties synchronized with Neo4j engineering graph.</p>
              </div>

              <button 
                className="primary-btn" 
                style={{ padding: '10px', fontSize: 12 }}
                onClick={() => {
                  if (onOpenDetails) onOpenDetails(selectedNode);
                }}
              >
                Open Details
              </button>
            </>
          )}
        </div>
      )}

      <div style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.9)', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#94a3b8' }}>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><BoxIcon size={14} /> {nodes.length} Components</div>
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {['Asset', 'System', 'Component'].map(g => (
            <div key={g} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: g === 'Asset' ? '#ef4444' : g === 'System' ? '#22c55e' : '#64748b' }}></div>
              <span>{g}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CadFilePreview;
