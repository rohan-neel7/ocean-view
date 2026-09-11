/**
 * OceanView — Windy-Style Vertical Color Scale Legend & Navigation
 * Replicates the signature Windy.com left-side stepped colorbar, model metadata,
 * and bottom-left map controls (+ / - zoom, reticle center, 1000 km scale bar).
 */

import React from 'react';
import { Plus, Minus, Crosshair } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { zoomCamera } from '../../engine/rendering/cameraVerbs.js';

const WIND_STEPS = [
  { val: 53, color: '#4a044e' },
  { val: 51, color: '#581c87' },
  { val: 47, color: '#701a75' },
  { val: 43, color: '#86198f' },
  { val: 39, color: '#6b21a8' },
  { val: 35, color: '#4c1d95' },
  { val: 31, color: '#1e3a8a' },
  { val: 27, color: '#0284c7' },
  { val: 23, color: '#0d9488' },
  { val: 19, color: '#059669' },
  { val: 15, color: '#65a30d' },
  { val: 11, color: '#ca8a04' },
  { val: 7,  color: '#d97706' },
  { val: 3,  color: '#ea580c' },
  { val: 0,  color: '#64748b' },
];

const TEMP_STEPS = [
  { val: 34, color: '#7f1d1d' },
  { val: 32, color: '#991b1b' },
  { val: 30, color: '#c2410c' },
  { val: 28, color: '#ea580c' },
  { val: 26, color: '#d97706' },
  { val: 24, color: '#ca8a04' },
  { val: 22, color: '#65a30d' },
  { val: 20, color: '#059669' },
  { val: 18, color: '#0d9488' },
  { val: 16, color: '#0284c7' },
  { val: 14, color: '#1e3a8a' },
  { val: 12, color: '#4c1d95' },
  { val: 10, color: '#6b21a8' },
];

export default function WindyColorScaleLegend() {
  const { activeVariable } = useOceanView();

  const isTemp = activeVariable === 'sea_surface_temperature';
  const steps = isTemp ? TEMP_STEPS : WIND_STEPS;
  const unit = isTemp ? '°C' : 'kts';

  const handleZoomIn = () => {
    const viewer = globalCameraController.viewer;
    if (viewer) zoomCamera(viewer, 0.6);
  };

  const handleZoomOut = () => {
    const viewer = globalCameraController.viewer;
    if (viewer) zoomCamera(viewer, 1.6);
  };

  const handleCenter = () => {
    const viewer = globalCameraController.viewer;
    if (viewer) {
      globalCameraController.flyToRegion('ARABIAN_SEA');
    }
  };

  return (
    <>
      {/* 1. Middle-Left: Center Reticle, Stepped Vertical Color Scale Bar & Model Metadata */}
      <div
        style={{
          position: 'absolute',
          top: '130px',
          left: '16px',
          zIndex: 42,
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
          userSelect: 'none',
          pointerEvents: 'none',
        }}
      >
        {/* Reticle / GPS Center button */}
        <div style={{ pointerEvents: 'auto' }}>
          <button
            onClick={handleCenter}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '4px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            }}
            title="Center on Basin"
          >
            <Crosshair style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Stepped Vertical Color Scale Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '28px',
            borderRadius: '4px',
            overflow: 'hidden',
            boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            pointerEvents: 'auto',
          }}
        >
          {/* Unit Header */}
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.95)',
              color: '#f8fafc',
              fontSize: '9px',
              fontWeight: 800,
              textAlign: 'center',
              padding: '3px 0',
              letterSpacing: '0.04em',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}
          >
            {unit}
          </div>

          {/* Color Steps */}
          {steps.map((step) => (
            <div
              key={step.val}
              style={{
                height: '16px',
                background: step.color,
                color: '#ffffff',
                fontSize: '8.5px',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {step.val}
            </div>
          ))}
        </div>

        {/* Model & Update Status Card */}
        <div
          style={{
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '4px',
            padding: '6px 8px',
            fontSize: '9.5px',
            fontFamily: 'Inter, system-ui, sans-serif',
            color: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            width: '120px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
            pointerEvents: 'auto',
          }}
        >
          <div>
            <span style={{ color: '#94a3b8' }}>Model: </span>
            <span style={{ fontWeight: 700, color: '#f8fafc' }}>GFS / INCOIS</span>
          </div>
          <div style={{ color: '#cbd5e1' }}>
            Last update: <span style={{ fontWeight: 600 }}>10:14</span>
          </div>
          <div style={{ color: '#94a3b8' }}>
            Next update: <span style={{ fontWeight: 600 }}>16:14</span>
          </div>
        </div>
      </div>

      {/* 2. Bottom-Left Corner: Zoom Buttons (+ / -) & 1000 km Scale Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          zIndex: 42,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          fontFamily: 'Inter, system-ui, sans-serif',
          userSelect: 'none',
          pointerEvents: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            width: '24px',
            borderRadius: '4px',
            overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.25)',
            background: 'rgba(15, 23, 42, 0.85)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          }}
        >
          <button
            onClick={handleZoomIn}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              borderBottom: '1px solid rgba(255,255,255,0.15)',
            }}
            title="Zoom In"
          >
            <Plus style={{ width: '13px', height: '13px' }} />
          </button>
          <button
            onClick={handleZoomOut}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            title="Zoom Out"
          >
            <Minus style={{ width: '13px', height: '13px' }} />
          </button>
        </div>

        {/* 1000 km Scale Bar with Corner Brackets */}
        <div style={{ display: 'flex', flexDirection: 'column', width: '68px' }}>
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0,0,0,0.9)',
              marginBottom: '2px',
            }}
          >
            1000 km
          </div>
          <div
            style={{
              height: '4px',
              borderBottom: '2px solid #ffffff',
              borderLeft: '2px solid #ffffff',
              borderRight: '2px solid #ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.8)',
            }}
          />
        </div>
      </div>
    </>
  );
}
