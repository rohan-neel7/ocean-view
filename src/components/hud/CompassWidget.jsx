/**
 * OceanView — Windy-Style Compass Orientation Needle Widget
 * Positioned in top-right corner to replicate Windy.com navigation compass.
 */

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
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '38px',
        height: '38px',
        borderRadius: '50%',
        background: 'rgba(255, 255, 255, 0.95)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        zIndex: 45,
        boxShadow: '0 3px 12px rgba(0,0,0,0.35)',
        border: '1px solid rgba(0, 0, 0, 0.1)',
        transition: 'transform 0.15s ease',
      }}
      title="Click to Reset North (0°)"
    >
      <div
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          position: 'relative',
          transform: `rotate(${-headingDeg}deg)`,
          transition: 'transform 0.1s linear',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Red North Arrow Pointer */}
        <div
          style={{
            position: 'absolute',
            top: '1px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '10px solid #dc2626', // Vibrant Red North needle
          }}
        />
        {/* Gray South Arrow Pointer */}
        <div
          style={{
            position: 'absolute',
            bottom: '1px',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderTop: '10px solid #94a3b8', // Slate South needle
          }}
        />
        {/* Center Pivot */}
        <div
          style={{
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#ffffff',
            border: '1px solid #64748b',
          }}
        />
      </div>
    </div>
  );
}
