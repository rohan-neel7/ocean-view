import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  getCardinalDirection,
  formatFlowSpeed,
  WeatherMarkersLayer,
} from '../../src/visualization/weather/WeatherMarkersLayer.js';

describe('WeatherMarkersLayer — Metrics & Conventions', () => {
  test('getCardinalDirection accurately maps 360-degree bearings to 16 cardinal points', () => {
    assert.equal(getCardinalDirection(0), 'N');
    assert.equal(getCardinalDirection(360), 'N');
    assert.equal(getCardinalDirection(90), 'E');
    assert.equal(getCardinalDirection(180), 'S');
    assert.equal(getCardinalDirection(270), 'W');
    assert.equal(getCardinalDirection(45), 'NE');
    assert.equal(getCardinalDirection(135), 'SE');
    assert.equal(getCardinalDirection(225), 'SW');
    assert.equal(getCardinalDirection(315), 'NW');
    assert.equal(getCardinalDirection(158), 'SSE');
    assert.equal(getCardinalDirection(200), 'SSW');
    assert.equal(getCardinalDirection(null), '—');
    assert.equal(getCardinalDirection(NaN), '—');
  });

  test('formatFlowSpeed converts m/s to knots and km/h and categorizes flow tiers', () => {
    // 1 m/s ~= 1.94 kt ~= 3.6 km/h
    const stats1 = formatFlowSpeed(1.0);
    assert.equal(stats1.ms, '1.00');
    assert.equal(stats1.kts, '1.94');
    assert.equal(stats1.kmh, '3.6');
    assert.equal(stats1.tier, 'Strong Jet (2.0 - 3.0 kt)');

    // 0.4 m/s ~= 0.78 kt ~= 1.4 km/h
    const stats2 = formatFlowSpeed(0.4);
    assert.equal(stats2.ms, '0.40');
    assert.equal(stats2.kts, '0.78');
    assert.equal(stats2.kmh, '1.4');
    assert.equal(stats2.tier, 'Gentle Current (0.6 - 1.2 kt)');

    // Null safety
    const nullStats = formatFlowSpeed(null);
    assert.equal(nullStats.ms, '—');
    assert.equal(nullStats.tier, 'Unknown');
  });

  test('WeatherMarkersLayer instantiates and cleans up safely with mock viewer', () => {
    const mockDataSources = {
      added: [],
      add(ds) {
        this.added.push(ds);
      },
      remove(ds) {
        this.added = this.added.filter((item) => item !== ds);
      },
    };

    const mockViewer = {
      isDestroyed: () => false,
      dataSources: mockDataSources,
    };

    const layer = new WeatherMarkersLayer(mockViewer);
    assert.equal(layer.dataSource, null);

    // Call update with null grids safely
    layer.update({ scalarGrid: null, vectorGrid: null });
    assert.equal(layer.dataSource, null);

    // Teardown
    layer.destroy();
    assert.equal(layer.dataSource, null);
  });
});
