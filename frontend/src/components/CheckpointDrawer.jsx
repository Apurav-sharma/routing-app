import React, { useState } from 'react';
import { ListFilter, ChevronDown, ChevronUp, AlertCircle, Wind, CloudRain, Snowflake } from 'lucide-react';

export default function CheckpointDrawer({ activeRoute }) {
  const [isOpen, setIsOpen] = useState(false);

  if (!activeRoute || !activeRoute.checkpoints || activeRoute.checkpoints.length === 0) {
    return null;
  }

  const checkpoints = activeRoute.checkpoints;

  return (
    <div className="card-section" style={{ marginTop: '10px' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', fontWeight: 700, color: '#334155' }}>
          <ListFilter size={15} color="#2563eb" />
          <span>Checkpoint Log ({checkpoints.length} sampled points)</span>
        </div>
        <div
          style={{
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontSize: '0.76rem',
            fontWeight: 700,
          }}
        >
          <span>{isOpen ? 'Hide Table' : 'View Table'}</span>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isOpen && (
        <div style={{ marginTop: '14px', overflowX: 'auto', maxHeight: '280px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '8px 10px' }}>Mile</th>
                <th style={{ padding: '8px 10px' }}>ETA</th>
                <th style={{ padding: '8px 10px' }}>Risk</th>
                <th style={{ padding: '8px 10px' }}>Wind</th>
                <th style={{ padding: '8px 10px' }}>Rain</th>
                <th style={{ padding: '8px 10px' }}>Snow</th>
                <th style={{ padding: '8px 10px' }}>Notes / Alert</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((cp) => {
                const r = cp.risk || {};
                const w = cp.weather || {};
                const isHazardous = r.level >= 3;

                return (
                  <tr
                    key={cp.index}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      backgroundColor: isHazardous ? '#fff1f2' : 'transparent',
                    }}
                  >
                    <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>
                      Mile {cp.mile_marker}
                    </td>
                    <td style={{ padding: '8px 10px', color: '#64748b' }}>
                      {cp.eta_display}
                    </td>
                    <td style={{ padding: '8px 10px' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          backgroundColor: r.color || '#10b981',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.72rem',
                        }}
                      >
                        {r.tier}
                      </span>
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155', fontWeight: 600 }}>
                      {w.wind_mph} mph
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      {w.rain_rate_in_hr} in/hr
                    </td>
                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                      {w.snow_rate_in_hr} in/hr
                    </td>
                    <td style={{ padding: '8px 10px', color: r.warnings?.length ? '#b91c1c' : '#64748b' }}>
                      {r.warnings?.length ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                          <AlertCircle size={13} /> {r.warnings[0]}
                        </span>
                      ) : (
                        w.condition
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
