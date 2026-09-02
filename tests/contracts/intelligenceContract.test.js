import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DataState,
  createIntelligenceValue,
  buildLineageGraph,
  VALID_UNITS,
} from '../../src/engine/contracts/intelligenceContract.js';
import { computeFreshness, FreshnessStatus } from '../../src/engine/contracts/freshness.js';

describe('OceanView — Scientific Data Contracts & Truthfulness Invariants', () => {
  test('Invariant 1: Exactly 10 canonical DataStates are defined and representable', () => {
    const states = Object.values(DataState);
    assert.equal(states.length, 10);
    const expected = [
      'OBSERVED',
      'CORROBORATED',
      'DERIVED',
      'MODELED',
      'ESTIMATED',
      'PREDICTED',
      'STATIC',
      'PENDING',
      'PARTIAL',
      'UNAVAILABLE',
    ];
    for (const exp of expected) {
      assert.ok(states.includes(exp), `Missing DataState: ${exp}`);
    }
  });

  test('Invariant 2: Nullable confidence without arbitrary fabrication', () => {
    const val = createIntelligenceValue({
      value: 28.5,
      unit: '°C',
      dataState: DataState.OBSERVED,
      source: 'INCOIS_BUOY',
      confidence: null,
    });
    assert.equal(val.confidence, null);

    const valWithConf = createIntelligenceValue({
      value: 35.2,
      unit: 'PSU',
      dataState: DataState.MODELED,
      source: 'HYCOM',
      confidence: 0.85,
    });
    assert.equal(valWithConf.confidence, 0.85);
  });

  test('Invariant 3: Dimensional honesty rejects unphysical or missing units', () => {
    assert.throws(
      () =>
        createIntelligenceValue({
          value: 28.5,
          unit: 'unrecognized_junk_unit',
          dataState: DataState.OBSERVED,
        }),
      /Invalid oceanographic unit/
    );

    // Valid physical oceanographic units pass
    assert.ok(VALID_UNITS.has('°C'));
    assert.ok(VALID_UNITS.has('PSU'));
    assert.ok(VALID_UNITS.has('m/s'));
    assert.ok(VALID_UNITS.has('dbar'));
    assert.ok(VALID_UNITS.has('mg/m3'));
  });

  test('Invariant 4: Multi-hop lineage graph preserves reproducibility', () => {
    const lineage = buildLineageGraph([
      { step: 'Argo Float Ingestion', source: 'INCOIS_ARGO', dataState: DataState.OBSERVED },
      { step: 'Quality Control Filter', source: 'INCOIS_QC', dataState: DataState.OBSERVED },
      { step: 'UNESCO Density Calculation', source: 'OCEANVIEW_CORE', dataState: DataState.DERIVED },
    ]);

    assert.equal(lineage.nodes.length, 3);
    assert.equal(lineage.edges.length, 2);
    assert.equal(lineage.rootSource, 'INCOIS_ARGO');
    assert.equal(lineage.finalDataState, DataState.DERIVED);
  });

  test('Invariant 5: Freshness computes against physical observedAt timestamp', () => {
    const now = Date.now();
    const freshObs = computeFreshness(new Date(now - 1000 * 60).toISOString(), null, 3600000, now);
    assert.equal(freshObs.status, FreshnessStatus.LIVE);

    const staleObs = computeFreshness(new Date(now - 1000 * 3600 * 3).toISOString(), null, 3600000, now);
    assert.equal(staleObs.status, FreshnessStatus.STALE);
  });
});
