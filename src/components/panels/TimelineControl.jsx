/**
 * OceanView — Sleek Floating Timeline & Integrated Depth Control
 * Replaces the giant permanent timeline dock with a calm, compact floating scrubber
 * integrating step buttons, date/hour scrubber, and a contextual Depth ▾ dropdown.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight, ChevronDown, Check, ArrowDownCircle, Clock } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { DATASET_CAPABILITIES } from '../../engine/index.js';

const FORECAST_DAYS = [
  { id: 0, label: '11 Sep', full: 'Fri 11 Sep 2026', iso: '2026-09-11' },
  { id: 1, label: '12 Sep', full: 'Sat 12 Sep 2026', iso: '2026-09-12' },
  { id: 2, label: '13 Sep', full: 'Sun 13 Sep 2026', iso: '2026-09-13' },
  { id: 3, label: '14 Sep', full: 'Mon 14 Sep 2026', iso: '2026-09-14' },
  { id: 4, label: '15 Sep', full: 'Tue 15 Sep 2026', iso: '2026-09-15' },
  { id: 5, label: '16 Sep', full: 'Wed 16 Sep 2026', iso: '2026-09-16' },
  { id: 6, label: '17 Sep', full: 'Thu 17 Sep 2026', iso: '2026-09-17' },
  { id: 7, label: '18 Sep', full: 'Fri 18 Sep 2026', iso: '2026-09-18' },
];

const FORECAST_HOURS = ['08:00', '11:00', '14:00', '17:00', '20:00', '23:00'];

export default function TimelineControl() {
  const {
    activeVariable,
    activeDepthMeters,
    setActiveDepthMeters,
    scientificSelection,
    setScientificSelection,
    isPlayingTimeline,
    setIsPlayingTimeline,
  } = useOceanView();

  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [activeHourIdx, setActiveHourIdx] = useState(2); // '14:00'
  const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
  const [isDepthDropdownOpen, setIsDepthDropdownOpen] = useState(false);

  const containerRef = useRef(null);

  const caps = DATASET_CAPABILITIES[activeVariable];
  const depthLevels = caps?.supportedDepths || [0, 5, 10, 25, 50, 100, 200, 500];

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsTimeDropdownOpen(false);
        setIsDepthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Auto-advance timeline during playback
  useEffect(() => {
    if (!isPlayingTimeline) return;
    const timer = setInterval(() => {
      setActiveHourIdx((prevH) => {
        if (prevH < FORECAST_HOURS.length - 1) {
          return prevH + 1;
        } else {
          setActiveDayIdx((prevD) => (prevD + 1) % FORECAST_DAYS.length);
          return 0;
        }
      });
    }, 1200);
    return () => clearInterval(timer);
  }, [isPlayingTimeline]);

  // Step -3h
  const handleStepMinus3 = () => {
    if (activeHourIdx > 0) {
      setActiveHourIdx((prev) => prev - 1);
    } else {
      setActiveDayIdx((prev) => (prev > 0 ? prev - 1 : FORECAST_DAYS.length - 1));
      setActiveHourIdx(FORECAST_HOURS.length - 1);
    }
  };

  // Step +3h
  const handleStepPlus3 = () => {
    if (activeHourIdx < FORECAST_HOURS.length - 1) {
      setActiveHourIdx((prev) => prev + 1);
    } else {
      setActiveDayIdx((prev) => (prev + 1) % FORECAST_DAYS.length);
      setActiveHourIdx(0);
    }
  };

  const currentDay = FORECAST_DAYS[activeDayIdx] || FORECAST_DAYS[0];
  const currentHour = FORECAST_HOURS[activeHourIdx] || FORECAST_HOURS[0];
  const progressRatio = (activeDayIdx + activeHourIdx / FORECAST_HOURS.length) / FORECAST_DAYS.length;

  return (
    <div ref={containerRef} className="oceanview-timeline-dock">
      {/* Left: Step & Play Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
        <button
          onClick={handleStepMinus3}
          className="btn-sci"
          style={{ width: '28px', height: '28px', padding: 0 }}
          title="Step Backward 3 Hours"
        >
          <ChevronLeft style={{ width: '15px', height: '15px' }} />
        </button>

        <button
          onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
          className={`btn-sci ${isPlayingTimeline ? 'btn-sci-active' : ''}`}
          style={{ width: '30px', height: '30px', padding: 0 }}
          title={isPlayingTimeline ? 'Pause Timeline' : 'Play Timeline'}
        >
          {isPlayingTimeline ? (
            <Pause style={{ width: '13px', height: '13px' }} />
          ) : (
            <Play style={{ width: '13px', height: '13px', marginLeft: '2px' }} />
          )}
        </button>

        <button
          onClick={handleStepPlus3}
          className="btn-sci"
          style={{ width: '28px', height: '28px', padding: 0 }}
          title="Step Forward 3 Hours"
        >
          <ChevronRight style={{ width: '15px', height: '15px' }} />
        </button>
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

      {/* Center: Current Timestamp & Time Dropdown */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setIsTimeDropdownOpen(!isTimeDropdownOpen);
            setIsDepthDropdownOpen(false);
          }}
          className={`btn-sci ${isTimeDropdownOpen ? 'btn-sci-active' : ''}`}
          style={{
            padding: '4px 10px',
            gap: '6px',
            background: 'transparent',
            border: 'none',
          }}
          title="Select Forecast Date & Time"
        >
          <Clock style={{ width: '13px', height: '13px', color: 'var(--accent-teal)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            {currentDay.label} · {currentHour} UTC
          </span>
          <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
        </button>

        {isTimeDropdownOpen && (
          <div
            className="sci-dropdown-menu"
            style={{
              bottom: 'calc(100% + 8px)',
              top: 'auto',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '260px',
            }}
          >
            <div className="sci-dropdown-header">Forecast Date & Time</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', padding: '8px' }}>
              {FORECAST_DAYS.map((day, idx) => (
                <button
                  key={day.id}
                  onClick={() => {
                    setActiveDayIdx(idx);
                    setIsTimeDropdownOpen(false);
                  }}
                  className={`btn-sci ${activeDayIdx === idx ? 'btn-sci-active' : ''}`}
                  style={{ padding: '5px 2px', fontSize: '10px' }}
                >
                  {day.label}
                </button>
              ))}
            </div>

            <div className="sci-dropdown-divider" />
            <div className="sci-dropdown-header">Synoptic Step (Hour)</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px', padding: '8px' }}>
              {FORECAST_HOURS.map((hr, idx) => (
                <button
                  key={hr}
                  onClick={() => {
                    setActiveHourIdx(idx);
                    setIsTimeDropdownOpen(false);
                  }}
                  className={`btn-sci ${activeHourIdx === idx ? 'btn-sci-active' : ''}`}
                  style={{ padding: '5px 2px', fontSize: '10px' }}
                >
                  {hr}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mini Scrubber Track */}
      <div
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickFrac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const totalSteps = FORECAST_DAYS.length * FORECAST_HOURS.length;
          const targetStep = Math.floor(clickFrac * totalSteps);
          setActiveDayIdx(Math.floor(targetStep / FORECAST_HOURS.length));
          setActiveHourIdx(targetStep % FORECAST_HOURS.length);
        }}
        style={{
          width: '200px',
          height: '4px',
          background: 'rgba(52, 56, 54, 0.7)',
          borderRadius: '2px',
          position: 'relative',
          cursor: 'pointer',
        }}
        title="Click to scrub through 8-day timeline"
      >
        {/* Progress fill */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: `${Math.min(100, Math.max(0, progressRatio * 100))}%`,
            background: 'var(--accent-teal)',
            borderRadius: '2px',
          }}
        />

        {/* Moving playhead thumb */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${progressRatio * 100}% - 4px)`,
            top: '-3px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: 'var(--text-primary)',
            boxShadow: '0 0 6px rgba(0,0,0,0.8)',
          }}
        />
      </div>

      <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

      {/* Integrated Depth Dropdown (Replaces separate depth slider) */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={() => {
            setIsDepthDropdownOpen(!isDepthDropdownOpen);
            setIsTimeDropdownOpen(false);
          }}
          className={`btn-sci ${isDepthDropdownOpen ? 'btn-sci-active' : ''}`}
          style={{
            padding: '4px 10px',
            gap: '6px',
            background: 'transparent',
            border: 'none',
          }}
          title="Select Ocean Depth Layer"
        >
          <ArrowDownCircle style={{ width: '13px', height: '13px', color: 'var(--accent-amber)' }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Depth: {activeDepthMeters === 0 ? 'Surface' : `-${activeDepthMeters}m`}
          </span>
          <ChevronDown style={{ width: '12px', height: '12px', color: 'var(--text-muted)' }} />
        </button>

        {isDepthDropdownOpen && (
          <div
            className="sci-dropdown-menu"
            style={{
              bottom: 'calc(100% + 8px)',
              top: 'auto',
              right: 0,
              width: '160px',
            }}
          >
            <div className="sci-dropdown-header">Ocean Depth Layer</div>
            {depthLevels.map((depth) => {
              const isSelected = activeDepthMeters === depth;
              return (
                <button
                  key={depth}
                  onClick={() => {
                    setActiveDepthMeters(depth);
                    setIsDepthDropdownOpen(false);
                  }}
                  className={`sci-dropdown-item ${isSelected ? 'active' : ''}`}
                >
                  <span>{depth === 0 ? 'Surface (0m)' : `-${depth}m`}</span>
                  {isSelected && <Check style={{ width: '12px', height: '12px', color: 'var(--accent-teal)' }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
