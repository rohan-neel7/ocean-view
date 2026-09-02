import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { alignAndCompareProfile, AlignmentStatus } from '../../src/engine/comparison/ProfileAlignmentEngine.js';
import { createCanonicalProfile } from '../../src/engine/ocean/CanonicalProfile.js';
import { createCanonicalGridScalar } from '../../src/engine/ocean/CanonicalGridScalar.js';

describe('OceanView — Profile Alignment & Vertical Intercomparison Engine', () => {
  test('Evaluates delta, mean bias, and RMSE on valid overlapping levels', () => {
    const profile = createCanonicalProfile({
      id: 'argo:test_01',
      source: 'ARGO_INCOIS',
      platformId: '2900771',
      observedAt: '2026-08-20T00:00:00Z',
      location: { lat: 10.0, lon: 65.0 },
      depths: [5.0, 50.0, 100.0],
      variables: {
        temperature: [28.5, 24.5, 18.5],
      },
      units: { temperature: '°C' },
    });

    const modelGrid = createCanonicalGridScalar({
      id: 'model:test_01',
      source: 'SDC_4D',
      timestamp: '2026-08-25T00:00:00Z', // 5 days difference (well within 45-day tolerance)
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 1, lonCount: 1, depthCount: 3 },
      latitudes: [10.0],
      longitudes: [65.0],
      depths: [5.0, 50.0, 100.0],
      data: new Float32Array([28.0, 24.0, 18.0]), // Model is exactly 0.5°C cooler
    });

    const report = alignAndCompareProfile(profile, modelGrid, 'temperature');

    assert.equal(report.status, AlignmentStatus.ALIGNED);
    assert.equal(report.metrics.validPairs, 3);
    assert.equal(report.metrics.meanBias, 0.5);
    assert.equal(report.metrics.rmse, 0.5);

    assert.equal(report.levels[0].delta, 0.5);
    assert.equal(report.levels[1].delta, 0.5);
    assert.equal(report.levels[2].delta, 0.5);
  });

  test('Temporal mismatch beyond tolerance returns TEMPORAL_MISMATCH_UNRESOLVED', () => {
    const profile = createCanonicalProfile({
      id: 'argo:old_cast',
      source: 'ARGO_INCOIS',
      platformId: '2900771',
      observedAt: '2020-01-01T00:00:00Z', // 6 years older than model
      location: { lat: 10.0, lon: 65.0 },
      depths: [5.0],
      variables: { temperature: [28.0] },
    });

    const modelGrid = createCanonicalGridScalar({
      id: 'model:recent',
      source: 'SDC_4D',
      timestamp: '2026-08-25T00:00:00Z',
      variable: 'temperature',
      unit: '°C',
      dimensions: { latCount: 1, lonCount: 1, depthCount: 1 },
      latitudes: [10.0],
      longitudes: [65.0],
      depths: [5.0],
      data: new Float32Array([28.0]),
    });

    const report = alignAndCompareProfile(profile, modelGrid, 'temperature', {
      maxTemporalMismatchDays: 30,
    });

    assert.equal(report.status, AlignmentStatus.TEMPORAL_MISMATCH_UNRESOLVED);
    assert.equal(report.metrics, null);
    assert.ok(report.mismatchReason.includes('exceeding allowable tolerance'));
  });
});
