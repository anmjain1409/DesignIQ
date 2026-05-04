import React, { useState } from 'react';
import {
  Plus, ExternalLink, X, CheckCircle, Clock, AlertTriangle,
  GitBranch, Filter, ChevronDown, Activity, Settings, Calendar, DollarSign, Users
} from 'lucide-react';
import { analyzeChangeRequest, submitChangeRequest, fetchUserGraph } from '../services/api';
import { FullCadGraphViz } from './AnalysisVisuals';
import CadFilePreview from './CadFilePreview';

const TABS = ['All', 'Draft', 'Pending', 'Approved', 'Rejected', 'In Progress', 'Completed'];
const DISCIPLINES = ['Propulsion', 'Structural', 'Electrical', 'Navigation', 'HVAC', 'Hydraulics'];
const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];

const priorityColors = {
  Critical: { bg: 'rgba(255,77,77,0.12)', color: '#ff4d4d' },
  High:     { bg: 'rgba(255,77,77,0.12)',  color: '#ff4d4d' }, // Red
  Medium:   { bg: 'rgba(0,255,204,0.12)',  color: '#00ffcc' }, // Green
  Low:      { bg: 'rgba(255,204,0,0.12)',  color: '#ffcc00' }, // Yellow
};

const statusColors = {
  Draft:       { bg: 'rgba(132,141,151,0.12)', color: '#848d97' },
  Pending:     { bg: 'rgba(255,204,0,0.12)',   color: '#ffcc00' },
  Approved:    { bg: 'rgba(0,255,204,0.12)',   color: '#00ffcc' },
  Rejected:    { bg: 'rgba(255,77,77,0.12)',   color: '#ff4d4d' },
  'In Progress': { bg: 'rgba(0,245,255,0.12)', color: '#00f5ff' },
  Completed:   { bg: 'rgba(80,200,120,0.12)',  color: '#50c878' },
};

function CRBadge({ label, type = 'status' }) {
  const map = type === 'priority' ? priorityColors : statusColors;
  const style = map[label] || { bg: 'rgba(132,141,151,0.12)', color: '#848d97' };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '3px 10px',
      borderRadius: 20,
      fontSize: 11,
      fontWeight: 700,
      letterSpacing: '0.03em',
      display: 'inline-block',
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
}

function FormField({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{label}</label>
      {children}
    </div>
  );
}

