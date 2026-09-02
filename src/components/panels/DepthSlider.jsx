import React from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { DATASET_CAPABILITIES } from '../../engine/index.js';

export default function DepthSlider() {
  const { activeVariable, activeDepthMeters, setActiveDepthMeters } = useOceanView();

  const caps = DATASET_CAPABILITIES[activeVariable];
  const depthLevels = caps?.supportedDepths || [];
  
  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    const depth = depthLevels[idx] || 0;
    setActiveDepthMeters(depth);
  };

  const currentIdx = depthLevels.indexOf(activeDepthMeters);
  const sliderVal = currentIdx !== -1 ? currentIdx : 0;
  const isAvailable = depthLevels.length > 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, paddingRight: '16px', opacity: isAvailable ? 1 : 0.4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '85px' }}>
        <ArrowDownCircle style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
        <span>Depth (Z)</span>
      </div>

      <div className="depth-slider-container" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
        <input
          type="range"
          min="0"
          max={Math.max(0, depthLevels.length - 1)}
          step="1"
          value={sliderVal}
          onChange={handleSliderChange}
          className="depth-slider"
          disabled={!isAvailable}
          style={{ cursor: isAvailable ? 'pointer' : 'not-allowed', width: '100%' }}
        />
        <div style={{ minWidth: '80px', textAlign: 'right' }}>
          {!isAvailable ? (
            <span style={{ fontSize: '10px', color: '#ef4444' }}>N/A</span>
          ) : (
            <span className="mono-readout" style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
              {activeDepthMeters === 0 ? 'SURFACE' : `-${activeDepthMeters}m`}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
