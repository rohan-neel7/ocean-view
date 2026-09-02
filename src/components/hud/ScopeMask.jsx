import React from 'react';

export default function ScopeMask() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 10,
        boxShadow: 'inset 0 0 100px rgba(0, 0, 0, 0.65)',
      }}
    >
      {/* Top Left Corner */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          width: '24px',
          height: '24px',
          borderTop: '1px solid rgba(56, 189, 248, 0.4)',
          borderLeft: '1px solid rgba(56, 189, 248, 0.4)',
        }}
      />

      {/* Top Right Corner */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          width: '24px',
          height: '24px',
          borderTop: '1px solid rgba(56, 189, 248, 0.4)',
          borderRight: '1px solid rgba(56, 189, 248, 0.4)',
        }}
      />

      {/* Bottom Left Corner */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '20px',
          width: '24px',
          height: '24px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.4)',
          borderLeft: '1px solid rgba(56, 189, 248, 0.4)',
        }}
      />

      {/* Bottom Right Corner */}
      <div
        style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          width: '24px',
          height: '24px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.4)',
          borderRight: '1px solid rgba(56, 189, 248, 0.4)',
        }}
      />
    </div>
  );
}
