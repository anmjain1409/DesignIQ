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
    <div className="impact-content">
      <div className="impact-header">
        <div>
          <h2 className="impact-title">Impact Report</h2>
          <div className="impact-subtitle">Target: <strong>{impactData.target_component}</strong></div>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className={`risk-badge risk-${impactData.risk_level}`}>
            Risk Level: {impactData.risk_level}
          </div>
          <button 
            className={`primary-btn-mini ${created ? 'success' : ''}`} 
            onClick={handleInitiateCR}
            disabled={isCreating || created}
          >
            {isCreating ? 'Processing...' : created ? <><Check size={14} /> Created</> : <><PlusCircle size={14} /> Initiate CR</>}
          </button>
        </div>
      </div>

      {impactData.details && (
        <div className="impact-section">
          <h4>{impactData.node_type} Details</h4>
          <div className="mini-metadata-list">
            {impactData.node_type === 'Component' && (
              <>
                <div className="mini-meta-item">
                  <span>Assembly</span>
                  <strong>{impactData.details.assembly}</strong>
                </div>
                <div className="mini-meta-item">
                  <span>Supplier</span>
                  <strong>{impactData.details.supplier}</strong>
                </div>
                <div className="mini-meta-item">
                  <span>Version</span>
                  <strong>{impactData.details.version}</strong>
                </div>
              </>
            )}
            {impactData.node_type === 'System' && (
              <div className="mini-meta-item">
                <span>Generic Name</span>
                <strong>{impactData.details.generic}</strong>
              </div>
            )}
            {impactData.node_type === 'Asset' && (
              <div className="mini-meta-item">
                <span>Industry</span>
                <strong>{impactData.details.industry}</strong>
              </div>
            )}
            {impactData.node_type === 'Property' && (
              <div className="mini-meta-item">
                <span>Value</span>
                <strong>{impactData.details.value}</strong>
              </div>
            )}
            {Object.entries(impactData.details.properties || {}).map(([key, val]) => (
              <div key={key} className="mini-meta-item">
                <span>{key}</span>
                <strong>{val}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {impactData.affected_systems.length > 0 && (
        <div className="impact-section">
          <h4>Affected Systems</h4>
          <ul className="impact-list">
            {impactData.affected_systems.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {impactData.affected_assets.length > 0 && (
        <div className="impact-section">
          <h4>Affected Assets</h4>
          <ul className="impact-list">
            {impactData.affected_assets.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ImpactPanel;
