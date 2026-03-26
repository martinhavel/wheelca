'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { searchNominatim } from '../lib/api';
import { t } from '../lib/i18n';

export default function SearchBar({ onSelect, lang }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef(null);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const doSearch = useCallback(async (q) => {
    if (q.length < 3) { setResults([]); setOpen(false); return; }
    setLoading(true);
    try {
      const data = await searchNominatim(q);
      setResults(data);
      setOpen(data.length > 0);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(val), 350);
  };

  const handleSelect = (r) => {
    setQuery(r.display_name.split(',').slice(0, 2).join(','));
    setOpen(false);
    onSelect([parseFloat(r.lat), parseFloat(r.lon)], r.display_name);
  };

  return (
    <div className="search-wrapper" ref={wrapperRef}>
      <div className="search-box">
        <svg className="search-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          placeholder={t('searchPlaceholder', lang)}
          value={query}
          onChange={handleChange}
          onFocus={() => results.length && setOpen(true)}
          className="search-input"
        />
        {query && (
          <button className="search-clear" onClick={() => { setQuery(''); setResults([]); setOpen(false); }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        )}
        {loading && <div className="search-spinner" />}
      </div>
      {open && results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.place_id} onClick={() => handleSelect(r)}>
              <span className="sr-name">{r.display_name.split(',')[0]}</span>
              <span className="sr-detail">{r.display_name.split(',').slice(1, 3).join(',')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
