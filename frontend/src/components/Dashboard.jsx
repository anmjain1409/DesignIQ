import React, { useState, useEffect } from 'react';
import { 
  GitPullRequest, 
  Clock, 
  Activity, 
  CheckCircle, 
  Zap, 
  TrendingUp, 
  UploadCloud, 
  AlertTriangle,
  User,
  ExternalLink
} from 'lucide-react';
import { fetchDashboardStats } from '../services/api';

const Dashboard = () => {
  const [liveStats, setLiveStats] = useState({
    total_assets: 0,
    total_systems: 0,
    total_components: 0,
    recent_activity: []
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getStats = async () => {
      try {
        const data = await fetchDashboardStats();
        setLiveStats(data);
      } catch (err) {
        console.error("Failed to fetch live stats", err);
      } finally {
        setIsLoading(false);
      }
    };
    getStats();
  }, []);

  const stats = [
    { label: 'Total Change Requests', value: '0', sub: 'No active CRs', icon: GitPullRequest, color: 'accent' },
    { label: 'Pending Approvals', value: '0', sub: 'Clean Queue', icon: Clock, color: 'warning' },
    { label: 'System Integrity', value: liveStats.total_systems > 0 ? '100%' : '0%', sub: 'Operational', icon: Activity, color: 'success' },
    { label: 'Compliance Index', value: liveStats.total_assets > 0 ? '100%' : '0%', sub: 'Verified', icon: CheckCircle, color: 'success' },
    { label: 'Est. Cost Impact', value: '₹0', sub: 'No active changes', icon: Zap, color: 'warning' },
    { label: 'Risk Exposure', value: 'Low', sub: 'No threats detected', icon: AlertTriangle, color: 'success' },
    { label: 'Active Components', value: liveStats.total_components.toLocaleString(), sub: 'In Neo4j Graph', icon: TrendingUp, color: 'accent' },
    { label: 'CAD Assets Uploaded', value: liveStats.total_assets.toString(), sub: 'Processed Files', icon: UploadCloud, color: 'accent' },
  ];

  const activity = liveStats.recent_activity || [];

  return (
    <div className="dashboard-content-wrapper">
      <div className="dashboard-header">
        <div>
          <h1 className="page-title">Command Center</h1>
          <p className="page-desc">Enterprise-level engineering intelligence and change management oversight.</p>
        </div>
        <div className="user-welcome">
          <span>Welcome back, <strong>Chief Architect</strong></span>
          <div className="live-pulse">Live Feed</div>
        </div>
      </div>

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

      <div className="bottom-grid">
        <div className="card-panel">
          <div className="section-header">
            <h3>Program Distribution</h3>
            <ExternalLink size={16} className="text-muted" />
          </div>
          <div className="bar-chart-mock">
            {[80, 45, 90, 60].map((h, i) => (
              <div key={i} className="bar-wrapper">
                <div className="bar" style={{ height: `${h}%` }}></div>
                <span className="bar-label">PROG {i+1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-panel">
          <div className="section-header">
            <h3>Recent Engineering Activity</h3>
            <span className="badge-outline">Live</span>
          </div>
          <div className="activity-feed">
            {activity.map(item => (
              <div key={item.id} className="feed-item">
                <div className="feed-icon">
                  <User size={14} />
                </div>
                <div className="feed-content">
                  <div className="feed-top">
                    <span className="feed-title">{item.title}</span>
                    <span className="feed-time">{item.time}</span>
                  </div>
                  <p className="feed-action">{item.action}</p>
                  <div className="feed-footer">
                    <span className="feed-user">{item.user}</span>
                    <span className={`feed-tag tag-${item.type}`}>{item.type}</span>
                    <span className="feed-priority">Priority: {item.priority}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
