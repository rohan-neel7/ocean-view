/**
 * OceanView — Windy-Style Top Left Header Subtitle Banner
 */

import React from 'react';

export default function WindyHeaderBanner() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '68px',
        left: '16px',
        zIndex: 38,
        maxWidth: '380px',
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: '12px',
        fontWeight: 500,
        lineHeight: 1.35,
        textShadow: '0 2px 8px rgba(0, 0, 0, 0.85)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      Wind forecast and speed, live ocean weather and current velocity map for marine navigation, sailing and research
    </div>
  );
}
