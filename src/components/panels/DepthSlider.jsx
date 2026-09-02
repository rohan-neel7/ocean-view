import React from 'react';
import { ArrowDownCircle } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { STANDARD_OCEAN_DEPTHS_METERS } from '../../engine/spatial/depthCoordinates.js';

export default function DepthSlider() {
  const { activeDepthMeters, setActiveDepthMeters } = useOceanView();

  const handleSliderChange = (e) => {
    const idx = parseInt(e.target.value, 10);
    const depth = STANDARD_OCEAN_DEPTHS_METERS[idx] || 0;
    setActiveDepthMeters(depth);
  };

  const currentIdx = STANDARD_OCEAN_DEPTHS_METERS.indexOf(activeDepthMeters);
  const sliderVal = currentIdx !== -1 ? currentIdx : 0;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, paddingRight: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: '85px' }}>
        <ArrowDownCircle style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
        <span>Depth (Z)</span>
      </div>

      <div className="depth-slider-container">
        <input
          type="range"
          min="0"
          max={STANDARD_OCEAN_DEPTHS_METERS.length - 1}
          step="1"
          value={sliderVal}
          onChange={handleSliderChange}
          className="depth-slider"
        />
        <div style={{ minWidth: '65px', textAlign: 'right' }}>
          <span className="mono-readout" style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8' }}>
            {activeDepthMeters === 0 ? 'SURFACE' : `-${activeDepthMeters}m`}
          </span>
        </div>
      </div>
    </div>
  );
}
