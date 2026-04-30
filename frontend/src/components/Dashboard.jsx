import React from 'react';
import { 
  GitPullRequest, Clock, Activity, CheckCircle, Zap, TrendingUp,
  UploadCloud, AlertTriangle, User, ExternalLink,
  GitBranch, ShieldCheck, Database, TriangleAlert
} from 'lucide-react';
import CadFilePreview from './CadFilePreview';

const statusIconColor = {
  Pending:     '#ffcc00',
  Approved:    '#00ffcc',
  Rejected:    '#ff4d4d',
  Draft:       '#848d97',
  'In Progress': '#00f5ff',
  Completed:   '#50c878',
};

const Dashboard = ({ stats: liveStats = {}, isLoading, changeRequests = [], onNavigate, onIngestCAD, graphData, impactData, onNodeClick }) => {
  const safeLive = {
    total_assets: 0,
    total_systems: 0,
    total_components: 0,
    recent_activity: [],
    ...liveStats,
  };

  const stats = [
    { label: 'Total Change Requests', value: changeRequests.length.toString(), sub: changeRequests.length === 0 ? 'No active CRs' : 'Active', icon: GitPullRequest, color: 'accent' },
    { label: 'Pending Approvals', value: changeRequests.filter(c => (c.status || '').toLowerCase() === 'pending').length.toString(), sub: 'Awaiting review', icon: Clock, color: 'warning' },
    { label: 'System Integrity', value: safeLive.total_systems > 0 ? '100%' : '0%', sub: 'Operational', icon: Activity, color: 'success' },
    { label: 'Compliance Index', value: safeLive.total_assets > 0 ? '100%' : '0%', sub: 'Verified', icon: CheckCircle, color: 'success' },
    { label: 'Est. Cost Impact', value: '₹0', sub: 'No active changes', icon: Zap, color: 'warning' },
    { label: 'Risk Exposure', value: 'Low', sub: 'No threats detected', icon: AlertTriangle, color: 'success' },
    { label: 'Active Components', value: safeLive.total_components.toLocaleString(), sub: 'In Neo4j Graph', icon: TrendingUp, color: 'accent' },
    { label: 'CAD Assets Uploaded', value: safeLive.total_assets.toString(), sub: 'Processed Files', icon: UploadCloud, color: 'accent' },
  ];

  const activity = safeLive.recent_activity || [];
  const user = JSON.parse(localStorage.getItem('user') || '{"name": "Chief Architect"}');

  // CR Status counts
  const crStatusCounts = {
    Draft:        changeRequests.filter(c => (c.status || '').toLowerCase() === 'draft').length,
    Pending:      changeRequests.filter(c => (c.status || '').toLowerCase() === 'pending').length,
    Approved:     changeRequests.filter(c => (c.status || '').toLowerCase() === 'approved').length,
    'In Progress': changeRequests.filter(c => (c.status || '').toLowerCase() === 'in progress').length,
  };
  const maxCount = Math.max(...Object.values(crStatusCounts), 1);

  const quickActions = [
    { label: 'New Change Request', sub: 'Submit an engineering CR', icon: GitBranch, action: () => onNavigate && onNavigate('change-requests') },
    { label: 'Upload CAD File', sub: 'Upload and visualize drawings', icon: UploadCloud, action: () => onIngestCAD && onIngestCAD() },
    { label: 'View BOM', sub: 'Browse component registry', icon: Database, action: () => onNavigate && onNavigate('bom') },
    { label: 'Compliance Check', sub: 'Run rule validation', icon: ShieldCheck, action: () => onNavigate && onNavigate('compliance') },
  ];

  const quickActionIcons = ['#00f5ff', '#00f5ff', '#00f5ff', '#00ffcc'];

  return (
    <div className="dashboard-content-wrapper">
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-desc">Enterprise-level engineering intelligence and change management oversight.</p>
        </div>
        <div className="user-welcome">
          <span>Welcome back, <strong>{user.name}</strong></span>
          <div className="live-pulse">Live Feed</div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-top">
              <span className="stat-label">{stat.label}</span>
              <stat.icon className={`stat-icon-mini ${stat.color}`} size={16} />
            </div>
            <span className={`stat-value ${stat.color}`}>{stat.value}</span>
            <span className="stat-sub">{stat.sub}</span>
          </div>
        ))}
      </div>

      {/* Hero 3D Section */}
      <div style={{ 
        width: '100%', height: 500, background: 'var(--bg-card)', 
        border: '1px solid var(--border-color)', borderRadius: 16, 
        marginBottom: 24, overflow: 'hidden' 
      }}>
        <CadFilePreview 
          assetName={impactData ? `Impact Analysis: ${impactData.target_component}` : (safeLive.recent_activity[0]?.title || "Active Design")} 
          graphData={graphData}
          impactData={impactData}
          industry={safeLive.recent_activity[0]?.industry || "Ship"}
          onOpenDetails={(node) => onNodeClick && onNodeClick(node.name, node.group)}
        />
      </div>

      {/* Main Content Area: Activity + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Left Column: CR Status & Recent Activity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* CR Status Bar Chart */}
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border-color)',
            borderRadius: 16, padding: 24,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Change Request Status
            </span>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', marginTop: 32, height: 120, gap: 12 }}>
              {Object.entries(crStatusCounts).map(([label, count]) => {
                const pct = Math.max((count / maxCount) * 100, count === 0 ? 0 : 8);
                const color = statusIconColor[label] || '#848d97';
                return (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flex: 1 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{count > 0 ? count : ''}</span>
                    <div style={{
                      width: '100%', background: `${color}22`,
                      borderRadius: 6, height: 100, display: 'flex', alignItems: 'flex-end', overflow: 'hidden',
                    }}>
                      <div style={{
                        width: '100%', height: `${pct}%`,
                        background: count === 0 ? 'transparent' : color,
                        borderRadius: 6, transition: 'height 0.5s ease',
                        minHeight: count === 0 ? 0 : 4,
                      }} />
                    </div>
                    <span style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'center' }}>
                      {label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity */}
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-color)',
          borderRadius: 16, padding: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
              Recent Activity
            </span>
            <span
              onClick={() => onNavigate && onNavigate('change-requests')}
              style={{ fontSize: 12, color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 600 }}
            >
              View all
            </span>
          </div>

          {changeRequests.length === 0 && activity.length === 0 ? (
            <div style={{ height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              No recent activity
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[
                ...changeRequests.slice(0, 2).map(cr => ({
                  id: cr.id,
                  title: cr.title || 'Change Request',
                  sub: `Status changed to ${(cr.status || 'pending').toLowerCase()}`,
                  person: cr.assignedTo || cr.user || '',
                  date: cr.time ? new Date(Number(cr.time)).toLocaleDateString('en-GB') : '—',
                  color: statusIconColor[cr.status] || '#848d97',
                })),
                ...activity.slice(0, Math.max(0, 3 - changeRequests.length)).map(item => ({
                  id: item.id,
                  title: item.title || 'CAD Data Ingested',
                  sub: item.action || 'Asset ingested',
                  person: item.user || '',
                  date: 'Recently',
                  color: '#00f5ff',
                })),
              ].slice(0, 4).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <TriangleAlert size={16} style={{ color: item.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{item.person}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        {quickActions.map((qa, i) => (
          <button
            key={i}
            onClick={qa.action}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border-color)',
              borderRadius: 12, padding: '20px 20px',
              display: 'flex', alignItems: 'center', gap: 14,
              cursor: 'pointer', transition: 'all 0.2s', textAlign: 'left',
              color: 'var(--text-main)', fontFamily: 'inherit',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = quickActionIcons[i];
              e.currentTarget.style.background = `${quickActionIcons[i]}0d`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-color)';
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: `${quickActionIcons[i]}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <qa.icon size={18} style={{ color: quickActionIcons[i] }} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13 }}>{qa.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{qa.sub}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
