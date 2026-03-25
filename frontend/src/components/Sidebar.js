'use client';

import { useState } from 'react';
import { FILTER_GROUPS, WHEELCHAIR_COLORS, WHEELCHAIR_LABELS, SCORE_COLORS, SCORE_LABELS } from '../lib/constants';
import { t, SUPPORTED_LANGS } from '../lib/i18n';
import CITIES from '../lib/cities';
import OfflineManager from './OfflineManager';

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="sidebar-section">
      <button className="section-header" onClick={() => setOpen(!open)}>
        <span>{title}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export default function Sidebar({
  layers, setLayers, activeFilters, setActiveFilters,
  stats, routeMode, setRouteMode, routeInfo, route, onClearRoute,
  loading, onImport, onLocate, onFindWc, sidebarOpen, setSidebarOpen
}) {
  return (
    <>
      {/* Mobile toggle */}
      <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        )}
      </button>

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-icon">♿</div>
          <div>
            <div className="brand-title">{t('brandTitle', lang)}</div>
            <div className="brand-subtitle">{t('brandSubtitle', lang)}</div>
          </div>
        </div>

        {/* Quick stats */}
        {stats && (
          <div className="stats-row">
            <div className="stat-pill stat-green">
              <span className="stat-num">{stats.accessible_pois || 0}</span>
              <span>{t('statAccessible', lang)}</span>
            </div>
            <div className="stat-pill stat-blue">
              <span className="stat-num">{stats.total_toilets || 0}</span>
              <span>{t('statToilets', lang)}</span>
            </div>
            <div className="stat-pill stat-gray">
              <span className="stat-num">{stats.total_footways || 0}</span>
              <span>{t('statFootways', lang)}</span>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="quick-actions">
          <button className="btn btn-primary btn-block" onClick={onLocate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
            </svg>
            {t('geoLocate', lang)}
          </button>
          <button className="btn btn-wc btn-block" onClick={onFindWc}>
            <span style={{ fontSize: 16 }}>🚻</span>
            {t('nearestWc', lang)}
          </button>
        </div>

        {/* Category filters */}
        <Section title={t('filterCategories', lang)}>
          <div className="filter-chips">
            {FILTER_GROUPS.map(g => (
              <button
                key={g.key}
                className={`chip ${activeFilters.has(g.key) ? 'chip-active' : ''}`}
                onClick={() => {
                  setActiveFilters(prev => {
                    const next = new Set(prev);
                    next.has(g.key) ? next.delete(g.key) : next.add(g.key);
                    return next;
                  });
                }}
              >
                <span>{g.icon}</span> {g.label}
              </button>
            ))}
            {activeFilters.size > 0 && (
              <button className="chip chip-clear" onClick={() => setActiveFilters(new Set())}>
                {t('filterAll', lang)}
              </button>
            )}
          </div>
        </Section>

        {/* Layers */}
        <Section title={t('layers', lang)}>
          {[
            ['pois', t('layerPois', lang)],
            ['footways', t('layerFootways', lang)],
            ['barriers', t('layerBarriers', lang)],
          ].map(([key, label]) => (
            <label className="layer-row" key={key}>
              <div className={`toggle ${layers[key] ? 'toggle-on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
              <span>{label}</span>
              <input type="checkbox" checked={layers[key]} onChange={() => setLayers(l => ({ ...l, [key]: !l[key] }))} hidden />
            </label>
          ))}
        </Section>

        {/* Route */}
        <Section title={t('navigation', lang)}>
          {routeProfiles && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
              {Object.entries(routeProfiles).map(([key, p]) => (
                <button key={key} className={`chip ${routeProfile === key ? 'chip-active' : ''}`} style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setRouteProfile(key)}>{p.name}</button>
              ))}
              {!isOffline && (
                <button className={`chip ${routeProfile === 'server' ? 'chip-active' : ''}`} style={{ fontSize: 12, padding: '4px 10px' }} onClick={() => setRouteProfile('server')}>{t('server', lang)}</button>
              )}
            </div>
          )}

          {!routeMode && !route && (
            <button className="btn btn-outline btn-block" onClick={() => setRouteMode('start')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
              {t('planRoute', lang)}
            </button>
          )}

          {routeMode === 'start' && (
            <div className="route-instruction">
              <div className="route-dot green" />
              <span>{t('clickMapFor', lang)} <b>{t('clickStartBold', lang)}</b></span>
            </div>
          )}
          {routeMode === 'end' && (
            <div className="route-instruction">
              <div className="route-dot red" />
              <span>{t('clickMapFor', lang)} <b>{t('clickEndBold', lang)}</b></span>
            </div>
          )}

          {routeInfo && (
            <div className="route-card">
              {routeInfo.engine?.startsWith('offline-') ? (
                <div className="route-badge" style={{ background: '#dbeafe', color: '#1e40af' }}>{t('offlineRoute', lang)} - {routeInfo.engine.includes('accessible') ? t('mostAccessible', lang) : t('shortestRoute', lang)}</div>
              ) : routeInfo.engine !== 'osrm-foot' ? (
                <div className="route-badge route-badge-green">
                  ♿ {t('wheelchairRouteShort', lang)}
                </div>
              ) : (
                <div className="route-badge route-badge-yellow">
                  🚶 {t('footRouteShort', lang)}
                </div>
              )}
              <div className="route-summary">
                <div className="route-stat">
                  <span className="route-stat-value">{routeInfo.dist ? (routeInfo.dist/1000).toFixed(1) : '?'}</span>
                  <span className="route-stat-unit">km</span>
                </div>
                <div className="route-stat">
                  <span className="route-stat-value">{routeInfo.dur ? Math.round(routeInfo.dur/60) : '?'}</span>
                  <span className="route-stat-unit">min</span>
                </div>
              </div>
              {routeInfo.accessibility && (
                <div style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                    {routeInfo.accessibility.good > 0 && <div style={{ width: routeInfo.accessibility.good + '%', background: 'var(--green)' }} />}
                    {routeInfo.accessibility.limited > 0 && <div style={{ width: routeInfo.accessibility.limited + '%', background: 'var(--yellow)' }} />}
                    {routeInfo.accessibility.bad > 0 && <div style={{ width: routeInfo.accessibility.bad + '%', background: 'var(--red)' }} />}
                    {routeInfo.accessibility.unknown > 0 && <div style={{ width: routeInfo.accessibility.unknown + '%', background: '#9ca3af' }} />}
                  </div>
                  <div style={{ display: 'flex', gap: 6, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                    {routeInfo.accessibility.good > 0 && <span style={{ color: 'var(--green)' }}>{routeInfo.accessibility.good}{t('pctAccessible', lang)}</span>}
                    {routeInfo.accessibility.limited > 0 && <span style={{ color: 'var(--yellow)' }}>{routeInfo.accessibility.limited}{t('pctLimited', lang)}</span>}
                    {routeInfo.accessibility.bad > 0 && <span style={{ color: 'var(--red)' }}>{routeInfo.accessibility.bad}{t('pctBad', lang)}</span>}
                    {routeInfo.accessibility.unknown > 0 && <span style={{ color: '#9ca3af' }}>{routeInfo.accessibility.unknown}{t('pctUnknown', lang)}</span>}
                  </div>
                </div>
              )}
              {routeInfo.warning && <p className="text-yellow text-sm">{routeInfo.warning}</p>}
              {routeInfo.steps && (
                <div className="route-steps">
                  {routeInfo.steps.map((s, i) => (
                    <div key={i} className="route-step">
                      <span className="step-dist">
                        {s.distance > 1000 ? (s.distance/1000).toFixed(1) + ' km' : Math.round(s.distance) + ' m'}
                      </span>
                      <span>{s.instruction}{s.name ? ` — ${s.name}` : ''}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <button className="btn btn-ghost btn-sm" onClick={onClearRoute}>{t('cancelRoute', lang)}</button>
                <button className="btn btn-outline btn-sm" onClick={onGpxExport}>{t('gpxExport', lang)}</button>
                <button className="btn btn-outline btn-sm" onClick={onShareUrl}>{t('shareUrl', lang)}</button>
              </div>
            </div>
          )}
        </Section>

        {/* Import */}
        <Section title={t('dataSection', lang)} defaultOpen={false}>
          <button className="btn btn-outline btn-block btn-sm" onClick={onImport} disabled={loading}>
            {loading ? t('importing', lang) : t('importBtnOSM', lang)}
          </button>
          <p className="text-muted text-xs" style={{ marginTop: 6 }}>
            {t('importDescFull', lang)}
          </p>
        </Section>

        {/* Offline Manager */}
        <Section title={t('offlinePackages', lang)} defaultOpen={false}>
          <OfflineManager onStatusChange={onOfflineStatusChange} onDataUpdated={onDataUpdated} lang={lang} city={city} onCityChange={onCityChange} />
        </Section>

        {/* Legend */}
        <Section title={t('legendTitle', lang)} defaultOpen={false}>
          <div className="legend-group">
            <div className="legend-title">{t('legendPlaces', lang)}</div>
            {Object.entries(WHEELCHAIR_COLORS).map(([key, color]) => (
              <div className="legend-row" key={key}>
                <div className="legend-dot" style={{ background: color }} />
                <span>{WHEELCHAIR_LABELS[key]}</span>
              </div>
            ))}
          </div>
          <div className="legend-group">
            <div className="legend-title">{t('legendSidewalks', lang)}</div>
            {[1, 2, 3, 0].map(score => (
              <div className="legend-row" key={score}>
                <div className="legend-line" style={{ background: SCORE_COLORS[score] }} />
                <span>{SCORE_LABELS[score]}</span>
              </div>
            ))}
          </div>
          <p className="text-muted text-xs" style={{ marginTop: 8 }}>
            {t('rightClickHint', lang)}
          </p>
        </Section>

        <div className="sidebar-footer">
          Data © <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a> © <a href="https://carto.com/" target="_blank" rel="noopener">CARTO</a>
        </div>
      </div>
    </>
  );
}
