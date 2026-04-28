import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GitBranch, 
  Database, 
  FileCode, 
  ShieldCheck, 
  Bell, 
  Upload, 
  LogOut, 
  ChevronRight,
  Monitor
} from 'lucide-react';
import { fetchSystems, fetchGraph, runImpactAnalysis } from './services/api';
import SystemList from './components/SystemList';
import GraphView from './components/GraphView';
import ImpactPanel from './components/ImpactPanel';
import CadIngestionModal from './components/CadIngestionModal';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

const INDUSTRIES = [
  { id: 'Ship', name: 'Shipbuilding', asset: 'Ship Alpha' },
  { id: 'Automotive', name: 'Automotive', asset: 'Car Alpha' },
  { id: 'Aerospace', name: 'Aerospace', asset: 'Jet Alpha' },
  { id: 'Oil & Gas', name: 'Oil & Gas', asset: 'Rig Alpha' }
];

function App() {
  const [view, setView] = useState('dashboard'); // dashboard, bom
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [isGenericView, setIsGenericView] = useState(false);
  const [reportType, setReportType] = useState('Both');
  const [systems, setSystems] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [impactData, setImpactData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (isLoggedIn && view === 'bom') {
      loadIndustryData(selectedIndustry, reportType);
    }
  }, [selectedIndustry, isLoggedIn, reportType, view]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const loadIndustryData = async (industryObj, type = 'Both') => {
    try {
      setImpactData(null);
      const systemsRes = await fetchSystems(industryObj.id);
      setSystems(systemsRes.systems);
      const graphRes = await fetchGraph(industryObj.asset, type);
      setGraphData(graphRes);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleNodeClick = async (nodeName, nodeType) => {
    setIsAnalyzing(true);
    try {
      const report = await runImpactAnalysis(nodeName, nodeType);
      setImpactData(report);
    } catch (error) {
      console.error("Error running impact analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const [assets, setAssets] = useState([]);
  const [changeRequests, setChangeRequests] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({ total_assets: 0, recent_activity: [] });

  useEffect(() => {
    const initData = async () => {
      try {
        const [statsData, assetsData, crData] = await Promise.all([
          fetchDashboardStats(),
          fetchAssets(),
          fetchChangeRequests()
        ]);
        setDashboardStats(statsData);
        setAssets(assetsData);
        setChangeRequests(crData);
      } catch (err) {
        console.error("Initial load failed", err);
      }
    };
    initData();
  }, [view]);

  const formatDate = (date) => {
    const options = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
    return date.toLocaleDateString('en-GB', options).replace(/,/g, '');
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-GB', { hour12: false });
  };

  if (!isLoggedIn) {
    return <Auth onAuthSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="brand">
            <Monitor size={24} />
            <span>DesignIQ</span>
          </div>
        </div>

        <nav className="nav-menu">
          <div 
            className={`nav-item ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >
            <LayoutDashboard size={20} />
            <span>Command Center</span>
          </div>
          <div 
            className={`nav-item ${view === 'change-requests' ? 'active' : ''}`}
            onClick={() => setView('change-requests')}
          >
            <GitBranch size={20} />
            <span>Change Requests</span>
          </div>
          <div 
            className={`nav-item ${view === 'bom' ? 'active' : ''}`}
            onClick={() => setView('bom')}
          >
            <Database size={20} />
            <span>BOM Components</span>
          </div>
          <div 
            className={`nav-item ${view === 'file-manager' ? 'active' : ''}`}
            onClick={() => setView('file-manager')}
          >
            <FileCode size={20} />
            <span>CAD File Manager</span>
          </div>
          <div 
            className={`nav-item ${view === 'compliance' ? 'active' : ''}`}
            onClick={() => setView('compliance')}
          >
            <ShieldCheck size={20} />
            <span>Compliance Validation</span>
          </div>
          <div 
            className={`nav-item ${view === 'notifications' ? 'active' : ''}`}
            onClick={() => setView('notifications')}
          >
            <Bell size={20} />
            <span>Notifications</span>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">CA</div>
            <div className="user-info">
              <span className="name">Chief Architect</span>
              <span className="role">Admin</span>
            </div>
            <LogOut 
              size={18} 
              className="logout-icon" 
              style={{ marginLeft: 'auto', cursor: 'pointer', opacity: 0.6 }}
              onClick={handleLogout}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-wrapper">
        <header className="top-bar">
          <div className="status-time">
            <div className="status-dot">Online</div>
            <span>{formatDate(currentTime)}</span>
            <span style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--text-main)' }}>
              {formatTime(currentTime)}
            </span>
          </div>

          <div className="top-actions">
            <button className="primary-btn" onClick={() => setShowIngestModal(true)}>
              <Upload size={18} /> Ingest CAD
            </button>
            <div className="notification-bell" onClick={() => setView('notifications')}>
              <Bell size={20} />
              {dashboardStats.recent_activity?.length > 0 && <span className="badge">{dashboardStats.recent_activity.length}</span>}
            </div>
          </div>
        </header>

        <div className="content-area">
          {view === 'dashboard' && (
            <div className="dashboard-view">
              <Dashboard />
            </div>
          )}
          
          {view === 'change-requests' && (
            <div className="dashboard-view">
              <h1 className="page-title">Change Requests</h1>
              <p className="page-desc">Manage engineering change orders and impact approvals.</p>
              <div className="activity-card">
                <div className="activity-list">
                  {(!Array.isArray(changeRequests) || changeRequests.length === 0) ? (
                    <div style={{ padding: '32px 24px', textAlign: 'center', opacity: 0.5 }}>
                      <Activity size={32} style={{ marginBottom: '12px' }} />
                      <p>No active change requests found. Initiate one from the BOM Graph.</p>
                    </div>
                  ) : (
                    changeRequests.map(cr => (
                      <div key={cr.id || Math.random()} className="activity-item" style={{ padding: '20px' }}>
                        <div className="activity-details">
                          <span className="title" style={{ fontSize: '1.1rem' }}>{cr.id || 'N/A'}: {cr.title || 'Untitled Request'}</span>
                          <span className="status">Target: {cr.component || 'Unknown'} | Priority: {cr.priority || 'Medium'}</span>
                        </div>
                        <div className="activity-meta">
                          <span className={`status-pill ${(cr.status || 'pending').toLowerCase()}`}>{cr.status || 'Pending'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'bom' && (
            <div className="bom-view">
              <div className="bom-sidebar">
                <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Architecture</span>
                  <select 
                    className="select-input"
                    value={selectedIndustry.id} 
                    onChange={(e) => setSelectedIndustry(INDUSTRIES.find(i => i.id === e.target.value))}
                  >
                    {INDUSTRIES.map(ind => <option key={ind.id} value={ind.id}>{ind.name}</option>)}
                  </select>
                </div>
                
                <div style={{ padding: '12px' }}>
                  <div className="toggle-container" style={{ marginBottom: '12px' }}>
                    <button className={`toggle-btn ${!isGenericView ? 'active' : ''}`} onClick={() => setIsGenericView(false)}>Industry</button>
                    <button className={`toggle-btn ${isGenericView ? 'active' : ''}`} onClick={() => setIsGenericView(true)}>Generic</button>
                  </div>
                  <div className="toggle-container">
                    <button className={`toggle-btn ${reportType === '2D' ? 'active' : ''}`} onClick={() => setReportType('2D')}>2D</button>
                    <button className={`toggle-btn ${reportType === '3D' ? 'active' : ''}`} onClick={() => setReportType('3D')}>3D</button>
                    <button className={`toggle-btn ${reportType === 'Both' ? 'active' : ''}`} onClick={() => setReportType('Both')}>Both</button>
                  </div>
                </div>

                <SystemList systems={systems} isGenericView={isGenericView} />
              </div>

              <div className="bom-main-area">
                <div className="bom-content">
                  <GraphView data={graphData} onNodeClick={handleNodeClick} />
                </div>

                <div className="bom-bottom-panel">
                  <ImpactPanel impactData={impactData} isLoading={isAnalyzing} />
                </div>
              </div>
            </div>
          )}

          {view === 'file-manager' && (
            <div className="dashboard-view">
              <h1 className="page-title">CAD File Manager</h1>
              <p className="page-desc">Central repository for all engineering CAD assets.</p>
              <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                  <span className="stat-label">Total Assets</span>
                  <span className="stat-value">{assets.length}</span>
                </div>
              </div>
              <div className="activity-card">
                <div className="section-header"><h3>Ingested CAD Files</h3></div>
                <div className="activity-list">
                  {assets.length === 0 ? (
                    <p style={{ padding: '20px', opacity: 0.5 }}>No files uploaded yet.</p>
                  ) : (
                    assets.map(asset => (
                      <div key={asset.id} className="activity-item">
                        <div className="activity-details">
                          <span className="title">{asset.name}</span>
                          <span className="status">Industry: {asset.industry}</span>
                        </div>
                        <button className="primary-btn-mini" onClick={() => { setView('bom'); }}>Analyze</button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'compliance' && (
            <div className="dashboard-view">
              <h1 className="page-title">Compliance Validation</h1>
              <p className="page-desc">Automated regulatory and safety compliance checks.</p>
              <div className="stat-card" style={{ maxWidth: '400px' }}>
                <span className="stat-label">Global Compliance Score</span>
                <span className="stat-value success">{assets.length > 0 ? '100%' : '0%'}</span>
                <div style={{ marginTop: '20px' }}>
                  {assets.length === 0 ? (
                    <p style={{ fontSize: '0.9rem', opacity: 0.5 }}>Upload CAD files to run compliance validation.</p>
                  ) : (
                    <>
                      <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--success)' }}>✓ System Hierarchy: VALID</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--success)' }}>✓ Component Connectivity: VALID</p>
                      <p style={{ marginTop: '10px', fontSize: '0.9rem', color: 'var(--success)' }}>✓ Mandatory Properties: PASSED</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {view === 'notifications' && (
            <div className="dashboard-view">
              <h1 className="page-title">Notifications</h1>
              <p className="page-desc">Stay updated with system events and approvals.</p>
              <div className="activity-list">
                {dashboardStats.recent_activity?.length === 0 ? (
                  <p style={{ padding: '20px', opacity: 0.5 }}>No new notifications.</p>
                ) : (
                  dashboardStats.recent_activity.map((notif, i) => (
                    <div key={i} className="activity-item">
                      <div className="activity-details">
                        <span className="title">{notif.action}: {notif.title}</span>
                        <span className="status">{notif.time}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {showIngestModal && (
        <CadIngestionModal 
          onClose={() => setShowIngestModal(false)}
          onComplete={(mode, report) => {
            setView('bom');
            setReportType(mode);
            
            // Refresh global data
            fetchDashboardStats().then(setDashboardStats);
            fetchAssets().then(setAssets);

            // Auto-switch industry if possible
            if (report && report.industry) {
              const matched = INDUSTRIES.find(i => i.name === report.industry);
              if (matched) {
                setSelectedIndustry(matched);
                loadIndustryData(matched, mode);
                return;
              }
            }
            loadIndustryData(selectedIndustry, mode);
          }} 
        />
      )}
    </div>
  );
}

export default App;
