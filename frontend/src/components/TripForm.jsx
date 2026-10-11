import React, { useState } from 'react';
import { Navigation, Calendar, Scale, Gauge, ArrowRight, Sparkles, Loader2 } from 'lucide-react';

const PRESET_CORRIDORS = [
  { label: 'Chicago → Denver', origin: 'Chicago, IL', dest: 'Denver, CO' },
  { label: 'Cheyenne → Salt Lake City', origin: 'Cheyenne, WY', dest: 'Salt Lake City, UT' },
  { label: 'Dallas → Kansas City', origin: 'Dallas, TX', dest: 'Kansas City, MO' },
  { label: 'Atlanta → St. Louis', origin: 'Atlanta, GA', dest: 'St. Louis, MO' },
];

export default function TripForm({ onAnalyze, isLoading }) {
  const [origin, setOrigin] = useState('Chicago, IL');
  const [destination, setDestination] = useState('Denver, CO');
  
  // Format current local datetime for datetime-local input
  const getInitialDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [departureTime, setDepartureTime] = useState(getInitialDateTime());
  const [loadWeight, setLoadWeight] = useState(42000); // 42,000 lbs (activates the >40k rule)
  const [sampleInterval, setSampleInterval] = useState(25); // 25 miles default

  const handleApplyPreset = (preset) => {
    setOrigin(preset.origin);
    setDestination(preset.dest);
  };

  const handleAdjustHours = (hours) => {
    const d = new Date();
    d.setHours(d.getHours() + hours);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setDepartureTime(d.toISOString().slice(0, 16));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;

    onAnalyze({
      origin: origin.trim(),
      destination: destination.trim(),
      departure_time: new Date(departureTime).toISOString(),
      load_weight: Number(loadWeight),
      sample_interval: Number(sampleInterval),
    });
  };

  const isOver30k = loadWeight > 30000;
  const isOver40k = loadWeight > 40000;

  return (
    <form className="card-section" onSubmit={handleSubmit}>
      <div className="section-title">
        <Navigation size={16} color="#2563eb" />
        <span>Trip Configuration</span>
      </div>

      {/* Origin Input */}
      <div className="form-group">
        <label className="form-label">
          <span>Origin Location</span>
          <span className="form-hint">City, State or Hub</span>
        </label>
        <input
          type="text"
          className="input-field"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          placeholder="e.g. Chicago, IL"
          required
        />
      </div>

      {/* Destination Input */}
      <div className="form-group">
        <label className="form-label">
          <span>Destination Location</span>
          <span className="form-hint">Delivery Target</span>
        </label>
        <input
          type="text"
          className="input-field"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          placeholder="e.g. Denver, CO"
          required
        />
      </div>

      {/* Corridor Presets */}
      <div className="form-group">
        <span className="form-hint" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <Sparkles size={12} /> Popular Freight Corridors:
        </span>
        <div className="preset-chips">
          {PRESET_CORRIDORS.map((p, idx) => (
            <button
              key={idx}
              type="button"
              className="preset-chip"
              onClick={() => handleApplyPreset(p)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Departure Date/Time */}
      <div className="form-group">
        <label className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={14} /> Departure Date & Time
          </span>
        </label>
        <input
          type="datetime-local"
          className="input-field"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          required
        />
        <div className="preset-chips" style={{ marginTop: '6px' }}>
          <button type="button" className="preset-chip" onClick={() => handleAdjustHours(0)}>Now</button>
          <button type="button" className="preset-chip" onClick={() => handleAdjustHours(3)}>+3 Hours</button>
          <button type="button" className="preset-chip" onClick={() => handleAdjustHours(12)}>+12 Hours</button>
          <button type="button" className="preset-chip" onClick={() => handleAdjustHours(24)}>+24 Hours</button>
        </div>
      </div>

      {/* Load Weight */}
      <div className="form-group">
        <div className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Scale size={14} /> Truck Load Weight
          </span>
          <span style={{ color: '#2563eb', fontWeight: 700 }}>
            {Number(loadWeight).toLocaleString()} lbs
          </span>
        </div>
        <div className="weight-slider-wrapper">
          <input
            type="range"
            className="range-slider"
            min="10000"
            max="80000"
            step="1000"
            value={loadWeight}
            onChange={(e) => setLoadWeight(Number(e.target.value))}
          />
        </div>

        {/* Load rule vulnerability alerts */}
        {isOver40k ? (
          <div className="weight-callout severe-active">
            ⚠️ <strong>Heavy Payload ({Number(loadWeight).toLocaleString()} lb &gt; 40k lb):</strong> 35–44 mph winds escalate from High to <strong>SEVERE</strong>.
          </div>
        ) : isOver30k ? (
          <div className="weight-callout">
            ℹ️ <strong>Standard Payload ({Number(loadWeight).toLocaleString()} lb &gt; 30k lb):</strong> 45–54 mph winds escalate to <strong>NO TRAVEL</strong>.
          </div>
        ) : (
          <div className="weight-callout" style={{ color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }}>
            ✓ Light payload (&le; 30,000 lb): Standard wind threshold matrix applied.
          </div>
        )}
      </div>

      {/* Sampling Resolution Interval */}
      <div className="form-group">
        <label className="form-label">
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Gauge size={14} /> Weather Sampling Interval
          </span>
          <span className="form-hint">Checkpoint Frequency</span>
        </label>
        <div className="interval-selector">
          {[10, 25, 50].map((val) => (
            <button
              key={val}
              type="button"
              className={`interval-btn ${sampleInterval === val ? 'active' : ''}`}
              onClick={() => setSampleInterval(val)}
            >
              Every {val} mi
            </button>
          ))}
        </div>
      </div>

      {/* Submit Button */}
      <button type="submit" className="btn-primary" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>Analyzing Weather Corridors...</span>
          </>
        ) : (
          <>
            <span>Analyze Safe Routes</span>
            <ArrowRight size={18} />
          </>
        )}
      </button>
    </form>
  );
}
