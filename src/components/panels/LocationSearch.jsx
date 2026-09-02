/**
 * OceanView — Scientific Location Search Engine
 * Supports decimal coordinates, cardinal notation (15.2N 68.4E), DMS notation (15°12'N 68°24'E),
 * and known scientific marine sectors with instant autocomplete.
 */

import React, { useState, useMemo } from 'react';
import { Search, MapPin, Compass, AlertCircle } from 'lucide-react';
import { useOceanView } from '../../app/AppContext.jsx';
import { globalCameraController } from '../../engine/rendering/CentralizedCameraController.js';
import {
  parseCoordinateQuery,
  isOceanLocation,
  AnalysisLocationSource,
} from '../../engine/ocean/analysisLocation.js';

const SCIENTIFIC_SEARCH_REGIONS = [
  { name: 'Arabian Sea Basin', lat: 15.0, lon: 65.0, keywords: ['arabian', 'arabian sea'] },
  { name: 'Bay of Bengal Basin', lat: 14.0, lon: 88.0, keywords: ['bob', 'bay of bengal', 'bengal'] },
  { name: 'Equatorial Indian Ocean', lat: 0.0, lon: 80.0, keywords: ['equator', 'equatorial', 'eio'] },
  { name: 'Lakshadweep Sea', lat: 10.5, lon: 72.5, keywords: ['lakshadweep', 'laccadive'] },
  { name: 'Maldives Archipelago', lat: 3.2, lon: 73.2, keywords: ['maldives'] },
  { name: 'Somali Upwelling Current', lat: 8.5, lon: 51.5, keywords: ['somali', 'somalia', 'upwelling'] },
  { name: 'Gulf of Aden', lat: 12.5, lon: 47.5, keywords: ['aden', 'gulf of aden'] },
  { name: 'Gulf of Oman', lat: 24.5, lon: 58.5, keywords: ['oman', 'gulf of oman'] },
  { name: 'Andaman Sea Basin', lat: 10.0, lon: 95.0, keywords: ['andaman', 'andaman sea'] },
  { name: 'Southern Ocean Sector', lat: -50.0, lon: 75.0, keywords: ['southern ocean', 'antarctic'] },
];

export default function LocationSearch() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { setAnalysisLocation } = useOceanView();

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return SCIENTIFIC_SEARCH_REGIONS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.keywords.some((k) => k.includes(q))
    ).slice(0, 4);
  }, [query]);

  const executeSearchAt = (lat, lon, source = AnalysisLocationSource.SEARCH) => {
    setError('');

    const oceanCheck = isOceanLocation(lat, lon);
    if (!oceanCheck.isOcean) {
      setError(oceanCheck.reason || 'Selected coordinates are on land.');
      return;
    }

    setAnalysisLocation({
      latitude: lat,
      longitude: lon,
      source,
    });

    globalCameraController.spiralIn({ lat, lon }, 850000);
    setQuery('');
    setIsFocused(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setError('');

    const clean = query.trim();
    if (!clean) return;

    // Check if query matches a known region exactly or closely
    const matchedRegion = SCIENTIFIC_SEARCH_REGIONS.find(
      (r) => r.name.toLowerCase() === clean.toLowerCase() || r.keywords.includes(clean.toLowerCase())
    );

    if (matchedRegion) {
      executeSearchAt(matchedRegion.lat, matchedRegion.lon);
      return;
    }

    // Attempt coordinate parse (decimal, cardinal, DMS)
    const parsed = parseCoordinateQuery(clean);
    if (parsed.valid) {
      executeSearchAt(parsed.latitude, parsed.longitude);
    } else {
      setError(parsed.error || 'Enter coordinates (e.g. 15.2N 68.4E or 15.2, 68.4) or region name');
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '8px 12px', marginTop: '12px', position: 'relative' }}>
      <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <MapPin style={{ width: '14px', height: '14px', color: '#38bdf8', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="Search 15.2N 68.4E or Basin..."
          value={query}
          onFocus={() => setIsFocused(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError('');
          }}
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc',
            padding: '5px 8px',
            borderRadius: '4px',
            fontSize: '11px',
            flex: 1,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          className="btn-sci"
          style={{ padding: '5px 9px', flexShrink: 0 }}
          title="Search coordinate or region"
        >
          <Search style={{ width: '12px', height: '12px' }} />
        </button>
      </form>

      {/* Autocomplete Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            zIndex: 50,
            overflow: 'hidden',
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.name}
              type="button"
              onMouseDown={() => executeSearchAt(s.lat, s.lon)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                color: '#e2e8f0',
                fontSize: '11px',
                textAlign: 'left',
                cursor: 'pointer',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(56,189,248,0.15)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Compass style={{ width: '12px', height: '12px', color: '#38bdf8' }} />
                <span>{s.name}</span>
              </span>
              <span style={{ fontSize: '10px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                {s.lat}°N, {s.lon}°E
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '10px',
            color: '#f87171',
            marginTop: '6px',
          }}
        >
          <AlertCircle style={{ width: '11px', height: '11px', flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
