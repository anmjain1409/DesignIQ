import React, { useState, useEffect } from 'react';
import { Layers, Upload, LogOut } from 'lucide-react';
import { fetchSystems, fetchGraph, runImpactAnalysis } from './services/api';
import SystemList from './components/SystemList';
import GraphView from './components/GraphView';
import ImpactPanel from './components/ImpactPanel';
import CadIngestionModal from './components/CadIngestionModal';
import Auth from './components/Auth';

const INDUSTRIES = [
  { id: 'Ship', name: 'Shipbuilding', asset: 'Ship Alpha' },
  { id: 'Automotive', name: 'Automotive', asset: 'Car Alpha' },
  { id: 'Aerospace', name: 'Aerospace', asset: 'Jet Alpha' },
  { id: 'Oil & Gas', name: 'Oil & Gas', asset: 'Rig Alpha' }
];

function App() {
  const [selectedIndustry, setSelectedIndustry] = useState(INDUSTRIES[0]);
  const [isGenericView, setIsGenericView] = useState(false);
  const [systems, setSystems] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [impactData, setImpactData] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('token'));

  useEffect(() => {
    if (isLoggedIn) {
      loadIndustryData(selectedIndustry);
    }
  }, [selectedIndustry, isLoggedIn]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsLoggedIn(false);
  };

  const loadIndustryData = async (industryObj) => {
    try {
      setImpactData(null); // Reset impact data on industry change
      
      const systemsRes = await fetchSystems(industryObj.id);
      setSystems(systemsRes.systems);
      
      const graphRes = await fetchGraph(industryObj.asset);
      setGraphData(graphRes);
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleIndustryChange = (e) => {
    const industryId = e.target.value;
    const industry = INDUSTRIES.find(ind => ind.id === industryId);
    setSelectedIndustry(industry);
  };

  const handleNodeClick = async (nodeName, nodeType) => {
    console.log(`DEBUG: Node clicked: ${nodeName} (${nodeType})`);
    setIsAnalyzing(true);
    try {
      const report = await runImpactAnalysis(nodeName, nodeType);
      console.log("DEBUG: Impact analysis report received:", report);
      setImpactData(report);
    } catch (error) {
      console.error("Error running impact analysis:", error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isLoggedIn) {
    return <Auth onAuthSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="logo">
          <Layers size={24} color="#3b82f6" />
          DesignIQ
        </div>
        
        <div className="controls">
          <button className="primary-btn ingest-btn" onClick={() => setShowIngestModal(true)}>
            <Upload size={16} /> Ingest CAD
          </button>
          
          <div className="divider"></div>

          <select 
            className="select-input"
            value={selectedIndustry.id} 
            onChange={handleIndustryChange}
          >
            {INDUSTRIES.map(ind => (
              <option key={ind.id} value={ind.id}>{ind.name}</option>
            ))}
          </select>
          
          <div className="toggle-container">
            <span>Terminology:</span>
            <button 
              className={`toggle-btn ${!isGenericView ? 'active' : ''}`}
              onClick={() => setIsGenericView(false)}
            >
              Industry
            </button>
            <button 
              className={`toggle-btn ${isGenericView ? 'active' : ''}`}
              onClick={() => setIsGenericView(true)}
            >
              Generic
            </button>
          </div>

          <div className="divider"></div>

          <button className="logout-btn" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* Left Sidebar - Systems */}
        <div className="sidebar">
          <div className="panel-header">
            System Architecture
          </div>
          <SystemList systems={systems} isGenericView={isGenericView} />
        </div>

        {/* Center - Graph View */}
        <GraphView data={graphData} onNodeClick={handleNodeClick} />

        {/* Right Sidebar - Impact Analysis */}
        <div className="impact-panel">
          <div className="panel-header">
            Impact Analysis
          </div>
          <ImpactPanel impactData={impactData} isLoading={isAnalyzing} />
        </div>
      </main>

      {showIngestModal && (
        <CadIngestionModal 
          onClose={() => setShowIngestModal(false)}
          onComplete={() => loadIndustryData(selectedIndustry)} 
        />
      )}
    </div>
  );
}

export default App;
