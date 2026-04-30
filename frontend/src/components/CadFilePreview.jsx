import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { 
  OrbitControls, 
  Stage, 
  Text, 
  Float, 
  ContactShadows, 
  Edges, 
  Grid,
  Billboard
} from '@react-three/drei';
import { Box as BoxIcon, Layers, Loader2, AlertCircle } from 'lucide-react';

const RISK_COLORS = {
  High: '#ef4444',
  Medium: '#22c55e',
  Low: '#f59e0b',
  Default: '#64748b',
  Target: '#3b82f6',
};

function ComponentMesh({ name, position, isAffected, isTarget, riskLevel, group }) {
  const color = useMemo(() => {
    if (isTarget) return RISK_COLORS.Target;
    if (isAffected) return RISK_COLORS[riskLevel] || RISK_COLORS.Default;
    return RISK_COLORS.Default;
  }, [isAffected, isTarget, riskLevel]);

  const scale = isTarget ? 1.2 : 1;
  const isSystem = group === 'System' || group === 'Asset';

  return (
    <group position={position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
        <mesh scale={scale}>
          {isSystem ? (
            <boxGeometry args={[1.5, 0.4, 1.5]} />
          ) : (
            <boxGeometry args={[0.8, 0.6, 0.8]} />
          )}
          <meshStandardMaterial 
            color={color} 
            metalness={0.6} 
            roughness={0.2} 
            emissive={color}
            emissiveIntensity={isAffected || isTarget ? 0.5 : 0.1}
          />
          <Edges color={isAffected || isTarget ? '#ffffff' : color} />
        </mesh>
        
        <Billboard position={[0, 1.2, 0]}>
          <Text
            fontSize={0.18}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {name}
          </Text>
        </Billboard>
      </Float>
    </group>
  );
}

const CadFilePreview = ({ assetName = "Design Structure", impactData = null, graphData = null }) => {
  const { nodes, posMap, hasData } = useMemo(() => {
    // If graphData is missing or empty, we check if we should show a fallback or nothing
    const rawNodes = graphData?.nodes || [];
    const hasData = rawNodes.length > 0;
    
    // If no data from props, and no data in graphData, we use a minimal empty state
    if (!hasData) {
      return { nodes: [], posMap: {}, hasData: false };
    }
    
    const filteredNodes = rawNodes.filter(n => n.group === 'Component' || n.group === 'System' || n.group === 'Asset');
    const posMap = {};
    
    filteredNodes.forEach((n, i) => {
      let y = 0, radius = 0;
      if (n.group === 'Asset') { y = 3; radius = 0; }
      else if (n.group === 'System') { y = 1; radius = 3; }
      else { y = -1.5; radius = 5; }

      const angle = (i / filteredNodes.length) * Math.PI * 2;
      posMap[n.id || n.name] = [Math.cos(angle) * radius, y, Math.sin(angle) * radius];
    });

    return { nodes: filteredNodes, posMap, hasData: true };
  }, [graphData]);

  const affectedNames = useMemo(() => {
    if (!impactData) return [];
    return [
      ...(impactData.affected_systems || []), 
      ...(impactData.affected_assets || []),
      ...(impactData.impacted_components || [])
    ];
  }, [impactData]);

  const targetName = impactData?.target_component;

  return (
    <div className="cad-preview-container" style={{
      background: '#0a0b14',
      border: '1px solid #1e293b',
      borderRadius: 16,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 10 }}>
        <div style={{ fontSize: 9, fontWeight: 800, color: '#3b82f6', letterSpacing: '0.1em', marginBottom: 4 }}>
          {impactData ? `ANALYSIS ACTIVE: ${impactData.risk_level.toUpperCase()}` : '3D SYSTEM VIEW'}
        </div>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{assetName}</h3>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        {!hasData ? (
          <div style={{ 
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
            alignItems: 'center', justifyContent: 'center', gap: 12, color: '#475569' 
          }}>
            <AlertCircle size={40} opacity={0.5} />
            <span style={{ fontSize: 13, fontWeight: 600 }}>NO CAD DATA UPLOADED</span>
            <span style={{ fontSize: 11 }}>Please ingest a CAD file to view assembly</span>
          </div>
        ) : (
          <Canvas shadows camera={{ position: [10, 10, 10], fov: 35 }}>
            <color attach="background" args={['#0a0b14']} />
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} castShadow />
            
            <Suspense fallback={null}>
              <Stage intensity={0.5} environment="city" adjustCamera shadows={false}>
                <group>
                  {nodes.map((node) => (
                    <ComponentMesh 
                      key={node.id || node.name}
                      name={node.name}
                      position={posMap[node.id || node.name] || [0,0,0]}
                      isAffected={affectedNames.includes(node.name)}
                      isTarget={node.name === targetName}
                      riskLevel={impactData?.risk_level}
                      group={node.group}
                    />
                  ))}
                </group>
              </Stage>
              <Grid infiniteGrid fadeDistance={40} fadeStrength={5} sectionColor="#1e293b" cellColor="#0f172a" position={[0, -2, 0]} />
              <ContactShadows position={[0, -2, 0]} opacity={0.4} scale={30} blur={2.5} far={10} />
            </Suspense>
            <OrbitControls autoRotate={!impactData} autoRotateSpeed={0.4} />
          </Canvas>
        )}
      </div>

      {hasData && (
        <div style={{
          padding: '12px 20px',
          background: 'rgba(15, 23, 42, 0.9)',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 11,
          color: '#94a3b8'
        }}>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <BoxIcon size={12} /> {nodes.length} Items
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Layers size={12} /> {affectedNames.length} Impacted
            </div>
          </div>
          {impactData && (
            <div style={{ display: 'flex', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS.Target }}></div>
                <span style={{ color: '#cbd5e1' }}>Target</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: RISK_COLORS[impactData.risk_level] }}></div>
                <span style={{ color: '#cbd5e1' }}>Affected</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CadFilePreview;
