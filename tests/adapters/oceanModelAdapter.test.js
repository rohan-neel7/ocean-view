import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeOceanModelGrid, parseGriddapModelResponse } from '../../src/adapters/OceanModelAdapter.js';
import { DataState, SourceMode } from '../../src/engine/contracts/intelligenceContract.js';

describe('OceanView — Real Ocean Model Ingestion Adapter', () => {
  test('Normalizes gridded model slice into CanonicalGridScalar with DataState.MODELED', () => {
    const lats = [10, 11];
    const lons = [65, 66, 67];
    const data = new Float32Array([27.5, 27.8, 28.1, 27.2, 27.6, 28.0]);

    const grid = normalizeOceanModelGrid({
      datasetId: 'SDC_GLO_CLIM_TS_V2_2',
      variable: 'sea_surface_temperature',
      unit: '°C',
      timestamp: '2010-01-16T00:00:00Z',
      depthMeters: 5.0,
      latitudes: lats,
      longitudes: lons,
      data,
    });

    assert.equal(grid.kind, 'CANONICAL_GRID_SCALAR');
    assert.equal(grid.source, 'SDC_GLO_CLIM_TS_V2_2');
    assert.equal(grid.dataState, DataState.MODELED);
    assert.equal(grid.dimensions.latCount, 2);
    assert.equal(grid.dimensions.lonCount, 3);
    assert.equal(grid.stats.validCellCount, 6);
    assert.equal(grid.getValue(0, 0), 27.5);
    assert.equal(grid.getValue(1, 2), 28.0);
  });

  test('Preserves fill values (land masking) without corrupting to zero', () => {
    const lats = [15];
    const lons = [70, 75];
    const data = new Float32Array([28.5, -9999.0]); // 75°E is land masked

    const grid = normalizeOceanModelGrid({
      datasetId: 'SDC_GLO_CLIM_TS_V2_2',
      variable: 'sea_surface_temperature',
      timestamp: '2010-01-16T00:00:00Z',
      latitudes: lats,
      longitudes: lons,
      data,
      fillValue: -9999.0,
    });

    assert.equal(grid.getValue(0, 0), 28.5);
    assert.equal(grid.getValue(0, 1), null, 'Fill value -9999 must return null');
    assert.notEqual(grid.getValue(0, 1), 0.0, 'Land mask must never become 0.0°C');
  });

  test('Rejects coordinate and data dimension mismatches', () => {
    assert.throws(
      () =>
        normalizeOceanModelGrid({
          datasetId: 'SDC_GLO_CLIM_TS_V2_2',
          latitudes: [10, 11], // 2 lats
          longitudes: [65, 66], // 2 lons -> Expected 4 elements
          data: new Float32Array([28.0, 28.1]), // Provided only 2
        }),
      /Data length.*does not match grid dimensions/
    );
  });

  test('Parses raw ERDDAP griddap JSON tabular response', () => {
    const griddapJson = {
      table: {
        columnNames: ['time', 'depth', 'latitude', 'longitude', 'Temperature'],
        rows: [
          ['2010-01-16T00:00:00Z', 5, 10.0, 65.0, 27.5],
          ['2010-01-16T00:00:00Z', 5, 10.0, 66.0, 27.8],
          ['2010-01-16T00:00:00Z', 5, 11.0, 65.0, 27.2],
          ['2010-01-16T00:00:00Z', 5, 11.0, 66.0, 27.6],
        ],
      },
    };

    const grid = parseGriddapModelResponse(griddapJson, {
      datasetId: 'SDC_GLO_CLIM_TS_V2_2',
      variable: 'temperature',
      unit: '°C',
      depthMeters: 5,
    });

    assert.equal(grid.dimensions.latCount, 2);
    assert.equal(grid.dimensions.lonCount, 2);
    assert.equal(grid.getValue(0, 0), 27.5);
    assert.equal(grid.getValue(1, 1), 27.6);
  });
});
