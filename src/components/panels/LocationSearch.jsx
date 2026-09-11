/**
 * OceanView — Minimal Floating Scientific Location Search
 * Supports decimal coordinates, cardinal notation (15.2N 68.4E), DMS notation (15°12'N 68°24'E),
 * and known scientific marine sectors with instant autocomplete.
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, MapPin, Compass, AlertCircle, X } from 'lucide-react';
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
  { name: 'Mumbai Coast', lat: 18.92, lon: 72.83, keywords: ['mumbai', 'bombay'] },
  { name: 'Karachi Port', lat: 24.86, lon: 67.00, keywords: ['karachi'] },
  { name: 'Muscat Station', lat: 23.58, lon: 58.40, keywords: ['muscat', 'oman'] },
  { name: 'Kochi Offshore', lat: 9.93, lon: 76.26, keywords: ['kochi', 'cochin'] },
  { name: 'Chennai Port', lat: 13.08, lon: 80.27, keywords: ['chennai', 'madras'] },
];

export default function LocationSearch() {
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const { setAnalysisLocation } = useOceanView();
  const searchContainerRef = useRef(null);

  // Close suggestions when clicked outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 2) return [];
    return SCIENTIFIC_SEARCH_REGIONS.filter(
      (r) => r.name.toLowerCase().includes(q) || r.keywords.some((k) => k.includes(q))
    ).slice(0, 5);
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
      setError(parsed.error || 'Enter coordinates (e.g. 15.2N 68.4E) or location');
    }
  };

  return (
    <div
      ref={searchContainerRef}
      className="floating-search-pill"
      style={{
        width: isFocused || query ? '300px' : '210px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          padding: '4px 10px',
          borderRadius: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--bg-surface)',
          borderColor: isFocused ? 'var(--border-active)' : 'var(--border-subtle)',
          boxShadow: isFocused ? '0 8px 24px rgba(0,0,0,0.6)' : 'var(--glass-shadow)',
        }}
      >
        <Search style={{ width: '13px', height: '13px', color: 'var(--text-secondary)', flexShrink: 0 }} />
        <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={isFocused ? '15.2N 68.4E or Basin...' : 'Search location...'}
            value={query}
            onFocus={() => setIsFocused(true)}
            onChange={(e) => {
              setQuery(e.target.value);
              if (error) setError('');
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-primary)',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
              width: '100%',
              outline: 'none',
            }}
          />
        </form>

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setError('');
            }}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}
          >
            <X style={{ width: '12px', height: '12px' }} />
          </button>
        )}
      </div>

      {/* Error Notice */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--accent-danger-soft)',
            border: '1px solid var(--accent-danger)',
            borderRadius: '6px',
            padding: '6px 10px',
            fontSize: '10px',
            color: '#fca5a5',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 60,
          }}
        >
          <AlertCircle style={{ width: '12px', height: '12px', color: 'var(--accent-danger)' }} />
          <span>{error}</span>
        </div>
      )}

      {/* Autocomplete Suggestions Dropdown */}
      {isFocused && suggestions.length > 0 && (
        <div
          className="sci-dropdown-menu align-left"
          style={{
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
          }}
        >
          <div className="sci-dropdown-header">Oceanographic Suggestions</div>
          {suggestions.map((item) => (
            <button
              key={item.name}
              onMouseDown={() => executeSearchAt(item.lat, item.lon)}
              className="sci-dropdown-item"
              style={{ padding: '7px 12px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MapPin style={{ width: '12px', height: '12px', color: 'var(--accent-teal)' }} />
                <span>{item.name}</span>
              </div>
              <span className="mono-readout" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                {item.lat.toFixed(1)}°, {item.lon.toFixed(1)}°
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
