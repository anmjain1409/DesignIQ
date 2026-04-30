import React from 'react';

/* ─────────────────────────────────────────
   Shared helpers
───────────────────────────────────────── */
const panelStyle = {
  background: 'var(--bg-main)',
  border: '1px solid var(--border-color)',
  borderRadius: 10,
  padding: '12px 14px',
  height: '100%',
  boxSizing: 'border-box',
};

function PanelLabel({ children }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
      {children}
    </div>
  );
}

function Empty({ children }) {
  return (
    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '32px 0', fontStyle: 'italic' }}>
      {children}
    </div>
  );
}

const trunc = (s, n = 10) => s && s.length > n ? s.slice(0, n) + '…' : (s || '');

const GROUP_COLORS = {
  Asset:     { fill: 'rgba(0,245,255,0.12)',   stroke: '#00f5ff',  text: '#00f5ff'  },
  System:    { fill: 'rgba(80,200,255,0.10)',  stroke: '#50c8ff',  text: '#50c8ff'  },
  Component: { fill: 'rgba(255,204,0,0.12)',   stroke: '#ffcc00',  text: '#ffcc00'  },
};

/* ─────────────────────────────────────────
   Full CAD BOM Graph  (left panel)
   Receives the full nodes+links from /user-graph
───────────────────────────────────────── */
export function FullCadGraphViz({ graphData }) {
  const nodes = graphData?.nodes || [];
  const links = graphData?.links || [];

  if (nodes.length === 0) {
    return (
      <div style={panelStyle}>
        <PanelLabel>Uploaded CAD Structure</PanelLabel>
        <Empty>No CAD data uploaded yet</Empty>
      </div>
    );
  }

  const W = 380, NODE_W = 62, NODE_H = 22;

  // Bucket by group
  const assets     = nodes.filter(n => n.group === 'Asset');
  const systems    = nodes.filter(n => n.group === 'System');
  const components = nodes.filter(n => n.group === 'Component');

  // Row Y positions
  const ROW_Y = { Asset: 18, System: 78, Component: 138 };
  const rows = [assets, systems, components];

  // Compute x position for every node
  const pos = {};
  rows.forEach((row, ri) => {
    const y = Object.values(ROW_Y)[ri];
    const spacing = W / (row.length + 1);
    row.forEach((n, i) => { pos[n.id] = { x: spacing * (i + 1), y }; });
  });

  const H = 170;

  return (
    <div style={{ ...panelStyle, overflow: 'hidden' }}>
      <PanelLabel>Uploaded CAD Structure</PanelLabel>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
        {Object.entries(GROUP_COLORS).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: v.text }}>
            <div style={{ width: 7, height: 7, borderRadius: 2, background: v.fill, border: `1px solid ${v.stroke}` }} />
            {k}
          </div>
        ))}
      </div>

      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: 'visible' }}>
        {/* Edges */}
        {links.map((l, i) => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          const s = pos[sid], t = pos[tid];
          if (!s || !t) return null;
          return (
            <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
              stroke="rgba(255,255,255,0.13)" strokeWidth="1" strokeDasharray="3 3" />
          );
        })}

        {/* Nodes */}
        {nodes.map(n => {
          const p = pos[n.id];
          if (!p) return null;
          const c = GROUP_COLORS[n.group] || GROUP_COLORS.Component;
          return (
            <g key={n.id}>
              <rect x={p.x - NODE_W / 2} y={p.y - NODE_H / 2} width={NODE_W} height={NODE_H} rx={6}
                fill={c.fill} stroke={c.stroke} strokeWidth="1.3" />
              <text x={p.x} y={p.y + 4} textAnchor="middle" fill={c.text} fontSize="8" fontWeight="600">
                {trunc(n.name, 9)}
              </text>
            </g>
          );
        })}

        {/* Row labels */}
        {[['Asset', 18], ['System', 78], ['Component', 138]].map(([label, y]) => (
          <text key={label} x={4} y={y + 5} fill="rgba(132,141,151,0.5)" fontSize="7" fontWeight="600">
            {label.toUpperCase()}
          </text>
        ))}
      </svg>

      <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: 'right' }}>
        {assets.length} asset · {systems.length} system · {components.length} component
      </div>
    </div>
  );
}


/* ─────────────────────────────────────────
   Impact Map  (right panel)
   Hub-and-spoke: changed component → affected
───────────────────────────────────────── */
export function AffectedSystemsViz({ affectedGraph, changedComponent, impactedComponents }) {
  const nodes  = affectedGraph?.nodes || [];
  const links  = affectedGraph?.links || [];
  const leaves = nodes.filter(n => n.type === 'impacted');
  const count  = leaves.length;

  const W = 380, H = 200;
  const cx = W / 2, cy = H / 2 - 6;
  const R = Math.min(80, 40 + count * 5);

  const positions = { root: { x: cx, y: cy } };
  leaves.forEach((n, i) => {
    const angle = (2 * Math.PI * i) / Math.max(count, 1) - Math.PI / 2;
    positions[n.id] = { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle) };
  });

  return (
    <div style={{ ...panelStyle, overflow: 'hidden' }}>
      <PanelLabel>
        Impact Map&nbsp;
        <span style={{ color: count > 0 ? 'rgba(255,100,100,0.9)' : 'var(--text-muted)', fontWeight: 400 }}>
          ({count} affected)
        </span>
      </PanelLabel>

      {count === 0 ? (
        <Empty>No downstream impacts detected</Empty>
      ) : (
        <>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`}>
            {/* Spoke lines */}
            {links.map((l, i) => {
              const s = positions[l.source], t = positions[l.target];
              if (!s || !t) return null;
              return (
                <line key={i} x1={s.x} y1={s.y} x2={t.x} y2={t.y}
                  stroke="rgba(255,100,100,0.3)" strokeWidth="1.5" strokeDasharray="5 3" />
              );
            })}

            {/* Leaf nodes */}
            {leaves.map(n => {
              const p = positions[n.id];
              if (!p) return null;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={24} fill="rgba(255,77,77,0.1)" stroke="rgba(255,77,77,0.65)" strokeWidth="1.5" />
                  <text x={p.x} y={p.y + 4} textAnchor="middle" fill="#ff6b6b" fontSize="7.5" fontWeight="600">
                    {trunc(n.name, 11)}
                  </text>
                </g>
              );
            })}

            {/* Root / changed node */}
            <circle cx={cx} cy={cy} r={30} fill="rgba(255,204,0,0.15)" stroke="rgba(255,204,0,0.9)" strokeWidth="2" />
            <text x={cx} y={cy - 4} textAnchor="middle" fill="#ffcc00" fontSize="8" fontWeight="700">
              {trunc(changedComponent, 12)}
            </text>
            <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(255,204,0,0.55)" fontSize="6.5">
              CHANGED
            </text>
          </svg>

          {/* Compact list below */}
          <div style={{ marginTop: 4, maxHeight: 54, overflowY: 'auto' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {(impactedComponents || []).map((c, i) => (
                <span key={i} style={{
                  background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.4)',
                  color: '#ff8080', borderRadius: 4, padding: '2px 7px', fontSize: 9, fontWeight: 600,
                }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
