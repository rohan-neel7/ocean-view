import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';

/**
 * SeaDataNet / Coriolis climatology seasons.
 * These are the actual time dimensions available in the SDC monthly climatology product.
 * They are NOT real-time forecasts — the UI clearly labels them CLIMATOLOGY.
 */
const TIME_STEPS = [
  { step: 0, label: 'NE Monsoon',          time: 'Jan – Mar climatological mean' },
  { step: 1, label: 'Spring Inter-monsoon', time: 'Apr – May climatological mean' },
  { step: 2, label: 'SW Monsoon',           time: 'Jun – Sep climatological mean' },
  { step: 3, label: 'Fall Inter-monsoon',   time: 'Oct – Dec climatological mean' },
];

export default function TimelineControl() {
  const { activeTimeStep, setActiveTimeStep, isPlayingTimeline, setIsPlayingTimeline } = useOceanView();

  const handlePrev = () => {
    setActiveTimeStep((prev) => (prev > 0 ? prev - 1 : TIME_STEPS.length - 1));
  };

  const handleNext = () => {
    setActiveTimeStep((prev) => (prev + 1) % TIME_STEPS.length);
  };

  const currentStepInfo = TIME_STEPS[activeTimeStep] || TIME_STEPS[0];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', minWidth: '310px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
        <Clock style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
        <span style={{
          fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: '600',
          color: '#fbbf24', background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.3)', borderRadius: '3px', padding: '1px 5px',
          letterSpacing: '0.05em',
        }}>CLIMATOLOGY</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={handlePrev} className="btn-sci" style={{ padding: '6px 8px' }} title="Previous Time Step">
          <SkipBack style={{ width: '14px', height: '14px' }} />
        </button>
        <button
          onClick={() => setIsPlayingTimeline(!isPlayingTimeline)}
          className={`btn-sci ${isPlayingTimeline ? 'btn-sci-active' : ''}`}
          style={{ padding: '6px 8px' }}
          title={isPlayingTimeline ? 'Pause Animation' : 'Play Time Animation'}
        >
          {isPlayingTimeline ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
        </button>
        <button onClick={handleNext} className="btn-sci" style={{ padding: '6px 8px' }} title="Next Time Step">
          <SkipForward style={{ width: '14px', height: '14px' }} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
        <span className="mono-readout" style={{ fontSize: '12px', fontWeight: '600', color: '#38bdf8' }}>
          {currentStepInfo.label}
        </span>
        <span className="mono-readout" style={{ fontSize: '10px', color: '#94a3b8' }}>
          {currentStepInfo.time}
        </span>
      </div>
    </div>
  );
}
