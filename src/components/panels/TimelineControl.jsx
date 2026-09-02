import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { DATASET_CAPABILITIES } from '../../engine/index.js';

export default function TimelineControl() {
  const { scientificSelection, setScientificSelection, isPlayingTimeline, setIsPlayingTimeline } = useOceanView();

  const caps = DATASET_CAPABILITIES[scientificSelection.variable];
  const timeSteps = caps?.supportedTimes || [];
  const isTemporal = timeSteps.length > 1;
  const isAvailable = timeSteps.length > 0;

  const currentIdx = timeSteps.findIndex(t => t.value === scientificSelection.timeValue);
  const activeIdx = currentIdx !== -1 ? currentIdx : 0;

  const handlePrev = () => {
    if (!isTemporal) return;
    const nextIdx = activeIdx > 0 ? activeIdx - 1 : timeSteps.length - 1;
    setScientificSelection(prev => ({ ...prev, timeValue: timeSteps[nextIdx].value }));
  };

  const handleNext = () => {
    if (!isTemporal) return;
    const nextIdx = (activeIdx + 1) % timeSteps.length;
    setScientificSelection(prev => ({ ...prev, timeValue: timeSteps[nextIdx].value }));
  };
  
  const togglePlay = () => {
    if (isTemporal) setIsPlayingTimeline(!isPlayingTimeline);
  };

  const currentStepInfo = timeSteps[activeIdx] || { label: 'N/A', time: 'No temporal data' };
  const semantics = caps?.temporalSemantics || 'UNKNOWN';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px', minWidth: '310px', opacity: isAvailable ? 1 : 0.4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#cbd5e1' }}>
        <Clock style={{ width: '16px', height: '16px', color: '#38bdf8' }} />
        <span style={{
          fontSize: '9px', fontFamily: 'var(--font-mono)', fontWeight: '600',
          color: '#fbbf24', background: 'rgba(251,191,36,0.12)',
          border: '1px solid rgba(251,191,36,0.3)', borderRadius: '3px', padding: '1px 5px',
          letterSpacing: '0.05em', textTransform: 'uppercase'
        }}>{semantics}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <button onClick={handlePrev} className="btn-sci" style={{ padding: '6px 8px', opacity: isTemporal ? 1 : 0.4, cursor: isTemporal ? 'pointer' : 'not-allowed' }} title="Previous Time Step" disabled={!isTemporal}>
          <SkipBack style={{ width: '14px', height: '14px' }} />
        </button>
        <button
          onClick={togglePlay}
          className={`btn-sci ${isPlayingTimeline ? 'btn-sci-active' : ''}`}
          style={{ padding: '6px 8px', opacity: isTemporal ? 1 : 0.4, cursor: isTemporal ? 'pointer' : 'not-allowed' }}
          title={isPlayingTimeline ? 'Pause Animation' : 'Play Time Animation'}
          disabled={!isTemporal}
        >
          {isPlayingTimeline ? <Pause style={{ width: '14px', height: '14px' }} /> : <Play style={{ width: '14px', height: '14px' }} />}
        </button>
        <button onClick={handleNext} className="btn-sci" style={{ padding: '6px 8px', opacity: isTemporal ? 1 : 0.4, cursor: isTemporal ? 'pointer' : 'not-allowed' }} title="Next Time Step" disabled={!isTemporal}>
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
