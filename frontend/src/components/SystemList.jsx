import React from 'react';

const SystemList = ({ systems, isGenericView }) => {
  if (!systems || systems.length === 0) {
    return <div className="empty-state">No systems found.</div>;
  }

  return (
    <div className="system-list">
      {systems.map((sys, idx) => (
        <div key={idx} className="system-item">
          <div className="system-name">
            {isGenericView ? sys.generic_system : sys.system}
          </div>
          <div className="system-badge">
            {isGenericView ? sys.system : sys.generic_system}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SystemList;
