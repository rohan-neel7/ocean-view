/**
 * OceanView — Scientific Colorbar Customization Modal
 * Allows interactive adjustment of palette range (min/max), linear vs logarithmic scaling, opacity, and palette reversal.
 */

import React, { useState, useEffect } from 'react';
import { Sliders, X, Check, RotateCcw, AlertTriangle } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { COLORMAP_PRESETS } from '../../visualization/color/scientificColorMaps.js';
import { getVariableMetadata } from '../../engine/ocean/VariableRegistry.js';

export default function ColorbarEditorModal() {
  const {
    activeVariable,
    colorScaleSettings,
    setColorScaleSettings,
    colorbarModalOpen,
    setColorbarModalOpen,
  } = useOceanView();

  const meta = getVariableMetadata(activeVariable);
  const defaultMin = meta.defaultRange ? meta.defaultRange[0] : 0;
  const defaultMax = meta.defaultRange ? meta.defaultRange[1] : 100;

  const [minVal, setMinVal] = useState(colorScaleSettings.min ?? defaultMin);
  const [maxVal, setMaxVal] = useState(colorScaleSettings.max ?? defaultMax);
  const [scaleType, setScaleType] = useState(colorScaleSettings.scaleType);
  const [opacity, setOpacity] = useState(colorScaleSettings.opacity);
  const [reversed, setReversed] = useState(colorScaleSettings.reversed);

  useEffect(() => {
    if (colorbarModalOpen) {
      setMinVal(colorScaleSettings.min ?? defaultMin);
      setMaxVal(colorScaleSettings.max ?? defaultMax);
      setScaleType(colorScaleSettings.scaleType);
      setOpacity(colorScaleSettings.opacity);
      setReversed(colorScaleSettings.reversed);
    }
  }, [colorbarModalOpen, colorScaleSettings, defaultMin, defaultMax]);

  if (!colorbarModalOpen) return null;

  const handleApply = () => {
    setColorScaleSettings({
      min: Number(minVal),
      max: Number(maxVal),
      scaleType,
      reversed,
      opacity: Number(opacity),
    });
    setColorbarModalOpen(false);
  };

  const handleReset = () => {
    setMinVal(defaultMin);
    setMaxVal(defaultMax);
    setScaleType(meta.scaleType || 'linear');
    setOpacity(0.85);
    setReversed(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(3, 7, 18, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={() => setColorbarModalOpen(false)}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '20px',
          background: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sliders style={{ width: '16px', height: '16px', color: 'var(--accent-teal)' }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Color Scale & Palette Manager
            </h3>
          </div>
          <button
            onClick={() => setColorbarModalOpen(false)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Active Variable Info */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '6px',
            marginBottom: '16px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ color: '#94a3b8' }}>Active Variable:</span>
          <span style={{ color: '#38bdf8', fontWeight: 600 }}>
            {meta.name} ({meta.unit})
          </span>
        </div>

        {/* Min / Max Range Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              Minimum Value ({meta.unit})
            </label>
            <input
              type="number"
              step="0.1"
              value={minVal}
              onChange={(e) => setMinVal(e.target.value)}
              style={{
                width: '100%',
                background: '#030712',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f8fafc',
                padding: '7px 10px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
              Maximum Value ({meta.unit})
            </label>
            <input
              type="number"
              step="0.1"
              value={maxVal}
              onChange={(e) => setMaxVal(e.target.value)}
              style={{
                width: '100%',
                background: '#030712',
                border: '1px solid rgba(255,255,255,0.15)',
                color: '#f8fafc',
                padding: '7px 10px',
                borderRadius: '6px',
                fontSize: '12px',
              }}
            />
          </div>
        </div>

        {/* Scale Type: Linear vs Logarithmic */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
            Normalization Scaling
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setScaleType('linear')}
              className={`btn-sci ${scaleType === 'linear' ? 'btn-sci-active' : ''}`}
              style={{ flex: 1, padding: '7px', fontSize: '11px' }}
            >
              Linear Scale
            </button>
            <button
              onClick={() => setScaleType('log')}
              className={`btn-sci ${scaleType === 'log' ? 'btn-sci-active' : ''}`}
              style={{ flex: 1, padding: '7px', fontSize: '11px' }}
            >
              Logarithmic Scale (Log10)
            </button>
          </div>
          {scaleType === 'log' && (
            <p style={{ fontSize: '10px', color: '#fbbf24', marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertTriangle style={{ width: '12px', height: '12px' }} />
              Log scale enforces physical positivity (&gt;0) suitable for Chlorophyll-a / biomass.
            </p>
          )}
        </div>

        {/* Opacity Slider */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '6px' }}>
            <span>Layer Opacity</span>
            <span style={{ color: '#f8fafc' }}>{Math.round(opacity * 100)}%</span>
          </div>
          <input
            type="range"
            min="0.1"
            max="1.0"
            step="0.05"
            value={opacity}
            onChange={(e) => setOpacity(e.target.value)}
            style={{ width: '100%', cursor: 'pointer' }}
          />
        </div>

        {/* Reversal Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <input
            type="checkbox"
            id="reverseScaleCheck"
            checked={reversed}
            onChange={(e) => setReversed(e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <label htmlFor="reverseScaleCheck" style={{ fontSize: '12px', color: '#e2e8f0', cursor: 'pointer' }}>
            Invert / Reverse Colormap Gradient
          </label>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            onClick={handleReset}
            className="btn-sci"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', fontSize: '11px' }}
          >
            <RotateCcw style={{ width: '13px', height: '13px' }} />
            Reset Defaults
          </button>
          <button
            onClick={handleApply}
            className="btn-sci btn-sci-active"
            style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 16px', fontSize: '11px' }}
          >
            <Check style={{ width: '13px', height: '13px' }} />
            Apply Settings
          </button>
        </div>
      </div>
    </div>
  );
}
