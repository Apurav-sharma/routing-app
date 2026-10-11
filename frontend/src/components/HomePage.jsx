import React from 'react';
import { 
  Truck, 
  ShieldCheck, 
  CloudRain, 
  Wind, 
  Snowflake, 
  ArrowRight, 
  Compass, 
  Clock, 
  Scale, 
  MapPin, 
  Zap, 
  CheckCircle2, 
  Layers, 
  AlertTriangle,
  Flame,
  ChevronRight
} from 'lucide-react';

const QUICK_CORRIDORS = [
  {
    name: "I-80 Midwest Corridor",
    origin: "Chicago, IL",
    dest: "Denver, CO",
    weight: 42000,
    interval: 25,
    tag: "High Crosswinds Zone",
    desc: "Plains corridor vulnerable to gust fronts and sudden snowsqualls.",
    tagColor: "#f59e0b"
  },
  {
    name: "Rockies Mountain Pass",
    origin: "Cheyenne, WY",
    dest: "Salt Lake City, UT",
    weight: 38000,
    interval: 10,
    tag: "Mountain Elevation & Snow",
    desc: "Steep mountain passes with high-risk snowfall gradients.",
    tagColor: "#3b82f6"
  },
  {
    name: "South Central Arterial",
    origin: "Dallas, TX",
    dest: "Kansas City, MO",
    weight: 45000,
    interval: 25,
    tag: "Heavy Payload Crosswind",
    desc: "Evaluates >40k lb payload vulnerability in Plains wind shear.",
    tagColor: "#ef4444"
  },
  {
    name: "Midwest-Southeast Express",
    origin: "Atlanta, GA",
    dest: "St. Louis, MO",
    weight: 28000,
    interval: 50,
    tag: "Heavy Rain & Hydroplane",
    desc: "Light payload corridor tested against heavy precipitation.",
    tagColor: "#10b981"
  }
];

