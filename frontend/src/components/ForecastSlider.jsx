import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock, Layers, Wind, CloudRain, Snowflake } from 'lucide-react';

export default function ForecastSlider({
  currentHour,
  onChangeHour,
  activeLayerMode,
  onChangeLayerMode,
  showHeatmap,
  onToggleHeatmap,
}) {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setInterval(() => {
        onChangeHour((prev) => {
          if (prev >= 48) return 0;
          return prev + 1;
        });
      }, 650);
    }
    return () => clearInterval(timer);
  }, [isPlaying, onChangeHour]);

  return (
    <div className="forecast-dock">
      {/* Top Controls Row */}
      <div className="forecast-dock-top">
        {/* Playback Controls */}
        <div className="playback-group">
          <button
            type="button"
            className={`btn-dock-icon ${isPlaying ? 'active' : ''}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? 'Pause corridor timeline' : 'Auto-play corridor forecast'}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            type="button"
            className="btn-dock-icon"
            onClick={() => {
              setIsPlaying(false);
              onChangeHour(0);
            }}
            title="Reset to departure time (T+0)"
          >
            <RotateCcw size={13} />
            <span>T+0</span>
          </button>
        </div>

        {/* Current Forecast Time Badge */}
        <div className="time-status-pill">
          <Clock size={13} color="#2563eb" />
          <span>
            {currentHour === 0 ? 'Departure (T+0h)' : `T+${currentHour}h Forecast`}
          </span>
        </div>

        {/* Weather Layer Switcher Pills */}
        <div className="layer-mode-group">
          <button
            type="button"
            className={`mode-btn ${activeLayerMode === 'risk' ? 'active' : ''}`}
            onClick={() => onChangeLayerMode('risk')}
          >
            Risk
          </button>
          <button
            type="button"
            className={`mode-btn ${activeLayerMode === 'wind' ? 'active' : ''}`}
            onClick={() => onChangeLayerMode('wind')}
          >
            <Wind size={11} /> Wind
          </button>
          <button
            type="button"
            className={`mode-btn ${activeLayerMode === 'rain' ? 'active' : ''}`}
            onClick={() => onChangeLayerMode('rain')}
          >
            <CloudRain size={11} /> Rain
          </button>
          <button
            type="button"
            className={`mode-btn ${activeLayerMode === 'snow' ? 'active' : ''}`}
            onClick={() => onChangeLayerMode('snow')}
          >
            <Snowflake size={11} /> Snow
          </button>

          <button
            type="button"
            className={`radar-toggle-btn ${showHeatmap ? 'active' : ''}`}
            onClick={onToggleHeatmap}
            title="Toggle corridor weather radar layer"
          >
            <Layers size={12} />
            <span>{showHeatmap ? 'Radar ON' : 'Radar OFF'}</span>
          </button>
        </div>
      </div>

      {/* Scrubber Slider */}
      <div className="forecast-slider-wrapper">
        <input
          type="range"
          className="dock-range-slider"
          min="0"
          max="48"
          step="1"
          value={currentHour}
          onChange={(e) => {
            setIsPlaying(false);
            onChangeHour(Number(e.target.value));
          }}
        />

        {/* Mile/Time tick markers */}
        <div className="dock-time-ticks">
          <span>Now (T+0h)</span>
          <span>+12h</span>
          <span>+24h (Day 2)</span>
          <span>+36h</span>
          <span>+48h</span>
        </div>
      </div>
    </div>
  );
}
