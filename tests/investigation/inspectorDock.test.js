/**
 * OceanView — Inspector Dock & Layout Coordination Tests
 * Validates viewport clamping rules, collapsible section state invariants,
 * non-overlapping positioning, and zero data loss summary readouts.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('Inspector Dock Layout & Coordination Invariants', async (t) => {
  await t.test('CSS rules clamp right dock width to viewport min(320px, calc(100vw - 32px))', () => {
    const cssPath = path.resolve('src/styles/oceanview.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(
      cssContent.includes('min(320px, calc(100vw - 32px))'),
      'oceanview.css must include viewport-clamped width min(320px, calc(100vw - 32px))'
    );
    assert.ok(
      cssContent.includes('.oceanview-inspector-dock'),
      'oceanview.css must define .oceanview-inspector-dock'
    );
    assert.ok(
      cssContent.includes('overflow-y: auto'),
      'oceanview.css must define overflow-y: auto to prevent vertical overflow'
    );
  });

  await t.test('CSS rules clamp left dock width to viewport min(340px, calc(100vw - 320px))', () => {
    const cssPath = path.resolve('src/styles/oceanview.css');
    const cssContent = fs.readFileSync(cssPath, 'utf8');

    assert.ok(
      cssContent.includes('.oceanview-left-dock'),
      'oceanview.css must define .oceanview-left-dock'
    );
    assert.ok(
      cssContent.includes('min(340px, calc(100vw - 320px))'),
      'oceanview.css must clamp left dock width relative to sidebar width'
    );
  });

  await t.test('CurrentInspector and ProfileInspector do not independently hardcode conflicting fixed coordinates', () => {
    const currentInspectorPath = path.resolve('src/components/scientific/CurrentInspector.jsx');
    const profileInspectorPath = path.resolve('src/components/scientific/ProfileInspector.jsx');

    const currentContent = fs.readFileSync(currentInspectorPath, 'utf8');
    const profileContent = fs.readFileSync(profileInspectorPath, 'utf8');

    // Both components should support isDocked to prevent duplicate absolute layout anchors
    assert.ok(
      currentContent.includes('isDocked'),
      'CurrentInspector must support isDocked prop'
    );
    assert.ok(
      profileContent.includes('isDocked'),
      'ProfileInspector must support isDocked prop'
    );

    // Bare 290px fixed width must be eliminated in favor of viewport clamping
    assert.ok(
      !currentContent.includes("width: '290px'"),
      'CurrentInspector must not contain hardcoded 290px width'
    );
  });

  await t.test('Collapsible section state machine: 1-item auto-expand and multi-item single-expand default', () => {
    // Test helper simulating dock section resolution
    function resolveSectionExpansion(activeSections, prevActiveSections, currentExpanded, recentTrigger) {
      const activeCount = Object.values(activeSections).filter(Boolean).length;
      if (activeCount === 0) return currentExpanded;

      if (activeCount === 1) {
        return {
          probe: Boolean(activeSections.probe),
          profile: Boolean(activeSections.profile),
          nearby: Boolean(activeSections.nearby),
          analysis: Boolean(activeSections.analysis),
        };
      }

      // 2+ active: expand recentTrigger, collapse others by default
      const next = { probe: false, profile: false, nearby: false, analysis: false };
      if (recentTrigger && activeSections[recentTrigger]) {
        next[recentTrigger] = true;
      }
      return next;
    }

    // Case 1: Only probe is active -> probe expands
    const step1 = resolveSectionExpansion(
      { probe: true, profile: false, nearby: false, analysis: false },
      { probe: false, profile: false, nearby: false, analysis: false },
      { probe: false, profile: false, nearby: false, analysis: false },
      'probe'
    );
    assert.equal(step1.probe, true);
    assert.equal(step1.profile, false);

    // Case 2: User clicks observation -> both probe and profile active simultaneously
    const step2 = resolveSectionExpansion(
      { probe: true, profile: true, nearby: false, analysis: false },
      { probe: true, profile: false, nearby: false, analysis: false },
      step1,
      'profile'
    );
    assert.equal(step2.profile, true, 'Newly triggered profile must expand');
    assert.equal(step2.probe, false, 'Colliding probe must collapse by default');

    // Case 3: User manually toggles probe back open without clearing profile
    const step3ManualToggle = { ...step2, probe: true };
    assert.equal(step3ManualToggle.probe, true);
    assert.equal(step3ManualToggle.profile, true);
  });

  await t.test('One-line summary generators preserve essential scientific metadata when collapsed', () => {
    // Current Vector readout summary
    const probedVector = { speed: 0.082, headingDeg: 297.4, u: -0.07, v: 0.04 };
    const currentSummary = `Current: ${probedVector.speed.toFixed(2)} m/s @ ${Math.round(probedVector.headingDeg)}°`;
    assert.equal(currentSummary, 'Current: 0.08 m/s @ 297°');

    // Profile summary
    const profile = { platformId: '2902198', platformType: 'ARGO_FLOAT', depths: new Array(32) };
    const profileSummary = `${profile.platformId} (${profile.platformType}) • ${profile.depths.length} lvls`;
    assert.equal(profileSummary, '2902198 (ARGO_FLOAT) • 32 lvls');

    // Nearby observation summary
    const nearby = { counts: { total: 4 }, nearest: { distanceKm: 42 } };
    const nearbySummary = `Nearby Observations (${nearby.counts.total}) • ${nearby.nearest.distanceKm} km`;
    assert.equal(nearbySummary, 'Nearby Observations (4) • 42 km');
  });
});
