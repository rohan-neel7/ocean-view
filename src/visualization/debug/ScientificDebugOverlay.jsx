/**
 * OceanView — Scientific Debug Overlay (Developer-only)
 * Displays diagnostic state for every scientific visualization layer.
 *
 * Activation:
 *   - Set window.__OCEANVIEW_DEBUG = true in browser console
 *   - Or press Ctrl+Shift+D
 *
 * Not visible by default. Not shown to SIH judges.
 */

import React, { useState, useEffect } from 'react';

export default function ScientificDebugOverlay({ scalarLayer, vectorLayer, particleLayer, transectLayer, isosurfaceLayer, profileLayer }) {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState({});

  // Toggle via keyboard shortcut or window flag
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', handler);

    // Check window flag
    const checkFlag = () => {
      if (window.__OCEANVIEW_DEBUG && !visible) setVisible(true);
    };
    const interval = setInterval(checkFlag, 2000);

    return () => {
      window.removeEventListener('keydown', handler);
      clearInterval(interval);
    };
  }, [visible]);

  // Refresh state periodically when visible
  useEffect(() => {
    if (!visible) return;

    const refresh = () => {
      const layers = {};
      if (scalarLayer?.current?.getDebugState) layers.scalar = scalarLayer.current.getDebugState();
      if (vectorLayer?.current?.getDebugState) layers.vector = vectorLayer.current.getDebugState();
      if (particleLayer?.current?.getDebugState) layers.particle = particleLayer.current.getDebugState();
      if (transectLayer?.current?.getDebugState) layers.transect = transectLayer.current.getDebugState();
      if (isosurfaceLayer?.current?.getDebugState) layers.isosurface = isosurfaceLayer.current.getDebugState();
      if (profileLayer?.current?.getDebugState) layers.profile = profileLayer.current.getDebugState();
      setState(layers);
    };

    refresh();
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [visible, scalarLayer, vectorLayer, particleLayer, transectLayer, isosurfaceLayer, profileLayer]);

  if (!visible) return null;

  const statusColor = (val) => val ? '#22c55e' : '#ef4444';
  const statusText = (val) => val ? 'YES' : 'NO';

  return (
    <div style={{
      position: 'fixed',
      top: '60px',
      right: '10px',
      width: '340px',
      maxHeight: '70vh',
      overflow: 'auto',
      background: 'rgba(0, 0, 0, 0.92)',
      border: '1px solid rgba(56, 189, 248, 0.3)',
      borderRadius: '8px',
      padding: '12px',
      fontFamily: 'monospace',
      fontSize: '10px',
      color: '#94a3b8',
      zIndex: 99999,
      pointerEvents: 'auto',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: '#38bdf8', fontWeight: '700', fontSize: '11px' }}>🔬 SCIENTIFIC DEBUG</span>
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '12px' }}>✕</button>
      </div>

      {Object.entries(state).map(([key, layer]) => (
        <div key={key} style={{ marginBottom: '8px', padding: '6px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', borderLeft: `3px solid ${layer.enabled ? '#22c55e' : '#64748b'}` }}>
          <div style={{ fontWeight: '700', color: '#e2e8f0', marginBottom: '4px', textTransform: 'uppercase' }}>
            {layer.layerId || key}
          </div>
          {layer.variable && <div>Variable: <span style={{ color: '#38bdf8' }}>{layer.variable}</span></div>}
          {layer.depth !== undefined && <div>Depth: <span style={{ color: '#f59e0b' }}>{layer.depth}m</span></div>}
          {layer.gridDimensions && <div>Grid: <span style={{ color: '#a78bfa' }}>{layer.gridDimensions}</span></div>}
          {layer.colormap && <div>Colormap: <span style={{ color: '#34d399' }}>{layer.colormap}</span></div>}
          {layer.opacity !== undefined && <div>Opacity: <span>{(layer.opacity * 100).toFixed(0)}%</span></div>}
          {layer.entityCount !== undefined && <div>Entities: <span style={{ color: '#38bdf8' }}>{layer.entityCount}</span></div>}
          {layer.particleCount !== undefined && <div>Particles: <span style={{ color: '#38bdf8' }}>{layer.particleCount}</span></div>}
          <div>Data: <span style={{ color: statusColor(layer.hasData) }}>{statusText(layer.hasData)}</span></div>
          <div>Primitive: <span style={{ color: statusColor(layer.primitiveCreated || layer.entityCreated || layer.enabled) }}>{statusText(layer.primitiveCreated || layer.entityCreated || layer.enabled)}</span></div>
          {layer.dataStats && (
            <div>Range: <span style={{ color: '#94a3b8' }}>{layer.dataStats.minValue} — {layer.dataStats.maxValue}</span> ({layer.dataStats.validCellCount} cells)</div>
          )}
          {layer.bounds && (
            <div>Bounds: <span style={{ color: '#94a3b8' }}>
              {layer.bounds.minLat?.toFixed(1)}°–{layer.bounds.maxLat?.toFixed(1)}°N, {layer.bounds.minLon?.toFixed(1)}°–{layer.bounds.maxLon?.toFixed(1)}°E
            </span></div>
          )}
        </div>
      ))}
    </div>
  );
}
