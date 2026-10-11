import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomePage from './components/HomePage';
import TripForm from './components/TripForm';
import RouteComparison from './components/RouteComparison';
import TruckMap from './components/TruckMap';
import ForecastSlider from './components/ForecastSlider';
import CheckpointDrawer from './components/CheckpointDrawer';
import { AlertCircle, SlidersHorizontal, Map, ArrowRight, ChevronLeft, ChevronRight, Edit3 } from 'lucide-react';

const API_BASE = '/api';

export default function App() {
  const [currentView, setCurrentView] = useState('home'); // 'home' or 'dashboard'
  const [routes, setRoutes] = useState([]);
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  const [corridorHeatmap, setCorridorHeatmap] = useState([]);
  const [currentHour, setCurrentHour] = useState(0);
  const [activeLayerMode, setActiveLayerMode] = useState('risk');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [recommendationReason, setRecommendationReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const [activePanelMode, setActivePanelMode] = useState('routes'); // 'routes' or 'edit_trip'

  const [tripParams, setTripParams] = useState({
    origin: 'Chicago, IL',
    destination: 'Denver, CO',
    load_weight: 42000,
    sample_interval: 25,
  });

  const fetchAnalysis = async (params) => {
    setIsLoading(true);
    setError(null);
    setTripParams(params);
    try {
      const resp = await fetch(`${API_BASE}/routes/analyze/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        throw new Error(errData.error || `Failed with status ${resp.status}`);
      }

      const data = await resp.json();
      setRoutes(data.routes || []);
      setSelectedRouteId(data.recommended_route_id || (data.routes && data.routes[0]?.id));
      setCorridorHeatmap(data.corridor_heatmap || []);
      setRecommendationReason(data.recommendation_reason || '');
      setCurrentHour(0);
      setActivePanelMode('routes'); // Return to routes view upon successful analysis
      setIsPanelCollapsed(false);
    } catch (err) {
      console.error('Route analysis error:', err);
      setError(err.message || 'An error occurred while analyzing routes.');
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fetch initial route on launch in the background
  useEffect(() => {
    fetchAnalysis({
      origin: 'Chicago, IL',
      destination: 'Denver, CO',
      departure_time: new Date().toISOString(),
      load_weight: 42000,
      sample_interval: 25,
    });
  }, []);

  const handleLaunchDashboard = (customParams = null) => {
    setCurrentView('dashboard');
    if (customParams) {
      fetchAnalysis(customParams);
    } else if (routes.length === 0) {
      fetchAnalysis(tripParams);
    }
  };

  const activeRoute = routes.find((r) => r.id === selectedRouteId) || routes[0];

  return (
    <div className="app-container">
      <Header currentView={currentView} onNavigate={setCurrentView} />

      {currentView === 'home' ? (
        <HomePage onLaunchDashboard={handleLaunchDashboard} />
      ) : (
        <main className="dashboard-fullscreen-layout">
          {/* Full-Bleed Map Viewport (Background) */}
          <div className="map-fullscreen-canvas">
            <TruckMap
              routes={routes}
              selectedRouteId={selectedRouteId}
              onSelectRoute={(id) => setSelectedRouteId(id)}
              corridorHeatmap={corridorHeatmap}
              currentHour={currentHour}
              activeLayerMode={activeLayerMode}
              showHeatmap={showHeatmap}
            />

            {/* Floating 0-48h Forecast Scrubber Dock */}
            {corridorHeatmap && corridorHeatmap.length > 0 && (
              <ForecastSlider
                currentHour={currentHour}
                onChangeHour={setCurrentHour}
                activeLayerMode={activeLayerMode}
                onChangeLayerMode={setActiveLayerMode}
                showHeatmap={showHeatmap}
                onToggleHeatmap={() => setShowHeatmap(!showHeatmap)}
              />
            )}
          </div>

          {/* Collapsed Pill Trigger (When panel is minimized) */}
          {isPanelCollapsed && (
            <button
              type="button"
              className="collapsed-dispatch-trigger"
              onClick={() => setIsPanelCollapsed(false)}
            >
              <div className="trigger-dot" />
              <span>{tripParams.origin} ➔ {tripParams.destination}</span>
              {activeRoute && <span className="trigger-time">({Math.floor(activeRoute.duration_hours || 0)}h)</span>}
              <ChevronRight size={16} />
            </button>
          )}

          {/* Floating Left Dispatch Control Card */}
          {!isPanelCollapsed && (
            <aside className="floating-dispatch-card">
              {/* Card Header: Corridor Strip & Collapse Toggle */}
              <div className="dispatch-card-header">
                <div className="corridor-summary">
                  <div className="corridor-title-row">
                    <span className="corridor-cities">
                      {tripParams.origin} <ArrowRight size={13} style={{ display: 'inline', margin: '0 4px', verticalAlign: 'middle', color: '#64748b' }} /> {tripParams.destination}
                    </span>
                  </div>
                  <div className="corridor-meta-row">
                    <span>⚖️ {Number(tripParams.load_weight).toLocaleString()} lbs</span>
                    <span>•</span>
                    <span>📍 Every {tripParams.sample_interval} mi</span>
                  </div>
                </div>

                <div className="dispatch-header-actions">
                  {activePanelMode === 'routes' ? (
                    <button
                      type="button"
                      className="btn-header-icon-action"
                      onClick={() => setActivePanelMode('edit_trip')}
                      title="Edit trip inputs"
                    >
                      <Edit3 size={14} />
                      <span>Edit</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn-header-icon-action"
                      onClick={() => setActivePanelMode('routes')}
                      title="Back to route options"
                    >
                      <span>Routes</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn-collapse-toggle"
                    onClick={() => setIsPanelCollapsed(true)}
                    title="Minimize panel to view full map"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>

              {/* Error Message if any */}
              {error && (
                <div className="dispatch-error-alert">
                  <AlertCircle size={16} color="#dc2626" />
                  <span>{error}</span>
                </div>
              )}

              {/* Scrollable Card Body */}
              <div className="dispatch-card-body">
                {activePanelMode === 'edit_trip' ? (
                  <TripForm onAnalyze={fetchAnalysis} isLoading={isLoading} />
                ) : (
                  <>
                    {isLoading ? (
                      <div className="dispatch-loading-box">
                        <div className="loading-spinner-ring" />
                        <div className="loading-title">Calculating Safest Routes...</div>
                        <div className="loading-sub">
                          Evaluating weather along checkpoint arrival ETAs & truck payload safety matrix.
                        </div>
                      </div>
                    ) : routes.length > 0 ? (
                      <>
                        <RouteComparison
                          routes={routes}
                          selectedRouteId={selectedRouteId}
                          onSelectRoute={(id) => setSelectedRouteId(id)}
                          recommendationReason={recommendationReason}
                        />
                        <CheckpointDrawer activeRoute={activeRoute} />
                      </>
                    ) : (
                      <div className="empty-routes-box">
                        <p>No routes generated yet.</p>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => setActivePanelMode('edit_trip')}
                        >
                          Configure Trip
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </aside>
          )}
        </main>
      )}
    </div>
  );
}
