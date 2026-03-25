'use client';

import { useState } from 'react';
import { FILTER_GROUPS, WHEELCHAIR_COLORS, WHEELCHAIR_LABELS, SCORE_COLORS, SCORE_LABELS } from '../lib/constants';

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
            <div className="brand-title">Wheelca</div>
            <div className="brand-subtitle">Bezbariérová mapa</div>
          </div>
        </div>

        {/* Quick stats */}
        {stats && (
          <div className="stats-row">
            <div className="stat-pill stat-green">
              <span className="stat-num">{stats.accessible_pois || 0}</span>
              <span>přístupných</span>
            </div>
            <div className="stat-pill stat-blue">
              <span className="stat-num">{stats.total_toilets || 0}</span>
              <span>WC</span>
            </div>
            <div className="stat-pill stat-gray">
              <span className="stat-num">{stats.total_footways || 0}</span>
              <span>chodníků</span>
            </div>
          </div>
        )}

        {/* Quick actions */}
        <div className="quick-actions">
          <button className="btn btn-primary btn-block" onClick={onLocate}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
            </svg>
            Moje poloha
          </button>
          <button className="btn btn-wc btn-block" onClick={onFindWc}>
            <span style={{ fontSize: 16 }}>🚻</span>
            Nejbližší WC
          </button>
        </div>

        {/* Category filters */}
        <Section title="Filtr kategorií">
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
                Vše
              </button>
            )}
          </div>
        </Section>

        {/* Layers */}
        <Section title="Vrstvy">
          {[
            ['pois', 'Místa a budovy'],
            ['footways', 'Chodníky'],
            ['barriers', 'Bariéry'],
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
        <Section title="Navigace">
          {!routeMode && !route && (
            <button className="btn btn-outline btn-block" onClick={() => setRouteMode('start')}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 11l19-9-9 19-2-8-8-2z"/>
              </svg>
              Naplánovat trasu
            </button>
          )}

          {routeMode === 'start' && (
            <div className="route-instruction">
              <div className="route-dot green" />
              <span>Klikněte na mapu — <b>výchozí bod</b></span>
            </div>
          )}
          {routeMode === 'end' && (
            <div className="route-instruction">
              <div className="route-dot red" />
              <span>Klikněte na mapu — <b>cíl</b></span>
            </div>
          )}

          {routeInfo && (
            <div className="route-card">
              {routeInfo.engine !== 'osrm-foot' ? (
                <div className="route-badge route-badge-green">
                  ♿ Bezbariérová trasa
                </div>
              ) : (
                <div className="route-badge route-badge-yellow">
                  🚶 Pěší trasa (bez wheelchair dat)
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
              <button className="btn btn-ghost btn-sm" onClick={onClearRoute}>Zrušit trasu</button>
            </div>
          )}
        </Section>

        {/* Import */}
        <Section title="Data" defaultOpen={false}>
          <button className="btn btn-outline btn-block btn-sm" onClick={onImport} disabled={loading}>
            {loading ? 'Načítám...' : 'Načíst data z OSM'}
          </button>
          <p className="text-muted text-xs" style={{ marginTop: 6 }}>
            Importuje místa, chodníky a WC z OpenStreetMap pro zobrazený výřez. Přibližte mapu (zoom 14+).
          </p>
        </Section>

        {/* Legend */}
        <Section title="Legenda" defaultOpen={false}>
          <div className="legend-group">
            <div className="legend-title">Místa</div>
            {Object.entries(WHEELCHAIR_COLORS).map(([key, color]) => (
              <div className="legend-row" key={key}>
                <div className="legend-dot" style={{ background: color }} />
                <span>{WHEELCHAIR_LABELS[key]}</span>
              </div>
            ))}
          </div>
          <div className="legend-group">
            <div className="legend-title">Chodníky</div>
            {[1, 2, 3, 0].map(score => (
              <div className="legend-row" key={score}>
                <div className="legend-line" style={{ background: SCORE_COLORS[score] }} />
                <span>{SCORE_LABELS[score]}</span>
              </div>
            ))}
          </div>
          <p className="text-muted text-xs" style={{ marginTop: 8 }}>
            Pravý klik na mapu = nahlásit bariéru
          </p>
        </Section>

        <div className="sidebar-footer">
          Data © <a href="https://www.openstreetmap.org" target="_blank" rel="noopener">OpenStreetMap</a>
        </div>
      </div>
    </>
  );
}
