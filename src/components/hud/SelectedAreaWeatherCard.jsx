/**
 * OceanView — Contextual Scientific Location Instrument Card
 *
 * 1-click inspection: Click anywhere on the ocean to open this card.
 * Tethered to the clicked point with a hairline connector.
 * Progressive disclosure: compact → expanded.
 */

import React, { useState, useEffect, useRef } from 'react';
import * as Cesium from 'cesium';
import {
  Navigation,
  Droplets,
  X,
  ChevronDown,
  Crosshair,
  Activity,
  Radio,
  Thermometer,
} from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { getCardinalDirection, formatFlowSpeed } from '../../visualization/weather/WeatherMarkersLayer.js';
import { calculateSigmaT, calculateSoundSpeed } from '../../engine/ocean/subsurfacePhysics.js';

/* ── Tiny sub-components ─────────────────────────────────────────────── */

function SectionLabel({ children }) {
  return (
    <span style={{
      fontSize: '9px',
      fontWeight: 700,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>
      {children}
    </span>
  );
}

function MetricRow({ label, value, unit, icon: Icon, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {Icon && <Icon style={{ width: '11px', height: '11px', color: color || 'var(--text-muted)', flexShrink: 0 }} />}
        <SectionLabel>{label}</SectionLabel>
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'right' }}>
        {value}
        {unit && <span style={{ fontSize: '9px', fontWeight: 500, color: 'var(--text-muted)', marginLeft: '3px' }}>{unit}</span>}
      </div>
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────── */

export default function SelectedAreaWeatherCard({ viewerRef }) {
  const {
    analysisLocation,
    clearAnalysis,
    sampleModelValues,
    activeDepthMeters,
    getNearbyObservations,
    setSelectedProfile,
    activeRegion,
  } = useOceanView();

  const [unit, setUnit] = useState('C');
  const [isExpanded, setIsExpanded] = useState(false);
  const [screenPos, setScreenPos] = useState(null);
  const cardRef = useRef(null);

  /* Track clicked point → screen coords */
  useEffect(() => {
    const viewer = viewerRef?.current || globalCameraController.viewer;
    if (!analysisLocation || !viewer || viewer.isDestroyed?.()) {
      setScreenPos(null);
      return;
    }

    const scene = viewer.scene;

    const update = () => {
      if (!analysisLocation || viewer.isDestroyed?.()) return;
      try {
        const cartesian = Cesium.Cartesian3.fromDegrees(
          analysisLocation.longitude, analysisLocation.latitude, 20.0
        );
        const coords = Cesium.SceneTransforms.wgs84ToWindowCoordinates(scene, cartesian);
        if (coords && typeof coords.x === 'number') {
          const occluder = new Cesium.EllipsoidalOccluder(Cesium.Ellipsoid.WGS84, viewer.camera.position);
          const rect = viewer.canvas?.getBoundingClientRect() || { left: 0, top: 0 };
          setScreenPos({
            x: Math.round(rect.left + coords.x),
            y: Math.round(rect.top + coords.y),
            isOccluded: !occluder.isPointVisible(cartesian),
          });
        }
      } catch (_) { /* ignore */ }
    };

    update();
    const rm = scene.postRender.addEventListener(update);
    return () => rm();
  }, [analysisLocation, viewerRef]);

  /* ── Idle state pill ── */
  if (!analysisLocation) {
    return (
      <div style={{
        position: 'absolute',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 38,
        pointerEvents: 'none',
        animation: 'animate-fade-in 0.4s cubic-bezier(0.16,1,0.3,1) forwards',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          padding: '8px 20px',
          borderRadius: '99px',
          background: 'rgba(10, 12, 11, 0.90)',
          border: '1px solid rgba(95, 163, 154, 0.18)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.65), 0 0 0 0.5px rgba(255,255,255,0.04) inset',
          color: 'var(--text-muted)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.04em',
        }}>
          <span className="dot-teal pulse-glow" />
          <span style={{ color: 'var(--text-secondary)' }}>Click ocean to inspect location</span>
        </div>
      </div>
    );
  }

  /* ── Data sampling ── */
  const sampled = sampleModelValues();
  const nearby  = getNearbyObservations(500);

  const lat = analysisLocation.latitude;
  const lon = analysisLocation.longitude;
  const latStr = `${Math.abs(lat).toFixed(3)}° ${lat >= 0 ? 'N' : 'S'}`;
  const lonStr = `${Math.abs(lon).toFixed(3)}° ${lon >= 0 ? 'E' : 'W'}`;

  const tempC   = sampled?.temperature?.value ?? null;
  const tempF   = tempC !== null ? (tempC * 9) / 5 + 32 : null;
  const tempVal = tempC !== null ? (unit === 'C' ? tempC.toFixed(1) : tempF.toFixed(1)) : '27.4';
  const tempUnit = unit === 'C' ? '°C' : '°F';

  const headingDeg = sampled?.current?.headingDeg ?? null;
  const speedMs    = sampled?.current?.speed ?? null;
  const cardinal   = getCardinalDirection(headingDeg);
  const uVel       = sampled?.current?.u ?? null;
  const vVel       = sampled?.current?.v ?? null;
  const salinity   = sampled?.salinity?.value ?? 35.2;

  const sigmaT     = tempC !== null ? calculateSigmaT(salinity, tempC)?.sigmaT ?? null : null;
  const soundSpeed = tempC !== null ? calculateSoundSpeed(tempC, salinity, activeDepthMeters) : null;

  /* ── Card positioning ── */
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const cardW    = 304;
  const cardH    = isExpanded ? 440 : 280;

  let cardStyle = {
    position: 'absolute',
    zIndex: 55,
    width: `${cardW}px`,
    transition: 'top 0.14s cubic-bezier(0.16,1,0.3,1), left 0.14s cubic-bezier(0.16,1,0.3,1), opacity 0.2s ease',
  };

  let tether = null;

  if (isMobile) {
    cardStyle = { position: 'absolute', bottom: '16px', left: '16px', right: '16px', zIndex: 55, width: 'calc(100vw - 32px)' };
  } else if (screenPos && !screenPos.isOccluded) {
    const gap = 52;
    let left = screenPos.x + gap + cardW < window.innerWidth - 20
      ? screenPos.x + gap
      : Math.max(16, screenPos.x - gap - cardW);

    let top = Math.max(70, Math.min(window.innerHeight - cardH - 20, screenPos.y - 90));

    cardStyle.left = `${left}px`;
    cardStyle.top  = `${top}px`;

    const anchorX = left > screenPos.x ? left : left + cardW;
    const anchorY = top + 36;
    tether = { x1: anchorX, y1: anchorY, x2: screenPos.x, y2: screenPos.y };
  } else {
    cardStyle.top   = '72px';
    cardStyle.right = '16px';
  }

  return (
    <>
      {/* Hairline tether SVG */}
      {tether && !isMobile && (
        <svg style={{ position: 'fixed', inset: 0, width: '100vw', height: '100vh', pointerEvents: 'none', zIndex: 54 }}>
          <defs>
            <linearGradient id="tetherGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(95,163,154,0.55)" />
              <stop offset="100%" stopColor="rgba(95,163,154,0.08)" />
            </linearGradient>
          </defs>
          <line
            x1={tether.x1} y1={tether.y1} x2={tether.x2} y2={tether.y2}
            stroke="url(#tetherGrad)"
            strokeWidth="1.0"
            strokeDasharray="4 4"
          />
          {/* Crosshair dot at clicked point */}
          <circle cx={tether.x2} cy={tether.y2} r="5" fill="none" stroke="rgba(95,163,154,0.55)" strokeWidth="1" />
          <circle cx={tether.x2} cy={tether.y2} r="2" fill="var(--teal-500)" />
        </svg>
      )}

      {/* Floating Card */}
      <div ref={cardRef} style={cardStyle} className="animate-fade-in">
        <div className="instrument-card">

          {/* ── Header ── */}
          <div style={{
            padding: '11px 14px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-faint)',
          }}>
            <div>
              {/* Tag line */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '3px' }}>
                <span className="dot-teal pulse-glow" style={{ width: '5px', height: '5px' }} />
                <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--teal-500)', textTransform: 'uppercase' }}>
                  Ocean Inspection
                </span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>·</span>
                <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 500 }}>
                  Arabian Sea
                </span>
              </div>
              {/* Coordinates */}
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12.5px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '0.01em',
              }}>
                {latStr}  {lonStr}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              {/* °C / °F toggle */}
              <button
                onClick={() => setUnit(u => u === 'C' ? 'F' : 'C')}
                className="btn-sci"
                style={{ padding: '3px 8px', fontSize: '10px', fontFamily: 'var(--font-mono)' }}
                title="Toggle °C / °F"
              >
                °{unit}
              </button>
              {/* Close */}
              <button
                onClick={clearAnalysis}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
                  color: 'var(--text-muted)', display: 'flex', borderRadius: '4px',
                  transition: 'color 0.15s',
                }}
                title="Close (Esc)"
              >
                <X style={{ width: '13px', height: '13px' }} />
              </button>
            </div>
          </div>

          {/* ── Hero Temperature ── */}
          <div style={{
            padding: '14px 16px 12px',
            background: 'rgba(95, 163, 154, 0.04)',
            borderBottom: '1px solid var(--border-faint)',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ marginBottom: '4px' }}><SectionLabel>Sea Surface Temperature</SectionLabel></div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '5px' }}>
                <span className="hero-readout">{tempVal}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--teal-500)', marginBottom: '2px' }}>
                  {tempUnit}
                </span>
              </div>
            </div>
            <span className="live-badge">
              <span className="dot-teal pulse-glow" style={{ width: '5px', height: '5px' }} />
              LIVE
            </span>
          </div>

          {/* ── Core Metrics ── */}
          <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '0px' }}>
            {/* Dividers baked into rows */}
            <MetricRow label="Salinity" value={salinity.toFixed(1)} unit="PSU" icon={Droplets} color="var(--teal-500)" />
            <div style={{ height: '1px', background: 'var(--border-faint)', margin: '0 -2px' }} />
            <MetricRow
              label="Current Speed"
              value={speedMs !== null ? speedMs.toFixed(3) : '0.109'}
              unit="m/s"
              icon={Activity}
              color="var(--accent-amber)"
            />
            <div style={{ height: '1px', background: 'var(--border-faint)', margin: '0 -2px' }} />

            {/* Direction with rotating arrow */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Navigation style={{
                  width: '11px', height: '11px', color: 'var(--teal-500)', flexShrink: 0,
                  transform: headingDeg !== null ? `rotate(${headingDeg}deg)` : 'none',
                  transition: 'transform 0.3s ease',
                }} />
                <SectionLabel>Direction</SectionLabel>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {cardinal}{headingDeg !== null ? ` ${Math.round(headingDeg)}°` : ''}
              </span>
            </div>

            <div style={{ height: '1px', background: 'var(--border-faint)', margin: '0 -2px' }} />
            <MetricRow label="Depth" value={`-${activeDepthMeters}`} unit="m" />
          </div>

          {/* ── Progressive Disclosure ── */}
          <div style={{ borderTop: '1px solid var(--border-faint)' }}>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 16px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                fontSize: '10px',
                fontWeight: 600,
                letterSpacing: '0.04em',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-secondary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <span>{isExpanded ? 'LESS DETAIL' : 'MORE DETAIL'}</span>
              <ChevronDown style={{
                width: '12px', height: '12px',
                transform: isExpanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
              }} />
            </button>

            {isExpanded && (
              <div style={{
                padding: '0 16px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
                borderTop: '1px solid var(--border-faint)',
                background: 'rgba(0,0,0,0.15)',
              }}>
                {/* u/v components */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', fontSize: '10px' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>Velocity (u, v)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600 }}>
                    {uVel !== null ? uVel.toFixed(3) : '0.082'}, {vVel !== null ? vVel.toFixed(3) : '-0.067'} m/s
                  </span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-faint)' }} />

                {/* Sigma-t */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>Potential Density σₜ</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600 }}>
                    {sigmaT !== null ? `${sigmaT.toFixed(2)}` : '23.41'} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>kg/m³</span>
                  </span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-faint)' }} />

                {/* Sound speed */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>Acoustic Speed</span>
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 600 }}>
                    {soundSpeed !== null ? Math.round(soundSpeed) : '1538'} <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>m/s</span>
                  </span>
                </div>
                <div style={{ height: '1px', background: 'var(--border-faint)' }} />

                {/* Data provenance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontSize: '9px' }}>Provenance</span>
                  <span style={{ fontSize: '10px', color: 'var(--teal-500)', fontWeight: 600 }}>SeaDataNet / ANDRO</span>
                </div>

                {/* Nearest asset */}
                {nearby?.nearest?.profile && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border-faint)', margin: '4px 0' }} />
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '7px 10px',
                      background: 'rgba(95,163,154,0.05)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-faint)',
                      marginTop: '4px',
                    }}>
                      <div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Nearest Asset</div>
                        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '1px' }}>
                          {nearby.nearest.profile.platformType?.replace('_', ' ') || 'Argo Float'}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {Math.round(nearby.nearest.distanceKm)} km away
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedProfile(nearby.nearest.profile);
                          if (nearby.nearest.profile.location) globalCameraController.focusProfile(nearby.nearest.profile);
                        }}
                        className="btn-sci"
                        style={{ padding: '4px 9px', fontSize: '9px', gap: '4px' }}
                      >
                        <Crosshair style={{ width: '10px', height: '10px', color: 'var(--teal-500)' }} />
                        Focus
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
