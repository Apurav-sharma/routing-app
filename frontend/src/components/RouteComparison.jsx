import React from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle2, ChevronRight, Gauge, Clock, Navigation } from 'lucide-react';

export default function RouteComparison({ routes, selectedRouteId, onSelectRoute, recommendationReason }) {
  if (!routes || routes.length === 0) return null;

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];
  const rs = activeRoute.risk_summary || {};
  const dist = activeRoute.distance_miles || 0;
  const hrs = Math.floor(activeRoute.duration_hours || 0);
  const mins = Math.round(((activeRoute.duration_hours || 0) - hrs) * 60);

  // Risk bar percentages
  const lowPct = dist > 0 ? ((rs.low_miles || 0) / dist) * 100 : 100;
  const modPct = dist > 0 ? ((rs.moderate_miles || 0) / dist) * 100 : 0;
  const highPct = dist > 0 ? ((rs.high_miles || 0) / dist) * 100 : 0;
  const severePct = dist > 0 ? ((rs.severe_miles || 0) / dist) * 100 : 0;
  const noTravelPct = dist > 0 ? ((rs.no_travel_miles || 0) / dist) * 100 : 0;
  const hasCriticalHazard = (rs.critical_severe_miles || 0) > 0;

  return (
    <div className="routes-comparison-compact">
      {/* 3 Route Switcher Selector (Horizontal Tabs / Pills) */}
      <div className="route-switcher-bar">
        {routes.map((route) => {
          const isSelected = route.id === selectedRouteId;
          const rHrs = Math.floor(route.duration_hours || 0);
          const rMins = Math.round(((route.duration_hours || 0) - rHrs) * 60);

          return (
            <button
              key={route.id}
              type="button"
              className={`route-tab-pill ${isSelected ? 'active' : ''}`}
              onClick={() => onSelectRoute(route.id)}
            >
              <div className="tab-pill-header">
                <span className="tab-pill-title">{route.name.replace(': Primary Interstate', '').replace(': Alternative Highway', ' Alt').replace(': Scenic Bypass', ' Bypass')}</span>
                {route.is_recommended && (
                  <span className="tab-pill-best">Best</span>
                )}
              </div>
              <div className="tab-pill-meta">
                <span className="tab-pill-time">{rHrs}h {rMins}m</span>
                <span className="tab-pill-dist">{route.distance_miles} mi</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Route Active Telemetry Card */}
      <div className="active-route-card">
        {/* Recommendation Rationale if recommended */}
        {activeRoute.is_recommended && (
          <div className="recommendation-callout-clean">
            <ShieldCheck size={16} color="#059669" style={{ flexShrink: 0, marginTop: 1 }} />
            <div className="callout-clean-text">
              <strong>Safest Corridor:</strong> {recommendationReason || activeRoute.recommendation_reason || "Zero severe weather miles detected along this corridor; saves travel time."}
            </div>
          </div>
        )}

        {/* High-Contrast Key Metrics Triad */}
        <div className="metrics-triad-clean">
          <div className="metric-box-clean">
            <div className="metric-label-clean">Distance</div>
            <div className="metric-val-clean">{dist.toLocaleString()} <span className="metric-unit">mi</span></div>
          </div>
          <div className="metric-box-clean">
            <div className="metric-label-clean">Drive Time</div>
            <div className="metric-val-clean">{hrs}h {mins}m</div>
          </div>
          <div className="metric-box-clean">
            <div className="metric-label-clean">Corridor Risk</div>
            <div
              className="metric-val-clean"
              style={{
                color: rs.average_risk_score > 3.0 ? '#dc2626' : rs.average_risk_score > 2.0 ? '#d97706' : '#059669',
              }}
            >
              {rs.average_risk_score ? rs.average_risk_score.toFixed(1) : '1.0'}<span className="metric-unit"> / 5</span>
            </div>
          </div>
        </div>

        {/* Stacked Risk Proportion Bar */}
        <div className="risk-progress-meta-clean">
          <span className="progress-title-clean">Risk Corridor Breakdown</span>
          <span className={`progress-hazard-clean ${hasCriticalHazard ? 'hazard' : 'safe'}`}>
            {rs.critical_severe_miles ? `${rs.critical_severe_miles} mi Severe/No-Travel` : '0 Severe Miles (Clear)'}
          </span>
        </div>
        <div className="risk-bar-clean">
          <div className="bar-part low" style={{ width: `${lowPct}%` }} title={`Low: ${rs.low_miles} mi`} />
          <div className="bar-part mod" style={{ width: `${modPct}%` }} title={`Moderate: ${rs.moderate_miles} mi`} />
          <div className="bar-part high" style={{ width: `${highPct}%` }} title={`High: ${rs.high_miles} mi`} />
          <div className="bar-part severe" style={{ width: `${severePct}%` }} title={`Severe: ${rs.severe_miles} mi`} />
          <div className="bar-part no-travel" style={{ width: `${noTravelPct}%` }} title={`No Travel: ${rs.no_travel_miles} mi`} />
        </div>

        {/* Load Warning Callout if present */}
        {rs.warnings_count > 0 && (
          <div className="load-warning-clean">
            <AlertTriangle size={13} color="#b91c1c" style={{ flexShrink: 0 }} />
            <span>{rs.warnings_count} Truck Load Safety Warnings along this route</span>
          </div>
        )}
      </div>
    </div>
  );
}
