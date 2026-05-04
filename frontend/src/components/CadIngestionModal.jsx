import React, { useState } from 'react';
import { X, Upload, CheckCircle2, Loader2, FileText, Box, GitMerge, ArrowRight, ShieldCheck, Database, Layers, Settings, ChevronRight, Zap, Clock } from 'lucide-react';
import { ingestCadData } from '../services/api';
import CadFilePreview from './CadFilePreview';

const PIPELINE_STEPS = [
  { id: 'upload', label: 'File Upload', desc: 'STEP/DWG/DXF validation' },
  { id: 'route', label: 'Routing Engine', desc: 'Bifurcating 2D/3D logic' },
  { id: 'extract', label: 'Extraction Layer', desc: 'Running separate pipelines' },
  { id: 'mapping', label: 'Mapping Layer', desc: 'Syncing 2D <-> 3D nodes' },
  { id: 'analysis', label: 'Impact Analysis', desc: 'Traversing unified graph' },
  { id: 'report', label: 'Final Output', desc: 'Generating reports' }
];

const CadIngestionModal = ({ onClose, onComplete }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [reportMode, setReportMode] = useState('Both');
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('idle');
  const [report, setReport] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const simulateProgress = async (file) => {
    setStatus('processing');
    setCurrentStep(0);

    for (let i = 0; i < PIPELINE_STEPS.length; i++) {
      setCurrentStep(i);
      const delay = i === 2 || i === 3 ? 1500 : 800;
      await new Promise(res => setTimeout(res, delay));

      if (i === 4) {
        try {
          const res = await ingestCadData(file);
          setReport(res);
        } catch (err) {
          setStatus('error');
          setErrorMsg(err.response?.data?.detail || err.message);
          return;
        }
      }
    }
    setStatus('success');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please select a CAD file first.");
    await simulateProgress(selectedFile);
  };

  if (status === 'success' && report) {
    return (
      <div className="ingestion-report-fullscreen" style={{
        position: 'fixed', inset: 0, background: '#07080d', zIndex: 1000,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        color: '#f8fafc'
      }}>
        {/* Modern Header */}
        <header style={{
          padding: '20px 40px', background: 'rgba(15, 23, 42, 0.8)',
          borderBottom: '1px solid #1e293b', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ padding: 10, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
              <ShieldCheck size={24} color="#22c55e" />
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>Design Intelligence Report</h2>
              <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 2 }}>
                {reportMode} Output • {report.industry} Sector
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button className="primary-btn" onClick={() => { onClose(); onComplete(reportMode, report); }} style={{ padding: '10px 24px', fontSize: 13 }}>
              Finalize & Open Graph
            </button>
            <button className="icon-btn" onClick={onClose} style={{ background: '#1e293b' }}>
              <X size={20} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '380px 1fr', overflow: 'hidden' }}>
          {/* Side Panel: Metadata */}
          <aside style={{
            background: '#0a0b14', borderRight: '1px solid #1e293b',
            display: 'flex', flexDirection: 'column', overflow: 'hidden'
          }}>
            <div style={{ padding: '32px', flex: 1, overflowY: 'auto' }}>
              <section style={{ marginBottom: 40 }}>
                <h4 style={{ fontSize: 10, color: '#3b82f6', letterSpacing: '0.2em', fontWeight: 800, marginBottom: 20 }}>ASSEMBLY OVERVIEW</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ background: '#111827', padding: 16, borderRadius: 12, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>PRIMARY ASSET</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{report.extracted_data?.product}</div>
                  </div>
                  <div style={{ background: '#111827', padding: 16, borderRadius: 12, border: '1px solid #1e293b' }}>
                    <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>CORE SYSTEM</div>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>{report.extracted_data?.system || 'Main Propulsion'}</div>
                  </div>
                </div>
              </section>

              <section>
                <h4 style={{ fontSize: 10, color: '#3b82f6', letterSpacing: '0.2em', fontWeight: 800, marginBottom: 20 }}>EXTRACTED PROPERTIES</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {Object.entries(report.extracted_data?.raw_metadata || {}).map(([key, val]) => (
                    <div key={key} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0', borderBottom: '1px solid rgba(255,255,255,0.03)'
                    }}>
                      <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#e2e8f0' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div style={{ padding: 24, background: '#0f172a', borderTop: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ padding: 8, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6 }}>
                  <Layers size={16} color="#f59e0b" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b' }}>RISK ANALYSIS</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f59e0b' }}>Medium Impact Detected</div>
                </div>
              </div>
              <p style={{ fontSize: 11, color: '#64748b', margin: 0, lineHeight: 1.5 }}>
                Automated traversal indicates 3 downstream systems may be affected by changes to this asset.
              </p>
            </div>
          </aside>

          {/* Main Visual Workspace */}
          <main style={{ position: 'relative', background: '#000', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <CadFilePreview
                assetName={report.extracted_data?.product}
                impactData={report.impact_analysis}
                industry={report.extracted_data?.industry}
                graphData={(function () {
                  const nodes = [
                    { id: 'a1', name: report.extracted_data?.product, group: 'Asset' },
                    { id: 's1', name: report.extracted_data?.system || 'Main System', group: 'System' }
                  ];
                  const links = [{ source: 'a1', target: 's1' }];

                  const tree = report.extracted_data?.assembly_tree;
                  if (tree && tree.children) {
                    tree.children.forEach((child, i) => {
                      const assemblyId = `as${i}`;
                      nodes.push({ id: assemblyId, name: child.name, group: child.type });
                      links.push({ source: 's1', target: assemblyId });

                      if (child.children) {
                        child.children.forEach((sub, j) => {
                          if (typeof sub === 'string') {
                            const cid = `c${i}-${j}`;
                            nodes.push({ id: cid, name: sub, group: 'Component' });
                            links.push({ source: assemblyId, target: cid });
                          } else {
                            const subId = `sub${i}-${j}`;
                            nodes.push({ id: subId, name: sub.name, group: sub.type });
                            links.push({ source: assemblyId, target: subId });
                            if (sub.children) {
                              sub.children.forEach((leaf, k) => {
                                const lid = `leaf${i}-${j}-${k}`;
                                nodes.push({ id: lid, name: leaf, group: 'Component' });
                                links.push({ source: subId, target: lid });
                              });
                            }
                          }
                        });
                      }
                    });
                  }
                  return { nodes, links };
                })()}
              />
            </div>

            {/* Impact Analytics Row */}
            <div style={{
              height: 180, background: '#0a0b14', borderTop: '1px solid #1e293b',
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, padding: 24
            }}>
              <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <ShieldCheck size={14} color="#ef4444" />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>RISK INDEX</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: report.impact_analysis?.risk_level === 'High' ? '#ef4444' : '#f59e0b', marginBottom: 4 }}>
                  {report.impact_analysis?.risk_level}
                </div>
                <div style={{ width: '100%', height: 4, background: '#1e293b', borderRadius: 2, overflow: 'hidden', marginBottom: 8 }}>
                  <div style={{
                    width: report.impact_analysis?.risk_level === 'High' ? '85%' : '45%',
                    height: '100%', background: report.impact_analysis?.risk_level === 'High' ? '#ef4444' : '#f59e0b'
                  }} />
                </div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Respect to {report.impact_analysis?.impacted_components?.length || 0} downstream dependencies.</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={14} color="#00f5ff" />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>CHANGE COST</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                  {report.impact_analysis?.estimated_cost}
                </div>
                <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} style={{ flex: 1, height: 4, background: i <= (report.impact_analysis?.impacted_components?.length || 1) ? '#00f5ff' : '#1e293b', borderRadius: 1 }} />
                  ))}
                </div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Based on ₹5,000 per impacted node in the engineering graph.</div>
              </div>

              <div style={{ background: 'rgba(30, 41, 59, 0.4)', borderRadius: 12, padding: 16, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Clock size={14} color="#8b5cf6" />
                  <span style={{ fontSize: 9, fontWeight: 800, color: '#94a3b8', letterSpacing: '0.1em' }}>EST. TIMELINE</span>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#f8fafc', marginBottom: 4 }}>
                  {report.impact_analysis?.timeline}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ flex: 1, height: 4, background: '#1e293b', borderRadius: 2 }}>
                    <div style={{ width: '40%', height: '100%', background: '#8b5cf6', borderRadius: 2 }} />
                  </div>
                </div>
                <div style={{ fontSize: 9, color: '#64748b' }}>Calculated at 0.5 weeks per propagation depth level.</div>
              </div>
            </div>

            {/* Overlay Branding */}
            <div style={{
              position: 'absolute', top: 40, left: 40,
              pointerEvents: 'none', opacity: 0.5
            }}>
              <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: '0.3em', color: '#3b82f6' }}>VarunaDarshi v4.0</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content ingestion-modal">
        <button className="close-btn" onClick={onClose}><X size={20} /></button>
        <h2 className="modal-title">Advanced CAD Pipeline</h2>

        {status === 'idle' && (
          <form onSubmit={handleSubmit} className="ingestion-form">
            <div className="file-upload-zone" onClick={() => document.getElementById('cadFile').click()}>
              <Upload size={32} />
              <p>{selectedFile ? selectedFile.name : "Click to upload STEP, DWG, or DXF"}</p>
              <input type="file" id="cadFile" hidden onChange={handleFileChange} accept=".step,.stp,.dwg,.dxf" />
            </div>
            <div className="form-group">
              <label>Report Output Type</label>
              <div className="mode-selector">
                <button type="button" className={reportMode === '2D' ? 'active' : ''} onClick={() => setReportMode('2D')}>2D Only</button>
                <button type="button" className={reportMode === '3D' ? 'active' : ''} onClick={() => setReportMode('3D')}>3D Only</button>
                <button type="button" className={reportMode === 'Both' ? 'active' : ''} onClick={() => setReportMode('Both')}>Both</button>
              </div>
            </div>
            <button type="submit" className="primary-btn submit-btn">Execute Full Flow</button>
          </form>
        )}

        {(status === 'processing' || status === 'error') && (
          <div className="pipeline-flow">
            <div className="pipeline-steps-container">
              {PIPELINE_STEPS.map((step, index) => {
                const isPast = index < currentStep;
                const isCurrent = index === currentStep;
                return (
                  <div key={step.id} className={`pipeline-step-v2 ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}`}>
                    <div className="step-marker">
                      {isPast ? <CheckCircle2 size={16} /> : (isCurrent ? <Loader2 size={16} className="spin" /> : index + 1)}
                    </div>
                    <div className="step-info">
                      <h4>{step.label}</h4>
                      <p>{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {status === 'error' && <div className="error-box">{errorMsg}</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default CadIngestionModal;
