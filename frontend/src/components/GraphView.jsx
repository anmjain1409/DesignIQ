import React, { useRef, useEffect } from 'react';
import ForceGraph2D from 'react-force-graph-2d';

const GraphView = ({ data, onNodeClick }) => {
  const fgRef = useRef();

  useEffect(() => {
    if (fgRef.current) {
      // Add collision force to prevent nodes from overlapping
      fgRef.current.d3Force('collide', window.d3?.forceCollide(15) || null);
    }
  }, [data]);

  const getNodeColor = (node) => {
    switch (node.group) {
      case 'Asset': return '#8b5cf6'; // Purple
      case 'System': return '#3b82f6'; // Blue
      case 'Assembly': return '#06b6d4'; // Cyan
      case 'SubAssembly': return '#10b981'; // Green
      case 'Component': return '#f59e0b'; // Amber
      case 'Property': return '#ef4444'; // Red
      default: return '#94a3b8'; // Slate
    }
  };

  return (
    <div className="graph-container">
      <div className="graph-overlay">
        <div className="graph-legend">
          <div className="legend-item"><div className="color-box" style={{backgroundColor: '#8b5cf6'}}></div> <span>Asset</span></div>
          <div className="legend-item"><div className="color-box" style={{backgroundColor: '#3b82f6'}}></div> <span>System</span></div>
          <div className="legend-item"><div className="color-box" style={{backgroundColor: '#06b6d4'}}></div> <span>Assembly</span></div>
          <div className="legend-item"><div className="color-box" style={{backgroundColor: '#10b981'}}></div> <span>SubAssembly</span></div>
          <div className="legend-item"><div className="color-box" style={{backgroundColor: '#f59e0b'}}></div> <span>Component</span></div>
        </div>
      </div>
      
      {data && data.nodes && data.nodes.length > 0 ? (
        <ForceGraph2D
          ref={fgRef}
          graphData={data}
          nodeLabel="name"
          nodeColor={getNodeColor}
          nodeRelSize={6}
          linkColor={() => 'rgba(148, 163, 184, 0.4)'}
          linkWidth={1.5}
          onNodeClick={(node) => {
            onNodeClick(node.name, node.group);
          }}
          backgroundColor="#0f172a"
          width={window.innerWidth - 620} // Adjust based on sidebars
        />
      ) : (
        <div className="empty-state" style={{height: '100%', position: 'absolute', width: '100%'}}>
          Select an industry to view its BOM graph.
        </div>
      )}
    </div>
  );
};

export default GraphView;
