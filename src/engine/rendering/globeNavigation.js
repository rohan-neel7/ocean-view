/**
 * OceanView — Global Keyboard Navigation Handler
 * Provides keyboard hotkeys for navigation, camera control, and shortcuts reference.
 */

import { globalCameraController } from './CentralizedCameraController.js';

/**
 * Checks if the event target is an interactive input or textarea where hotkeys should be bypassed.
 */
function isInputTarget(e) {
  const target = e.target;
  if (!target) return false;
  const tag = target.tagName ? target.tagName.toUpperCase() : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
}

/**
 * Attaches window keyboard event listener and returns a cleanup disposer.
 */
export function setupGlobeKeyboardNavigation({
  onToggleOrbit = null,
  onToggleShortcutsModal = null,
  onToggleFullscreen = null,
} = {}) {
  const handleKeyDown = (e) => {
    if (isInputTarget(e)) return;

    const key = e.key;

    switch (key) {
      case 'h':
      case 'H':
        e.preventDefault();
        globalCameraController.flyToRegion('ARABIAN_SEA', 1.8);
        break;

      case 'n':
      case 'N':
        e.preventDefault();
        globalCameraController.resetNorth(0.6);
        break;

      case '+':
      case '=':
        e.preventDefault();
        globalCameraController.zoom(0.65, 0.4);
        break;

      case '-':
      case '_':
        e.preventDefault();
        globalCameraController.zoom(1.5, 0.4);
        break;

      case 'o':
      case 'O':
        e.preventDefault();
        if (onToggleOrbit) onToggleOrbit();
        break;

      case 'f':
      case 'F':
        e.preventDefault();
        if (onToggleFullscreen) {
          onToggleFullscreen();
        } else if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen?.();
        } else {
          document.exitFullscreen?.();
        }
        break;

      case '1':
        e.preventDefault();
        globalCameraController.setPerspective('ORBITAL', 1.5);
        break;

      case '2':
        e.preventDefault();
        globalCameraController.setPerspective('OBLIQUE_3D', 1.5);
        break;

      case '3':
        e.preventDefault();
        globalCameraController.setPerspective('SURFACE_GLANCE', 1.5);
        break;

      case '4':
        e.preventDefault();
        globalCameraController.setPerspective('RESET', 1.5);
        break;

      case '?':
        e.preventDefault();
        if (onToggleShortcutsModal) onToggleShortcutsModal();
        break;

      case 'Escape':
        globalCameraController.cancelFlight();
        break;

      default:
        break;
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
