import React, { useState } from 'react';
import { Activity, PlusCircle, Check } from 'lucide-react';
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
    </div>
  );
};

export default ImpactPanel;