export default function HomePage({ onLaunchDashboard }) {
  const scrollToMatrix = () => {
    const el = document.getElementById('safety-matrix-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="home-page-container">
      {/* Hero Section */}
      <section className="home-hero-section">
        <div className="hero-content">
          <div className="hero-badge">
            <span className="hero-badge-dot" />
            <span className="hero-badge-text">Next-Gen Commercial Freight Safety Intelligence</span>
          </div>

          <h1 className="hero-heading">
            Intelligent Weather-Aware <span className="gradient-text">Truck Routing</span> for Commercial Fleets
          </h1>

          <p className="hero-subheading">
            Dynamically analyze 3 highway corridor alternatives against micro-weather forecasts, truck load weight vulnerability, and travel time. Protect drivers, prevent blowovers, and cut delays with zero paid APIs.
          </p>

          <div className="hero-actions">
            <button 
              type="button" 
              className="btn-hero-primary"
              onClick={() => onLaunchDashboard()}
            >
              <span>Launch Dispatch Dashboard</span>
              <ArrowRight size={18} />
            </button>
            <button 
              type="button" 
              className="btn-hero-secondary"
              onClick={scrollToMatrix}
            >
              <ShieldCheck size={18} color="#2563eb" />
              <span>Safety Thresholds Matrix</span>
            </button>
          </div>

          {/* Quick Stats Grid */}
          <div className="hero-stats-banner">
            <div className="hero-stat-card">
              <div className="hero-stat-num">3 Options</div>
              <div className="hero-stat-desc">Parallel OSRM Corridors</div>
            </div>
            <div className="hero-stat-card">
              <div className="hero-stat-num">10 / 25 / 50 mi</div>
              <div className="hero-stat-desc">Weather Sampling Resolution</div>
            </div>
            <div className="hero-stat-card">
              <div className="hero-stat-num">0–48 Hours</div>
              <div className="hero-stat-desc">Hourly ETA Forecast Heatmap</div>
            </div>
            <div className="hero-stat-card">
              <div className="hero-stat-num">$0.00 / mo</div>
              <div className="hero-stat-desc">Zero Paid API Overhead</div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Corridors Section */}
      <section className="home-section">
        <div className="section-header-centered">
          <div className="section-eyebrow">Instant Corridor Testing</div>
          <h2 className="section-headline">One-Click Freight Corridor Analysis</h2>
          <p className="section-subtext">
            Test real-world freight corridors with pre-configured payload weights and weather sampling resolutions.
          </p>
        </div>

        <div className="quick-corridors-grid">
          {QUICK_CORRIDORS.map((corridor, idx) => (
            <div 
              key={idx} 
              className="corridor-card"
              onClick={() => onLaunchDashboard({
                origin: corridor.origin,
                destination: corridor.dest,
                load_weight: corridor.weight,
                sample_interval: corridor.interval,
                departure_time: new Date().toISOString()
              })}
            >
              <div className="corridor-card-header">
                <span 
                  className="corridor-tag" 
                  style={{ background: `${corridor.tagColor}15`, color: corridor.tagColor, borderColor: `${corridor.tagColor}35` }}
                >
                  {corridor.tag}
                </span>
                <span className="corridor-interval-pill">Every {corridor.interval} mi</span>
              </div>

              <h3 className="corridor-title">{corridor.name}</h3>

              <div className="corridor-route-strip">
                <span className="route-terminal">{corridor.origin}</span>
                <ArrowRight size={14} color="#94a3b8" />
                <span className="route-terminal">{corridor.dest}</span>
              </div>

              <p className="corridor-desc">{corridor.desc}</p>

              <div className="corridor-card-footer">
                <span className="corridor-weight-label">
                  ⚖️ <strong>{corridor.weight.toLocaleString()} lbs</strong> Payload
                </span>
                <span className="corridor-launch-btn">
                  Analyze <ChevronRight size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / Core Architecture */}
      <section className="home-section bg-subtle">
        <div className="section-header-centered">
          <div className="section-eyebrow">Engine Architecture</div>
          <h2 className="section-headline">How Weather-Aware Routing Works</h2>
          <p className="section-subtext">
            An automated end-to-end pipeline connecting open spatial routing, micro-meteorology, and vehicular mechanics.
          </p>
        </div>

        <div className="workflow-steps-grid">
          <div className="workflow-step-card">
            <div className="step-number">01</div>
            <div className="step-icon-wrap" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Compass size={24} />
            </div>
            <h3 className="step-title">3-Route Generation</h3>
            <p className="step-text">
              Generates up to 3 distinct highway corridors between origin and destination using the Open Source Routing Machine (OSRM).
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-number">02</div>
            <div className="step-icon-wrap" style={{ background: '#ecfdf5', color: '#059669' }}>
              <Clock size={24} />
            </div>
            <h3 className="step-title">Spatial ETA Sampling</h3>
            <p className="step-text">
              Resamples route polyline at exact 10, 25, or 50-mile intervals and interpolates the truck's exact estimated arrival time at each checkpoint.
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-number">03</div>
            <div className="step-icon-wrap" style={{ background: '#fffbeb', color: '#d97706' }}>
              <CloudRain size={24} />
            </div>
            <h3 className="step-title">Open-Meteo Weather</h3>
            <p className="step-text">
              Fetches hourly wind speed (mph), rain rate (in/hr), snowfall, and temperature matching checkpoint arrival times without paid API limits.
            </p>
          </div>

          <div className="workflow-step-card">
            <div className="step-number">04</div>
            <div className="step-icon-wrap" style={{ background: '#fef2f2', color: '#dc2626' }}>
              <Scale size={24} />
            </div>
            <h3 className="step-title">Payload Vulnerability</h3>
            <p className="step-text">
              Evaluates gross payload weight against wind shear thresholds and ranks routes according to the 4-tier recommendation hierarchy.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Matrix Section */}
      <section id="safety-matrix-section" className="home-section">
        <div className="section-header-centered">
          <div className="section-eyebrow">Risk Classification System</div>
          <h2 className="section-headline">Standard Weather & Payload Safety Matrix</h2>
          <p className="section-subtext">
            Official evaluation criteria applied to every checkpoint along the corridor.
          </p>
        </div>

        <div className="matrix-table-container">
          <table className="matrix-table">
            <thead>
              <tr>
                <th>Condition</th>
                <th className="th-low">Low Risk (1)</th>
                <th className="th-mod">Moderate Risk (2)</th>
                <th className="th-high">High Risk (3)</th>
                <th className="th-severe">Severe Risk (4)</th>
                <th className="th-notravel">No Travel (5)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Wind Speed</strong></td>
                <td>&lt; 25 mph</td>
                <td>25 – 34 mph</td>
                <td>35 – 44 mph</td>
                <td>45 – 54 mph</td>
                <td>&ge; 55 mph</td>
              </tr>
              <tr>
                <td><strong>Rain Intensity</strong></td>
                <td>&lt; 0.10 in/hr</td>
                <td>0.10 – 0.25 in/hr</td>
                <td>0.25 – 0.50 in/hr</td>
                <td>0.50 – 1.00 in/hr</td>
                <td>&gt; 1.00 in/hr</td>
              </tr>
              <tr>
                <td><strong>Snowfall Rate</strong></td>
                <td>&lt; 0.5 in/hr</td>
                <td>0.5 – 1.0 in/hr</td>
                <td>1.0 – 2.0 in/hr</td>
                <td>2.0 – 3.0 in/hr</td>
                <td>&gt; 3.0 in/hr</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Load Rules Highlight Banner */}
        <div className="load-rules-hero-grid">
          <div className="load-rule-box alert-no-travel">
            <div className="rule-box-header">
              <AlertTriangle size={18} />
              <span>Universal Rule: Extreme Wind</span>
            </div>
            <div className="rule-box-condition">&ge; 55 mph Wind</div>
            <div className="rule-box-action">&rarr; Mandatory NO TRAVEL for all trucks regardless of payload weight.</div>
          </div>

          <div className="load-rule-box alert-severe-travel">
            <div className="rule-box-header">
              <Scale size={18} />
              <span>Blowover Vulnerability Rule</span>
            </div>
            <div className="rule-box-condition">45–54 mph Wind + &gt;30,000 lbs</div>
            <div className="rule-box-action">&rarr; Overrides Severe to NO TRAVEL due to high crosswind blowover hazard.</div>
          </div>

          <div className="load-rule-box alert-heavy-payload">
            <div className="rule-box-header">
              <Truck size={18} />
              <span>Heavy Payload Steering Rule</span>
            </div>
            <div className="rule-box-condition">35–44 mph Wind + &gt;40,000 lbs</div>
            <div className="rule-box-action">&rarr; Overrides High to SEVERE due to reduced steering stability under heavy payload.</div>
          </div>
        </div>

        {/* 4-Tier Hierarchy */}
        <div className="hierarchy-card">
          <div className="hierarchy-header">
            <ShieldCheck size={20} color="#059669" />
            <h3 className="hierarchy-title">4-Tier Route Recommendation Hierarchy</h3>
          </div>
          <div className="hierarchy-steps">
            <div className="hierarchy-step">
              <span className="step-badge">Priority 1</span>
              <span className="step-desc">Fewest Severe &amp; No-Travel miles (safety first)</span>
            </div>
            <div className="hierarchy-step">
              <span className="step-badge">Priority 2</span>
              <span className="step-desc">Fewest High Risk miles</span>
            </div>
            <div className="hierarchy-step">
              <span className="step-badge">Priority 3</span>
              <span className="step-desc">Lowest weighted average corridor risk</span>
            </div>
            <div className="hierarchy-step">
              <span className="step-badge">Priority 4</span>
              <span className="step-desc">Shortest overall travel duration</span>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="home-cta-section">
        <div className="cta-inner">
          <h2 className="cta-title">Ready to Plan a Weather-Safe Route?</h2>
          <p className="cta-subtitle">
            Experience real-time interactive routing with 0–48 hour weather forecasts and dynamic corridor heatmaps.
          </p>
          <button 
            type="button" 
            className="btn-hero-primary"
            onClick={() => onLaunchDashboard()}
          >
            <span>Open Dispatch Dashboard</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="footer-logo">
              <Truck size={20} color="#ffffff" />
            </div>
            <div>
              <div className="footer-title">Spotter Weather-Aware Truck Router</div>
              <div className="footer-subtitle">Autonomous Freight Corridors & Micro-Meteorology</div>
            </div>
          </div>
          <div className="footer-meta">
            <span>React 19 • Django 6.1 • OSRM • Open-Meteo • Esri World Street</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
