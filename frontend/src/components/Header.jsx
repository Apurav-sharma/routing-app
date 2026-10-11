import React from 'react';
import { Truck, CloudRain, ShieldCheck, Zap, LayoutDashboard, Home, ArrowRight } from 'lucide-react';

export default function Header({ currentView, onNavigate }) {
  return (
    <header className="app-header">
      <div className="brand-wrapper" style={{ cursor: 'pointer' }} onClick={() => onNavigate('home')}>
        <div className="brand-icon">
          <Truck size={20} color="#ffffff" />
        </div>
        <div>
          <h1 className="brand-title">Spotter AI</h1>
          <div className="brand-subtitle">Weather-Aware Freight Dispatch</div>
        </div>
      </div>

      {/* Center Nav Links */}
      <nav className="header-nav">
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className={`nav-tab-btn ${currentView === 'home' ? 'active' : ''}`}
        >
          <Home size={15} />
          <span>Home Overview</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className={`nav-tab-btn ${currentView === 'dashboard' ? 'active' : ''}`}
        >
          <LayoutDashboard size={15} />
          <span>Dispatch Router</span>
        </button>
      </nav>

      {/* Right Live Telemetry Indicator & Clean Action */}
      <div className="header-actions">
        <div className="live-status-pill">
          <span className="live-pulse-dot" />
          <span>48h Forecast Active</span>
        </div>

        {currentView === 'home' ? (
          <button
            type="button"
            className="btn-header-cta"
            onClick={() => onNavigate('dashboard')}
          >
            <span>Launch Router</span>
            <ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn-header-secondary"
            onClick={() => onNavigate('home')}
          >
            <span>Portal Home</span>
          </button>
        )}
      </div>
    </header>
  );
}
