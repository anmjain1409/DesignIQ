import React, { useState } from 'react';
import { X, Upload, CheckCircle2, Loader2, FileText, Box, GitMerge, ArrowRight } from 'lucide-react';
import { ingestCadData } from '../services/api';

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
  const [reportMode, setReportMode] = useState('combined'); // 2d, 3d, combined
  const [currentStep, setCurrentStep] = useState(0);
  const [status, setStatus] = useState('idle'); // idle, processing, success, error
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
      
      const delay = i === 2 || i === 3 ? 1500 : 800; // Longer for extraction and mapping
      await new Promise(res => setTimeout(res, delay));
      
      if (i === 4) { // Call API at Analysis phase
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
    if (!selectedFile) {
      alert("Please select a CAD file first.");
      return;
    }
    await simulateProgress(selectedFile);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content ingestion-modal">
        <button className="close-btn" onClick={onClose}>
          <X size={20} />
        </button>

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
                <button type="button" className={reportMode === '2d' ? 'active' : ''} onClick={() => setReportMode('2d')}>2D Only</button>
                <button type="button" className={reportMode === '3d' ? 'active' : ''} onClick={() => setReportMode('3d')}>3D Only</button>
                <button type="button" className={reportMode === 'combined' ? 'active' : ''} onClick={() => setReportMode('combined')}>Combined</button>
              </div>
            </div>

            <button type="submit" className="primary-btn submit-btn">
              Execute Full Flow
            </button>
          </form>
        )}

        {(status === 'processing' || status === 'error') && (
          <div className="pipeline-flow">
            <div className="pipeline-steps-container">
              {PIPELINE_STEPS.map((step, index) => {
                const isPast = index < currentStep;
                const isCurrent = index === currentStep;
                const isError = status === 'error' && isCurrent;

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

            {currentStep === 2 && (
              <div className="bifurcation-visual">
                <div className="pipeline-branch">
                  <FileText size={24} />
                  <span>2D Pipeline</span>
                </div>
                <div className="pipeline-divider"><ArrowRight size={20} /></div>
                <div className="pipeline-branch">
                  <Box size={24} />
                  <span>3D Pipeline</span>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="mapping-visual">
                <GitMerge size={32} className="pulse" />
                <span>Syncing Metadata...</span>
              </div>
            )}

            {status === 'error' && <div className="error-box">{errorMsg}</div>}
          </div>
        )}

        {status === 'success' && report && (
          <div className="success-state">
            <CheckCircle2 size={48} className="text-green mb-4" />
            <h3>{reportMode.toUpperCase()} Report Generated</h3>
            
            <div className="report-container">
              <div className="report-section">
                <h4>System Details</h4>
                <div className="report-grid">
                  <div className="grid-item">
                    <label>Industry</label>
                    <span>{report.industry}</span>
                  </div>
                  <div className="grid-item">
                    <label>Product</label>
                    <span>{report.extracted_data?.product}</span>
                  </div>
                  <div className="grid-item">
                    <label>Generic Mapping</label>
                    <span>{report.extracted_data?.generic_system}</span>
                  </div>
                  <div className="grid-item">
                    <label>Risk Level</label>
                    <span className={`risk-${report.impact_analysis.risk_level}`}>{report.impact_analysis.risk_level}</span>
                  </div>
                </div>
              </div>

              <div className="report-section mt-4">
                <h4>Extracted Metadata ({report.extracted_data?.type} Data)</h4>
                <div className="metadata-table">
                  {/* Common Fields */}
                  <div className="metadata-row">
                    <span className="meta-key">Assembly</span>
                    <span className="meta-val">{report.extracted_data?.assembly}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="meta-key">Component</span>
                    <span className="meta-val">{report.extracted_data?.part}</span>
                  </div>

                  {/* Filtered Dynamic Fields */}
                  {Object.entries(report.extracted_data?.raw_metadata || {})
                    .filter(([key]) => {
                      if (reportMode === 'combined') return true;
                      if (reportMode === '2d') return ['geometry', 'dimensions', 'annotations'].includes(key.toLowerCase());
                      if (reportMode === '3d') return ['components', 'assembly_structure', 'connections'].includes(key.toLowerCase());
                      return true;
                    })
                    .map(([key, val]) => (
                      <div key={key} className="metadata-row">
                        <span className="meta-key">{key.replace(/_/g, ' ')}</span>
                        <span className="meta-val">{val}</span>
                      </div>
                    ))}

                  {/* Show mismatch warning if applicable */}
                  {reportMode !== 'combined' && reportMode.toUpperCase() !== report.extracted_data?.type && (
                    <div className="metadata-row warning-row">
                      <span className="meta-key">Notice</span>
                      <span className="meta-val">No specific {reportMode.toUpperCase()} data in this {report.extracted_data?.type} file.</span>
                    </div>
                  )}

                  {/* Other Metadata */}
                  <div className="metadata-row">
                    <span className="meta-key">Supplier</span>
                    <span className="meta-val">{report.extracted_data?.supplier}</span>
                  </div>
                  <div className="metadata-row">
                    <span className="meta-key">Version</span>
                    <span className="meta-val">{report.extracted_data?.version}</span>
                  </div>
                </div>
              </div>
            </div>

            <button className="primary-btn mt-6 w-full" onClick={() => { onClose(); onComplete(); }}>
              Open Unified Graph
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CadIngestionModal;