function StyledInput({ ...props }) {
  return (
    <input
      {...props}
      style={{
        background: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        color: 'var(--text-main)',
        padding: '10px 14px',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        transition: 'border-color 0.2s',
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
    />
  );
}

function StyledSelect({ value, onChange, options, placeholder }) {
  return (
    <div style={{ position: 'relative' }}>
      <select
        value={value}
        onChange={onChange}
        style={{
          background: 'var(--bg-main)',
          border: '1px solid var(--border-color)',
          borderRadius: 8,
          color: 'var(--text-main)',
          padding: '10px 32px 10px 14px',
          fontSize: 13,
          outline: 'none',
          width: '100%',
          fontFamily: 'inherit',
          appearance: 'none',
          cursor: 'pointer',
        }}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
      <ChevronDown size={14} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-muted)' }} />
    </div>
  );
}

function StyledTextArea({ ...props }) {
  return (
    <textarea
      {...props}
      style={{
        background: 'var(--bg-main)',
        border: '1px solid var(--border-color)',
        borderRadius: 8,
        color: 'var(--text-main)',
        padding: '10px 14px',
        fontSize: 13,
        outline: 'none',
        width: '100%',
        fontFamily: 'inherit',
        resize: 'vertical',
        minHeight: 80,
        ...props.style,
      }}
      onFocus={e => e.target.style.borderColor = 'var(--accent-color)'}
      onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
    />
  );
}

export default function ChangeRequests({ changeRequests = [], onRefresh }) {
  const [tab, setTab] = useState(0);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);
  const [userGraph, setUserGraph] = useState(null);
  const [form, setForm] = useState({
    title: '', desc: '', discipline: 'Propulsion', priority: 'High', component: 'N/A', assignedTo: ''
  });

  const filtered = changeRequests.filter(cr =>
    tab === 0 || (cr.status || '').toLowerCase() === TABS[tab].toLowerCase()
  );

  const handleAnalyze = async () => {
    if (!form.title.trim()) return;
    setAnalyzing(true);
    try {
      const payload = { ...form, description: form.desc, component: form.title };
      const result = await analyzeChangeRequest(payload);
      setAnalysisResult(result);
      // Also fetch the full BOM graph for visualization
      fetchUserGraph().then(setUserGraph).catch(() => {});
      setStep(2);
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      await submitChangeRequest({
        ...form,
        description: form.desc,
        analysis_results: {
          ...analysisResult,
          assigned_engineer: form.assignedTo
        }
      });
      setSuccessMsg('Change request submitted successfully!');
      setStep(3);
      setTimeout(() => {
        setSuccessMsg('');
        setOpen(false);
        setStep(1);
        setForm({ title: '', desc: '', discipline: 'Propulsion', priority: 'High', component: 'N/A', assignedTo: '' });
        setAnalysisResult(null);
        setUserGraph(null);
        onRefresh && onRefresh();
      }, 1500);
    } catch (err) {
      console.error('CR creation failed:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetModal = () => {
    setOpen(false);
    setStep(1);
    setAnalysisResult(null);
    setUserGraph(null);
    setForm({ title: '', desc: '', discipline: 'Propulsion', priority: 'High', component: 'N/A', assignedTo: '' });
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.01em', marginBottom: 4 }}>Change Requests</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Engineering change request lifecycle management</p>
        </div>
        <button
          onClick={() => { setStep(1); setOpen(true); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'var(--accent-color)', color: 'var(--bg-main)',
            border: 'none', borderRadius: 10, padding: '10px 18px',
            fontWeight: 700, fontSize: 13, cursor: 'pointer',
            transition: 'all 0.2s', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
          onMouseLeave={e => e.currentTarget.style.filter = 'none'}
        >
          <Plus size={16} /> New CR
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-color)', marginBottom: 20, overflowX: 'auto' }}>
        {TABS.map((t, i) => {
          const count = i === 0
            ? changeRequests.length
            : changeRequests.filter(cr => (cr.status || '').toLowerCase() === t.toLowerCase()).length;
          return (
            <button
              key={t}
              onClick={() => setTab(i)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', whiteSpace: 'nowrap', fontSize: 13,
                fontFamily: 'inherit', fontWeight: tab === i ? 700 : 400,
                color: tab === i ? 'var(--accent-color)' : 'var(--text-muted)',
                borderBottom: tab === i ? '2px solid var(--accent-color)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {t}
              {count > 0 && (
                <span style={{
                  background: tab === i ? 'rgba(0,245,255,0.15)' : 'rgba(132,141,151,0.15)',
                  color: tab === i ? 'var(--accent-color)' : 'var(--text-muted)',
                  borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700,
                }}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 12, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <GitBranch size={32} style={{ opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
              {tab === 0 ? 'No change requests yet. Create one to get started.' : `No ${TABS[tab]} requests.`}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)' }}>
                {['ID', 'Title', 'Component', 'Priority', 'Status', 'Created', ''].map((h, i) => (
                  <th key={i} style={{
                    padding: '12px 16px', textAlign: 'left',
                    fontSize: 10, color: 'var(--text-muted)',
                    fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cr, i) => (
                <tr
                  key={cr.id || i}
                  style={{
                    borderBottom: i < filtered.length - 1 ? '1px solid var(--border-color)' : 'none',
                    cursor: 'pointer', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12, fontFamily: 'monospace' }}>
                    #{String(cr.id || '').slice(0, 10)}
                  </td>
                  <td style={{ padding: '14px 16px', maxWidth: 220 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {cr.title || 'Untitled Request'}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {cr.component || '—'}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <CRBadge label={cr.priority || 'Medium'} type="priority" />
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <CRBadge label={cr.status || 'Pending'} type="status" />
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    {cr.time ? new Date(Number(cr.time)).toLocaleDateString() : 'Recently'}
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                    <ExternalLink size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* New CR Modal */}
      {open && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', zIndex: 1000, padding: 20,
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 16, width: '100%', maxWidth: step === 2 ? 780 : 560,
            maxHeight: '90vh', overflowY: 'auto', padding: 36,
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)', position: 'relative',
            transition: 'max-width 0.3s ease',
          }}>
            <button
              onClick={resetModal}
              style={{ position: 'absolute', top: 20, right: 20, background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              <X size={20} />
            </button>

            <h2 style={{ fontWeight: 700, fontSize: '1.25rem', marginBottom: 4 }}>
              {step === 1 ? 'New Change Request' : step === 2 ? 'Impact Analysis Results' : 'Success'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 24 }}>
              {step === 1 ? 'Submit an engineering change for review' : step === 2 ? 'Review the computed impact before final submission' : 'Your request has been saved'}
            </p>

            {step === 3 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
                <CheckCircle size={48} color="var(--success)" />
                <p style={{ fontWeight: 600, color: 'var(--success)' }}>{successMsg}</p>
              </div>
            )}

            {step === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <FormField label="Title">
                  <StyledInput
                    placeholder="e.g., Propulsion Shaft Diameter Increase"
                    value={form.title}
                    onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  />
                </FormField>

                <FormField label="Description">
                  <StyledTextArea
                    placeholder="Describe the change and its rationale..."
                    value={form.desc}
                    onChange={e => setForm(f => ({ ...f, desc: e.target.value }))}
                  />
                </FormField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <FormField label="Discipline">
                    <StyledSelect
                      value={form.discipline}
                      onChange={e => setForm(f => ({ ...f, discipline: e.target.value }))}
                      options={DISCIPLINES}
                    />
                  </FormField>
                  <FormField label="Priority">
                    <StyledSelect
                      value={form.priority}
                      onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                      options={PRIORITIES}
                    />
                  </FormField>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                  <button
                    onClick={resetModal}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      background: 'transparent', border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={analyzing || !form.title.trim()}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 10,
                      background: 'var(--accent-color)', border: 'none',
                      color: 'var(--bg-main)', fontSize: 13, fontWeight: 700,
                      cursor: analyzing ? 'not-allowed' : 'pointer',
                      opacity: (!form.title.trim() || analyzing) ? 0.6 : 1,
                      fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                  >
                    {analyzing ? 'Analyzing Impact...' : 'Analyze Change Impact'}
                  </button>
                </div>
              </div>
            )}

            {step === 2 && analysisResult && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                {/* Visualizations row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 14 }}>
                  <FullCadGraphViz graphData={userGraph} />
                  <div style={{ height: '350px' }}>
                    <CadFilePreview 
                      assetName={form.title} 
                      impactData={{
                        ...analysisResult,
                        target_component: form.title
                      }}
                      graphData={userGraph}
                      industry={analysisResult?.cad_graph?.industry || "Ship"}
                    />
                  </div>
                </div>

                {/* Analytics Insight Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                  {/* Radar Chart */}
                  <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 800, letterSpacing: '0.1em', marginBottom: 16, width: '100%', textAlign: 'center' }}>IMPACT MAGNITUDE (RADAR)</div>
                    <svg width="100" height="100" viewBox="0 0 100 100">
                      <text x="50" y="5" textAnchor="middle" fill="#94a3b8" fontSize="6">RISK</text>
                      <text x="95" y="75" textAnchor="middle" fill="#94a3b8" fontSize="6">COST</text>
                      <text x="5" y="75" textAnchor="middle" fill="#94a3b8" fontSize="6">TIME</text>
                      <polygon points="50,15 90,75 10,75" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      <polygon points="50,30 75,65 25,65" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
                      {(() => {
                        const r = analysisResult.risk_level === 'High' ? 0.9 : analysisResult.risk_level === 'Medium' ? 0.6 : 0.3;
                        
                        const costStr = analysisResult.estimated_cost || '0';
                        const costNum = parseInt(costStr.replace(/\D/g, '')) || 5000;
                        const c = Math.min(0.9, Math.max(0.2, costNum / 15000));
                        
                        const timeStr = analysisResult.timeline || '0';
                        const timeNum = parseFloat(timeStr) || 1;
                        const t = Math.min(0.9, Math.max(0.2, timeNum / 4));

                        const p1 = [50, 50 - r * 45];
                        const p2 = [50 + c * 40, 50 + c * 25];
                        const p3 = [50 - t * 40, 50 + t * 25];
                        return <polygon points={`${p1[0]},${p1[1]} ${p2[0]},${p2[1]} ${p3[0]},${p3[1]}`} fill="rgba(0, 245, 255, 0.2)" stroke="var(--accent-color)" strokeWidth="1.5" />;
                      })()}
                    </svg>
                    <p style={{ fontSize: 8, color: 'var(--text-muted)', marginTop: 16, textAlign: 'center', lineHeight: 1.5 }}>
                      Magnitude shown with respect to normalized<br/>graph traversal depth & dependency density.
                    </p>
                  </div>

                  {/* RISK CARD */}
                  <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Activity size={16} color="#3b82f6" style={{ marginTop: 2 }} />
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.05em', display: 'flex', flexDirection: 'column' }}>
                          <span>RISK</span>
                          <span>ASSESSMENT</span>
                        </span>
                      </div>
                      <div style={{ background: (analysisResult.risk_level || 'Low') === 'High' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', color: (analysisResult.risk_level || 'Low') === 'High' ? '#ef4444' : '#f59e0b', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 800 }}>
                        {analysisResult.risk_level || 'Low'}
                      </div>
                    </div>
                    <div style={{ marginTop: 'auto' }}>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>Impact Basis:</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                        {analysisResult.impacted_components?.length > 0 
                          ? `Cascading change. ${analysisResult.impacted_components.length} downstream dependencies detected.` 
                          : `Isolated change. Only 0 minor dependencies detected.`}
                      </div>
                    </div>
                  </div>

                  {/* COST CARD */}
                  {(() => {
                    const costStr = analysisResult.estimated_cost || '₹5,000';
                    const costNum = parseInt(costStr.replace(/\D/g, '')) || 5000;
                    const baseCost = 5000;
                    const delta = costNum - baseCost;
                    const pct = Math.round((delta / baseCost) * 100);
                    const color = '#10b981';
                    
                    return (
                      <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
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
                    const timeStr = analysisResult.timeline || '1 weeks';
                    const timeNum = parseFloat(timeStr) || 1;
                    const baseTime = 1;
                    const delta = timeNum - baseTime;
                    
                    return (
                      <div style={{ background: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
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

                {/* Assign engineer */}
                <div style={{ background: 'var(--bg-main)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Users size={18} color="#3b82f6" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', marginBottom: 6 }}>Assign Responsible Engineer</div>
                    <input
                      type="text"
                      placeholder="Enter engineer name"
                      value={form.assignedTo}
                      onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}
                      style={{
                        background: 'transparent', border: 'none', borderBottom: '1px solid var(--accent-color)',
                        color: 'var(--text-main)', fontSize: '1rem', fontWeight: 600, outline: 'none', padding: '4px 0', width: '100%'
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{
                      flex: 1, padding: '12px', borderRadius: 10,
                      background: 'transparent', border: '1px solid var(--border-color)',
                      color: 'var(--text-muted)', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFinalSubmit}
                    disabled={submitting || !form.assignedTo.trim()}
                    style={{
                      flex: 2, padding: '12px', borderRadius: 10,
                      background: 'var(--success)', border: 'none',
                      color: 'var(--bg-main)', fontSize: 13, fontWeight: 700,
                      cursor: (submitting || !form.assignedTo.trim()) ? 'not-allowed' : 'pointer',
                      opacity: (submitting || !form.assignedTo.trim()) ? 0.6 : 1,
                      fontFamily: 'inherit', transition: 'all 0.2s',
                    }}
                  >
                    {submitting ? 'Submitting...' : 'Submit Change Request'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
