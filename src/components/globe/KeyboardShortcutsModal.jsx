import React from 'react';
import { X, Keyboard, Command } from 'lucide-react';

const SHORTCUTS = [
  { key: 'H', desc: 'Home / Recenter to Arabian Sea' },
  { key: 'N', desc: 'Snap camera heading to True North (0°)' },
  { key: '+ / =', desc: 'Zoom camera in' },
  { key: '- / _', desc: 'Zoom camera out' },
  { key: 'O', desc: 'Toggle smooth cinematic 3D orbit' },
  { key: 'F', desc: 'Toggle fullscreen presentation mode' },
  { key: '1', desc: 'Orbital (90°) top-down mapping view' },
  { key: '2', desc: '3D Oblique (45°) subsurface curtain view' },
  { key: '3', desc: 'Surface (15°) low grazing angle' },
  { key: '4', desc: 'Reset to canonical regional perspective' },
  { key: 'Esc', desc: 'Close modals / Cancel active camera flight' },
];

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        zIndex: 999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel-elevated"
        style={{
          width: '380px',
          padding: '20px',
          borderRadius: '12px',
          fontFamily: 'var(--font-mono)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            paddingBottom: '12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f8fafc', fontWeight: 'bold', fontSize: '13px' }}>
            <Keyboard style={{ width: '18px', height: '18px', color: '#38bdf8' }} />
            <span>GLOBE NAVIGATION SHORTCUTS</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            title="Close (Esc)"
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px' }}>
          {SHORTCUTS.map((s) => (
            <div
              key={s.key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '4px 6px',
                borderRadius: '4px',
                background: 'rgba(15,23,42,0.5)',
              }}
            >
              <span style={{ color: '#cbd5e1' }}>{s.desc}</span>
              <kbd
                style={{
                  background: 'rgba(56,189,248,0.15)',
                  border: '1px solid rgba(56,189,248,0.4)',
                  color: '#38bdf8',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '10px',
                }}
              >
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '14px', textAlign: 'center', fontSize: '10px', color: '#64748b' }}>
          <span>Press </span>
          <kbd style={{ background: '#0f172a', padding: '1px 4px', borderRadius: '3px', color: '#94a3b8' }}>Esc</kbd>
          <span> or </span>
          <kbd style={{ background: '#0f172a', padding: '1px 4px', borderRadius: '3px', color: '#94a3b8' }}>?</kbd>
          <span> to dismiss</span>
        </div>
      </div>
    </div>
  );
}
