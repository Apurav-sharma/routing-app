import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { AlertTriangle, Wind, CloudRain, Snowflake, Thermometer, Info } from 'lucide-react';

// Auto-adjust map bounds to frame active route
function MapBoundsUpdater({ coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (coordinates && coordinates.length > 0) {
      const timer = setTimeout(() => {
        map.invalidateSize();
        try {
          const bounds = L.latLngBounds(coordinates.map((c) => [c[0], c[1]]));
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
          }
        } catch (e) {
          console.error('Fit bounds error:', e);
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [coordinates, map]);
  return null;
}

// Sleek, minimal checkpoint telemetry pins (no overlapping text blocks)
// Sleek, minimal micro-dot telemetry pins
const createCheckpointIcon = (level, mileMarker) => {
  const colors = {
    1: '#10b981', // Low (emerald)
    2: '#f59e0b', // Moderate (amber)
    3: '#f97316', // High (orange)
    4: '#ef4444', // Severe (red)
    5: '#be123c', // No Travel (crimson)
  };
  const color = colors[level] || '#2563eb';
  const isSevere = level >= 4;
  const isHigh = level === 3;
  const isMod = level === 2;

  // Ultra-clean sizing: 6px for Low, 8px for Mod, 10px for High, 13px for Severe
  const size = isSevere ? 13 : isHigh ? 10 : isMod ? 8 : 6;
  const pulseHtml = isSevere
    ? `<span class="marker-pulse-ring" style="border-color: ${color};"></span>`
    : '';

  return L.divIcon({
    className: 'custom-checkpoint-marker',
    html: `
      <div class="cp-dot-wrapper" style="width: ${size + 6}px; height: ${size + 6}px;">
        ${pulseHtml}
        <div class="cp-dot-core" style="width: ${size}px; height: ${size}px; background: ${color};"></div>
      </div>
    `,
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
    popupAnchor: [0, -8],
  });
};

// Compact Origin and Destination Pill Badges
const createTerminalIcon = (title, subtitle, color, isOrigin) => {
  return L.divIcon({
    className: 'custom-checkpoint-marker',
    html: `
      <div class="terminal-pin-badge" style="border-color: ${color};">
        <span class="terminal-pin-dot" style="background: ${color};"></span>
        <div class="terminal-pin-text">
          <div class="terminal-pin-title">${title}</div>
          <div class="terminal-pin-sub">${subtitle}</div>
        </div>
      </div>
    `,
    iconSize: [110, 26],
    iconAnchor: [55, 13],
    popupAnchor: [0, -16],
  });
};

export default function TruckMap({
  routes,
  selectedRouteId,
  onSelectRoute,
  corridorHeatmap,
  currentHour,
  activeLayerMode,
  showHeatmap,
}) {
  const [showLegendDetails, setShowLegendDetails] = useState(false);
  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const defaultCenter = [39.8283, -98.5795];

  // Extract heatmap frame for currentHour
  const activeHeatFrame = (corridorHeatmap && corridorHeatmap.length > currentHour)
    ? corridorHeatmap[currentHour]
    : (corridorHeatmap ? corridorHeatmap[0] : null);

  // Helper for heatmap point color aligned with official risk thresholds
  const getHeatmapColor = (pt) => {
    const w = pt.wind_mph || 0;
    const r = pt.rain_in || 0;
    const s = pt.snow_in || 0;

    if (activeLayerMode === 'wind') {
      if (w >= 55) return '#be123c';
      if (w >= 45) return '#ef4444';
      if (w >= 35) return '#f97316';
      if (w >= 25) return '#f59e0b';
      return '#10b981';
    }
    if (activeLayerMode === 'rain') {
      if (r > 1.0) return '#be123c';
      if (r >= 0.5) return '#ef4444';
      if (r >= 0.25) return '#f97316';
      if (r >= 0.1) return '#f59e0b';
      return '#10b981';
    }
    if (activeLayerMode === 'snow') {
      if (s > 3.0) return '#be123c';
      if (s >= 2.0) return '#ef4444';
      if (s >= 1.0) return '#f97316';
      if (s >= 0.5) return '#f59e0b';
      return '#10b981';
    }

    // Default Risk Mode
    if (w >= 55 || r > 1.0 || s > 3.0) return '#be123c'; // No Travel
    if (w >= 45 || r >= 0.5 || s >= 2.0) return '#ef4444'; // Severe
    if (w >= 35 || r >= 0.25 || s >= 1.0) return '#f97316'; // High
    if (w >= 25 || r >= 0.1 || s >= 0.5) return '#f59e0b'; // Moderate
    return '#10b981'; // Low
  };

  return (
    <div className="map-viewport-wrapper">
      <MapContainer
        center={defaultCenter}
        zoom={5}
        className="map-container"
        scrollWheelZoom={true}
      >
        {/* Esri World Street Map - Executive Quality, High-Contrast Highways, Zero Watermarks */}
        <TileLayer
          attribution='&copy; <a href="https://www.esri.com/">Esri</a> &mdash; World Street Map'
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          maxZoom={18}
        />

        {activeRoute && <MapBoundsUpdater coordinates={activeRoute.coordinates} />}

        {/* Corridor Weather Heatmap Layer - Filtered for Meaningful Weather Activity */}
        {showHeatmap && activeHeatFrame && activeHeatFrame.points.map((pt, idx) => {
          const w = pt.wind_mph || 0;
          const r = pt.rain_in || 0;
          const s = pt.snow_in || 0;

          // Only render active weather zones (Moderate+) so calm sunny areas remain clean terrain
          const isNotable = (w >= 25) || (r >= 0.10) || (s >= 0.5) || (pt.intensity >= 0.4);

          if (!isNotable) return null;

          const color = getHeatmapColor(pt);
          let intensityVal = pt.intensity || 0.3;
          if (activeLayerMode === 'wind') intensityVal = Math.min(w / 55.0, 1.0);
          if (activeLayerMode === 'rain') intensityVal = Math.min(r / 1.0, 1.0);
          if (activeLayerMode === 'snow') intensityVal = Math.min(s / 3.0, 1.0);

          const radius = 18 + Math.round(intensityVal * 20);
          const opacity = 0.22 + intensityVal * 0.25;

          return (
            <CircleMarker
              key={`heat-${currentHour}-${idx}`}
              center={[pt.lat, pt.lon]}
              radius={radius}
              pathOptions={{
                fillColor: color,
                fillOpacity: opacity,
                color: color,
                weight: 1,
                opacity: 0.35,
              }}
            >
              <Popup>
                <div style={{ fontSize: '12px', color: '#0f172a', lineHeight: 1.5 }}>
                  <strong>Corridor Radar (T+{currentHour}h)</strong><br />
                  <span>Wind: <strong>{pt.wind_mph} mph</strong></span><br />
                  <span>Rain: <strong>{pt.rain_in} in/hr</strong></span><br />
                  <span>Snow: <strong>{pt.snow_in} in/hr</strong></span>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}

        {/* 3 Route Polylines */}
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const color = isSelected
            ? (route.is_recommended ? '#2563eb' : '#6366f1')
            : '#94a3b8';

          return (
            <Polyline
              key={route.id}
              positions={route.coordinates}
              pathOptions={{
                color: color,
                weight: isSelected ? 5.5 : 3.5,
                opacity: isSelected ? 0.95 : 0.45,
                dashArray: isSelected ? undefined : '5, 8',
              }}
              eventHandlers={{
                click: () => onSelectRoute(route.id),
              }}
            />
          );
        })}

        {/* Origin & Destination Pin Markers for Active Route */}
        {activeRoute && activeRoute.coordinates && activeRoute.coordinates.length > 0 && (
          <>
            <Marker
              position={activeRoute.coordinates[0]}
              icon={createTerminalIcon('ORIGIN', 'Mile 0', '#10b981', true)}
            >
              <Popup>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>
                  Trip Origin (Mile 0)
                </div>
              </Popup>
            </Marker>
            <Marker
              position={activeRoute.coordinates[activeRoute.coordinates.length - 1]}
              icon={createTerminalIcon('DESTINATION', `${activeRoute.distance_miles} mi`, '#0f172a', false)}
            >
              <Popup>
                <div style={{ color: '#0f172a', fontWeight: 700 }}>
                  Destination Terminal ({activeRoute.distance_miles} miles)
                </div>
              </Popup>
            </Marker>
          </>
        )}

        {/* Checkpoint Markers for the Selected Route */}
        {activeRoute && activeRoute.checkpoints && activeRoute.checkpoints.map((cp) => {
          const riskLevel = cp.risk?.level || 1;
          const w = cp.weather || {};
          const r = cp.risk || {};

          return (
            <Marker
              key={`cp-${activeRoute.id}-${cp.index}`}
              position={[cp.lat, cp.lon]}
              icon={createCheckpointIcon(riskLevel, cp.mile_marker)}
            >
              <Popup>
                <div className="checkpoint-popup-card">
                  <div className="cp-header">
                    Mile {cp.mile_marker} Checkpoint
                  </div>
                  <div className="cp-eta">
                    ETA: {cp.eta_display} (+{cp.elapsed_hours}h into trip)
                  </div>

                  <div className="cp-metric-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Wind size={13} color="#2563eb" /> Wind Speed:
                    </span>
                    <strong>{w.wind_mph} mph ({r.wind?.tier})</strong>
                  </div>

                  <div className="cp-metric-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <CloudRain size={13} color="#2563eb" /> Rain Rate:
                    </span>
                    <strong>{w.rain_rate_in_hr} in/hr ({r.rain?.tier})</strong>
                  </div>

                  <div className="cp-metric-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Snowflake size={13} color="#2563eb" /> Snowfall:
                    </span>
                    <strong>{w.snow_rate_in_hr} in/hr ({r.snow?.tier})</strong>
                  </div>

                  <div className="cp-metric-row">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Thermometer size={13} color="#2563eb" /> Temperature:
                    </span>
                    <strong>{w.temp_f}°F ({w.condition})</strong>
                  </div>

                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span
                      className="cp-badge-risk"
                      style={{ background: r.color || '#10b981' }}
                    >
                      Risk: {r.tier?.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>
                      Score {r.score}/5.0
                    </span>
                  </div>

                  {/* Active Load Warning */}
                  {r.warnings && r.warnings.length > 0 && (
                    <div style={{ marginTop: '8px', padding: '6px 8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', color: '#991b1b', fontSize: '11px', fontWeight: 500 }}>
                      <AlertTriangle size={12} style={{ display: 'inline', marginRight: 4 }} />
                      {r.warnings[0]}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Sleek Floating Glass Risk Legend Pill in Top-Right Corner */}
      <div className="sleek-legend-container">
        <div className="sleek-legend-pill" onClick={() => setShowLegendDetails(!showLegendDetails)}>
          <span className="legend-chip"><span className="legend-dot" style={{ background: 'var(--risk-low)' }} /> Low</span>
          <span className="legend-chip"><span className="legend-dot" style={{ background: 'var(--risk-mod)' }} /> Moderate</span>
          <span className="legend-chip"><span className="legend-dot" style={{ background: 'var(--risk-high)' }} /> High</span>
          <span className="legend-chip"><span className="legend-dot" style={{ background: 'var(--risk-severe)' }} /> Severe</span>
          <span className="legend-chip"><span className="legend-dot" style={{ background: 'var(--risk-no-travel)' }} /> No Travel</span>
          <button type="button" className="legend-info-btn" title="Click for risk threshold rules">
            <Info size={12} />
          </button>
        </div>

        {/* Expandable Details Card on Click */}
        {showLegendDetails && (
          <div className="legend-details-popover">
            <div className="legend-popover-title">Standard Weather Risk Thresholds</div>
            <div className="legend-rule-row">
              <span className="rule-badge low">Low</span>
              <span>Wind &lt;25 mph • Rain &lt;0.10&quot; • Snow &lt;0.5&quot;</span>
            </div>
            <div className="legend-rule-row">
              <span className="rule-badge mod">Moderate</span>
              <span>Wind 25–34 mph • Rain 0.10–0.25&quot; • Snow 0.5–1.0&quot;</span>
            </div>
            <div className="legend-rule-row">
              <span className="rule-badge high">High</span>
              <span>Wind 35–44 mph • Rain 0.25–0.50&quot; • Snow 1.0–2.0&quot;</span>
            </div>
            <div className="legend-rule-row">
              <span className="rule-badge severe">Severe</span>
              <span>Wind 45–54 mph • Rain 0.50–1.00&quot; • Snow 2.0–3.0&quot;</span>
            </div>
            <div className="legend-rule-row">
              <span className="rule-badge no-travel">No Travel</span>
              <span>Wind &ge;55 mph • Rain &gt;1.00&quot; • Snow &gt;3.0&quot;</span>
            </div>
            <div className="legend-rule-footer">
              *Heavy loads (&gt;40k lb) escalate 35–44 mph to Severe. High winds (&ge;55 mph or 45–54 mph + &gt;30k lb) mandate No Travel.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
