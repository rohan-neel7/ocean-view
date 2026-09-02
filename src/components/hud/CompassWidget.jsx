import React, { useState, useEffect } from 'react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import { resetNorth } from '../../engine/rendering/cameraVerbs.js';

export default function CompassWidget() {
  const [headingDeg, setHeadingDeg] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const viewer = globalCameraController.viewer;
      if (!viewer || viewer.isDestroyed?.()) return;

      try {
        const h = Math.round((viewer.camera.heading * 180) / Math.PI) % 360;
        setHeadingDeg(h);
      } catch (_err) {
        // ignore
      }
    }, 100);

    return () => clearInterval(timer);
  }, []);

  const handleClick = () => {
    const viewer = globalCameraController.viewer;
    if (viewer) {
      resetNorth(viewer);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="glass-panel"
      style={{
        position: 'absolute',
        top: '124px',
        right: '16px',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 42,
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        border: '1px solid rgba(56, 189, 248, 0.3)',
      }}
      title="Click to Reset North (0°)"
    >
      <div
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          position: 'relative',
          transform: `rotate(${-headingDeg}deg)`,
          transition: 'transform 0.1s linear',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* North Arrow Pointer */}
        <div
          style={{
            position: 'absolute',
            top: '0px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '10px solid #fb7185', // Red North needle
          }}
        />
        {/* South Arrow Pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '0px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '10px solid #94a3b8', // Gray South needle
          }}
        />
        {/* Center Pivot */}
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 6px #38bdf8',
          }}
        />
      </div>
    </div>
  );
}
