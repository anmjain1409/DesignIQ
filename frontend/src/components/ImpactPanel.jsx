import React, { useState } from 'react';
import { Activity, PlusCircle, Check, DollarSign, Calendar } from 'lucide-react';
import { createChangeRequest } from '../services/api';

const ImpactPanel = ({ impactData, isLoading }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);

  const handleInitiateCR = async () => {
    setIsCreating(true);
    try {
      await createChangeRequest(impactData.target_component, impactData.node_type);
      setCreated(true);
      setTimeout(() => setCreated(false), 3000);
    } catch (err) {
      console.error("Failed to create CR", err);
      alert("Error initiating change request");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="impact-content empty-state">
        <div className="spinner"></div>
        <p>Analyzing impact...</p>
      </div>
    );
  }

  if (!impactData) {
    return (
      <div className="impact-content empty-state">
        <Activity size={48} />
        <h3>Impact Analysis</h3>
        <p style={{marginTop: '8px', maxWidth: '200px'}}>
          Click on a <strong>Component</strong> (Amber node) in the graph to run a design impact analysis.
        </p>
      </div>
    );
  }

  return (
    <div className="impact-content" style={{ padding: '24px' }}>
      <div className="impact-header" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <h2 className="impact-title" style={{ fontSize: '1rem', color: 'var(--accent-color)', marginBottom: '4px' }}>TECHNICAL SPECIFICATIONS</h2>
            <div className="impact-subtitle" style={{ fontSize: '1.2rem', color: '#fff' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginRight: 8 }}>{impactData.node_type}:</span>
              <strong>{impactData.target_component}</strong>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div className={`risk-badge risk-${impactData.risk_level}`} style={{ fontSize: '0.7rem' }}>
              Risk Level: {impactData.risk_level}
            </div>
            <button 
              className={`primary-btn-mini ${created ? 'success' : ''}`} 
              onClick={handleInitiateCR}
              disabled={isCreating || created}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
            >
              {isCreating ? '...' : created ? 'Created' : 'Initiate CR'}
            </button>
          </div>
        </div>
      </div>

      <div className="impact-main-grid" style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '32px' }}>
        {/* Node Properties */}
        <div className="impact-section">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '12px', letterSpacing: '1px' }}>COMPONENT ATTRIBUTES</h4>
          <div className="mini-metadata-list" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {Object.entries(impactData.details || {})
              .filter(([k]) => !['name', 'group', 'createdAt', 'id', 'type', 'type3D', 'type2D'].includes(k))
              .length > 0 ? (
                Object.entries(impactData.details)
                  .filter(([k]) => !['name', 'group', 'createdAt', 'id', 'type', 'type3D', 'type2D'].includes(k))
                  .map(([key, val]) => (
                  <div key={key} className="mini-meta-item" style={{ background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '2px' }}>{key.replace(/_/g, ' ')}</div>
                    <div style={{ color: 'var(--accent-color)', fontWeight: '700', fontSize: '0.85rem' }}>{String(val)}</div>
                  </div>
                ))
              ) : (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', gridColumn: 'span 2' }}>
                  No additional engineering metadata found.
                </div>
              )
            }
          </div>
        </div>

        {/* Impacted Components */}
        <div className="impact-section">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '12px', letterSpacing: '1px' }}>IMPACTED COMPONENTS</h4>
          {impactData.impacted_components && impactData.impacted_components.length > 0 ? (
            <ul className="impact-list" style={{ listStyle: 'none', padding: 0 }}>
              {impactData.impacted_components.map((item, i) => (
                <li key={i} style={{ fontSize: '0.85rem', marginBottom: '6px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '4px', height: '4px', background: 'var(--danger)', borderRadius: '50%' }}></div>
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No direct impacts detected.</div>
          )}
        </div>

        {/* Affected Assets */}
        <div className="impact-section">
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginBottom: '12px', letterSpacing: '1px' }}>AFFECTED ASSETS</h4>
          {impactData.cad_graph?.asset ? (
            <ul className="impact-list" style={{ listStyle: 'none', padding: 0 }}>
              <li style={{ fontSize: '0.85rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '4px', height: '4px', background: 'var(--accent-color)', borderRadius: '50%' }}></div>
                {impactData.cad_graph.asset}
              </li>
            </ul>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No parent assets identified.</div>
          )}
        </div>
      </div>
      {/* Graph-Based Analytics Section */}
      <div style={{ marginTop: '32px', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Radar Chart Visual */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h4 style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '16px', width: '100%' }}>IMPACT MAGNITUDE (RADAR)</h4>
          <svg width="160" height="160" viewBox="0 0 100 100">
            {/* Axis Labels */}
            <text x="50" y="5" textAnchor="middle" fill="#94a3b8" fontSize="6">RISK</text>
            <text x="95" y="75" textAnchor="middle" fill="#94a3b8" fontSize="6">COST</text>
            <text x="5" y="75" textAnchor="middle" fill="#94a3b8" fontSize="6">TIME</text>
            
            {/* Background Polygons */}
            <polygon points="50,15 90,75 10,75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            <polygon points="50,30 75,65 25,65" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
            
            {/* Data Polygon */}
            {(() => {
              const r = impactData.risk_level === 'High' ? 0.9 : impactData.risk_level === 'Medium' ? 0.6 : 0.3;
              
              const costStr = impactData.estimated_cost || '0';
              const costNum = parseInt(costStr.replace(/\D/g, '')) || 5000;
              const c = Math.min(0.9, Math.max(0.2, costNum / 15000));
              
              const timeStr = impactData.timeline || '0';
              const timeNum = parseFloat(timeStr) || 1;
              const t = Math.min(0.9, Math.max(0.2, timeNum / 4));
              
              const p1 = [50, 50 - r * 45];
              const p2 = [50 + c * 40, 50 + c * 25];
              const p3 = [50 - t * 40, 50 + t * 25];
              
              return (
                <polygon 
                  points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`} 
                  fill="rgba(0, 245, 255, 0.2)" 
                  stroke="var(--accent-color)" 
                  strokeWidth="1.5" 
                />
              );
            })()}
            
            {/* Origin Lines */}
            <line x1="50" y1="50" x2="50" y2="5" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="95" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
            <line x1="50" y1="50" x2="5" y2="75" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
          </svg>
          <p style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginTop: '12px', textAlign: 'center' }}>
            Magnitude shown with respect to normalized <br/> graph traversal depth & dependency density.
          </p>
        </div>

        {/* Analytics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {/* RISK CARD */}
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <Activity size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', flexDirection: 'column' }}>
                  <span>RISK</span>
                  <span>ASSESSMENT</span>
                </span>
              </div>
              <div style={{ background: (impactData.risk_level || 'Low') === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: (impactData.risk_level || 'Low') === 'High' ? '#ef4444' : '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                {impactData.risk_level || 'Low'}
              </div>
            </div>
            <div style={{ marginTop: 'auto' }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Impact Basis:</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {impactData.impacted_components?.length > 0 
                  ? `Cascading change. ${impactData.impacted_components.length} downstream dependencies detected.` 
                  : `Isolated change. Only 0 minor dependencies detected.`}
              </div>
            </div>
          </div>

          {/* COST CARD */}
          {(() => {
            const costStr = impactData.estimated_cost || '₹5,000';
            const costNum = parseInt(costStr.replace(/\D/g, '')) || 5000;
            const baseCost = 5000;
            const delta = costNum - baseCost;
            const pct = Math.round((delta / baseCost) * 100);
            const color = '#10b981';
            
            return (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <DollarSign size={16} color="#10b981" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', flexDirection: 'column' }}>
                    <span>COST</span>
                    <span>IMPACT</span>
                  </span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
                  +{delta > 0 ? `₹${delta.toLocaleString()}` : '₹0'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}><span>Original</span><span>Base:</span></span>
                    <span style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>₹{baseCost.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: color, fontWeight: 600 }}>
                    <span style={{ display: 'flex', flexDirection: 'column' }}><span>Increase +</span><span>(+{pct}%):</span></span>
                    <span style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>+{delta > 0 ? `₹${delta.toLocaleString()}` : '₹0'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TIMELINE CARD */}
          {(() => {
            const timeStr = impactData.timeline || '1 weeks';
            const timeNum = parseFloat(timeStr) || 1;
            const baseTime = 1;
            const delta = timeNum - baseTime;
            
            return (
              <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <Calendar size={16} color="#f59e0b" style={{ marginTop: 2 }} />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', flexDirection: 'column' }}>
                    <span>PROJECT</span>
                    <span>TIMELINE</span>
                  </span>
                </div>
                <div style={{ fontSize: '26px', fontWeight: 800, color: '#fff', marginBottom: '16px' }}>
                  +{delta > 0 ? delta : 0} weeks
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: 'auto', fontSize: '11px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#3b82f6', display: 'flex', gap: 6 }}><span>•</span> <span style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column' }}><span>Initial</span><span>Modification</span></span></span>
                    <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>{baseTime} week</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#10b981', display: 'flex', gap: 6 }}><span>•</span> <span style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column' }}><span>Integration</span><span>Testing</span></span></span>
                    <span style={{ color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'flex-end', paddingBottom: 2 }}>{delta > 0 ? delta : 0} weeks</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      <div style={{ marginTop: '24px', padding: '16px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px dashed rgba(255,255,255,0.1)' }}>
        <h4 style={{ color: 'var(--text-muted)', fontSize: '0.65rem', textTransform: 'uppercase', marginBottom: '8px' }}>ASSIGN ENGINEER</h4>
        <div style={{ display: 'flex', gap: '8px', opacity: 0.5 }}>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.7rem' }}>AJ</div>
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#8b5cf6', display: 'flex', alignItems: 'center', justifyCenter: 'center', fontSize: '0.7rem' }}>JD</div>
          <div style={{ width: '24px', height: '24px', border: '1px dashed #64748b', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>+</div>
        </div>
      </div>
    </div>
  );
};

export default ImpactPanel;
