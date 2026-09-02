import React, { useState, useEffect } from 'react';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';

export default function GlobeOrientationControl() {
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
    globalCameraController.resetNorth(0.6);
  };

  return (
    <button
      onClick={handleClick}
      className="glass-panel"
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
        padding: 0,
        background: 'rgba(9, 13, 22, 0.85)',
      }}
      title={`Current Heading: ${headingDeg}° — Click to Snap True North (N)`}
      aria-label="Snap camera to True North"
    >
      <div
        style={{
          width: '26px',
          height: '26px',
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
            top: '1px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '9px solid #fb7185', // Red North pointer
          }}
        />
        {/* South Arrow Pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '1px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '9px solid #94a3b8', // Slate South pointer
          }}
        />
        {/* Center Pivot */}
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#38bdf8',
            boxShadow: '0 0 6px #38bdf8',
          }}
        />
      </div>
    </button>
  );
}
