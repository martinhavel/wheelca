'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { fetchPois, fetchFootways, fetchBarriers, fetchRoute, fetchNearestPois, reportBarrier, fetchStats, importOsmPois, importOsmFootways, importOsmToilets, submitRating } from '../lib/api';
import { getFeatures, filterByBounds, savePendingBarrier, getPendingBarriers, clearPendingBarriers, savePendingRating, getOfflineStatus } from '../lib/offlineStorage';
import { buildGraph, findRoute as offlineRoute, PROFILES as ROUTE_PROFILES } from '../lib/offlineRouter';
import { t, getLang, setLang, SUPPORTED_LANGS, getSurface, getSmoothness, getCategory } from '../lib/i18n';
import { CITIES } from '../lib/cities';
import { PRAGUE_CENTER, WHEELCHAIR_COLORS, WHEELCHAIR_LABELS, CATEGORY_LABELS, CATEGORY_ICONS, SCORE_COLORS, SCORE_LABELS, SURFACE_LABELS, SMOOTHNESS_LABELS, FILTER_GROUPS, BARRIER_TYPES } from '../lib/constants';
import SearchBar from './SearchBar';
import Sidebar from './Sidebar';
import ReportDialog from './ReportDialog';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/">CARTO</a>';

function createPoiIcon(wheelchair, category) {
  const color = WHEELCHAIR_COLORS[wheelchair] || WHEELCHAIR_COLORS.unknown;
  if (category === 'toilets') {
    return L.divIcon({
      html: `<div class="marker-wc" style="border-color:${color}"><span>🚻</span></div>`,
      className: '', iconSize: [28, 28], iconAnchor: [14, 14]
    });
  }
  const icon = CATEGORY_ICONS[category] || '';
  if (icon) {
    return L.divIcon({
      html: `<div class="marker-cat" style="background:${color}"><span>${icon}</span></div>`,
      className: '', iconSize: [24, 24], iconAnchor: [12, 12]
    });
  }
  return L.divIcon({
    html: `<div class="marker-dot" style="background:${color}"></div>`,
    className: '', iconSize: [12, 12], iconAnchor: [6, 6]
  });
}

function createBarrierIcon() {
  return L.divIcon({
    html: `<div class="marker-barrier">!</div>`,
    className: '', iconSize: [20, 20], iconAnchor: [10, 10]
  });
}

function DataLoader({ onMoveEnd }) {
  useMapEvents({ moveend: (e) => onMoveEnd(e.target) });
  return null;
}

function FootwayLayer({ data, lang }) {
  const map = useMap();
  const layerRef = useRef(null);
  useEffect(() => {
    if (layerRef.current) { map.removeLayer(layerRef.current); layerRef.current = null; }
    if (!data?.features?.length) return;
    layerRef.current = L.geoJSON(data, {
      style: (f) => ({ color: SCORE_COLORS[f.properties.accessibility_score] || '#9ca3af', weight: 4, opacity: 0.75 }),
      onEachFeature: (f, layer) => {
        const p = f.properties;
        layer.bindPopup(`
          <div class="popup-card">
            <div class="popup-title">Chodník</div>
            <div class="popup-row"><span class="popup-label">Povrch</span><span>${SURFACE_LABELS[p.surface] || p.surface || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">Hladkost</span><span>${SMOOTHNESS_LABELS[p.smoothness] || p.smoothness || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">Sklon</span><span>${p.incline || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">Přístupnost</span><span style="color:${SCORE_COLORS[p.accessibility_score]}">${SCORE_LABELS[p.accessibility_score]}</span></div>
          </div>
        `);
      }
    }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [data, map]);
  return null;
}

function FitBounds({ routeId, bounds }) {
  const map = useMap();
  const fittedRef = useRef(null);
  useEffect(() => {
    if (bounds && routeId && fittedRef.current !== routeId) {
      fittedRef.current = routeId;
      map.fitBounds(bounds, { padding: [60, 60] });
    }
  }, [routeId, bounds, map]);
  return null;
}

function CityFlyTo({ city }) {
  const map = useMap();
  const prevCityRef = useRef(city);
  useEffect(() => {
    if (prevCityRef.current !== city && CITIES[city]) {
      map.flyTo(CITIES[city].center, CITIES[city].zoom || 15, { duration: 1.5 });
      prevCityRef.current = city;
    }
  }, [city, map]);
  return null;
}

function FlyTo({ target }) {
  const map = useMap();
  const lastRef = useRef(null);
  useEffect(() => {
    if (target && JSON.stringify(target) !== lastRef.current) {
      lastRef.current = JSON.stringify(target);
      map.flyTo(target, 17, { duration: 1 });
    }
  }, [target, map]);
  return null;
}

function buildPoiPopup(p, lang) {
  const tags = p.tags || {};
  const cat = CATEGORY_LABELS[p.category] || p.category;
  const wColor = WHEELCHAIR_COLORS[p.wheelchair] || '#9ca3af';
  const wLabel = WHEELCHAIR_LABELS[p.wheelchair] || p.wheelchair;
  let extra = '';
  if (p.category === 'toilets') {
    if (tags.fee) extra += `<div class="popup-row"><span class="popup-label">Poplatek</span><span>${tags.fee === 'yes' ? 'Ano' : 'Ne'}</span></div>`;
    if (tags.opening_hours) extra += `<div class="popup-row"><span class="popup-label">Otevírací doba</span><span>${tags.opening_hours}</span></div>`;
    if (tags.access) extra += `<div class="popup-row"><span class="popup-label">Přístup</span><span>${tags.access}</span></div>`;
  }
  return `
    <div class="popup-card">
      <div class="popup-title">${p.name || cat}</div>
      ${p.name ? `<div class="popup-cat">${cat}</div>` : ''}
      <div class="popup-badge" style="background:${wColor}20;color:${wColor};border:1px solid ${wColor}">${wLabel}</div>
      ${extra}
    </div>
  `;
}

export default function MapView() {
  const [pois, setPois] = useState(null);
  const [footways, setFootways] = useState(null);
  const [barriers, setBarriers] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportPos, setReportPos] = useState(null);
  const [routeMode, setRouteMode] = useState(null);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [layers, setLayers] = useState({ pois: true, footways: true, barriers: true });
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [flyTarget, setFlyTarget] = useState(null);
  const [userPos, setUserPos] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState(null);
  const [routeProfile, setRouteProfile] = useState('accessible');
  const [showRating, setShowRating] = useState(null);
  const [lang, setLangState] = useState('cs');
  const [city, setCity] = useState('prague');
  const [showHelp, setShowHelp] = useState(false);
  const mapRef = useRef(null);
  const lastImportRef = useRef(0);
  const graphRef = useRef(null);
  const graphBuildingRef = useRef(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  useEffect(() => {
    setLangState(getLang());
    const savedCity = localStorage.getItem('wheelca-city');
    if (savedCity && CITIES[savedCity]) setCity(savedCity);
  }, []);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => { window.removeEventListener('offline', goOffline); window.removeEventListener('online', goOnline); };
  }, []);

  useEffect(() => {
    async function loadOfflineCache() {
      const status = await getOfflineStatus();
      if (status.hasData) {
        const [allPois, allFootways, allBarriers] = await Promise.all([getFeatures('pois'), getFeatures('footways'), getFeatures('barriers')]);
        setOfflineData({ pois: allPois, footways: allFootways, barriers: allBarriers });
        if (!graphRef.current && !graphBuildingRef.current) {
          graphBuildingRef.current = true;
          setTimeout(() => { graphRef.current = buildGraph(allFootways); graphBuildingRef.current = false; }, 100);
        }
      }
    }
    loadOfflineCache();
  }, []);

  useEffect(() => {
    if (!isOffline) {
      getPendingBarriers().then(async (pending) => {
        if (pending.length === 0) return;
        let synced = 0;
        for (const b of pending) { try { await reportBarrier(b); synced++; } catch (e) {} }
        if (synced > 0) { await clearPendingBarriers(); showToast(t('toastSynced', lang) + ' ' + synced + ' ' + t('toastBarriersSync', lang)); }
      });
    }
  }, [isOffline]);

  useEffect(() => {
    if (!isOffline) fetchStats().then(setStats).catch(() => {});
  }, [isOffline]);

  // Filter POIs by active category filters
  const filteredPois = useCallback(() => {
    if (!pois?.features || activeFilters.size === 0) return pois;
    const allowedCategories = new Set();
    FILTER_GROUPS.forEach(g => { if (activeFilters.has(g.key)) g.categories.forEach(c => allowedCategories.add(c)); });
    return {
      ...pois,
      features: pois.features.filter(f => allowedCategories.has(f.properties.category))
    };
  }, [pois, activeFilters]);

  const loadData = useCallback(async (map) => {
    if (map.getZoom() < 14) return;
    const bounds = map.getBounds();

    const [poisData, footwaysData, barriersData] = await Promise.all([
      layers.pois ? fetchPois(bounds) : null,
      layers.footways ? fetchFootways(bounds) : null,
      layers.barriers ? fetchBarriers(bounds) : null
    ]);
    if (poisData) setPois(poisData);
    if (footwaysData) setFootways(footwaysData);
    if (barriersData) setBarriers(barriersData);

    // Auto-import z OSM (cooldown 3s)
    const now = Date.now();
    if (now - lastImportRef.current < 3000) return;
    lastImportRef.current = now;

    try {
      const [poisRes, fwRes, wcRes] = await Promise.all([
        importOsmPois(bounds), importOsmFootways(bounds), importOsmToilets(bounds)
      ]);
      const total = (poisRes?.imported || 0) + (fwRes?.imported || 0) + (wcRes?.imported || 0);
      if (total > 0) {
        const [np, nf] = await Promise.all([fetchPois(bounds), fetchFootways(bounds)]);
        if (np) setPois(np);
        if (nf) setFootways(nf);
        fetchStats().then(setStats);
      }
    } catch {}
  }, [layers, isOffline, offlineData, loadDataFromOffline]);

  const handleImport = async () => {
    if (!mapRef.current) return;
    setLoading(true);
    const bounds = mapRef.current.getBounds();
    try {
      const [p, f, w] = await Promise.all([
        importOsmPois(bounds), importOsmFootways(bounds), importOsmToilets(bounds)
      ]);
      showToast(`Načteno: ${(p?.imported||0)+(w?.imported||0)} míst, ${f?.imported||0} chodníků`);
      loadData(mapRef.current);
      fetchStats().then(setStats);
    } catch { showToast('Chyba při importu'); }
    setLoading(false);
  };

  const handleMapClick = async (e) => {
    if (routeMode === 'start') {
      setRouteStart([e.latlng.lng, e.latlng.lat]);
      setRouteMode('end');
      showToast('Klikněte na cíl trasy');
    } else if (routeMode === 'end') {
      setRouteEnd([e.latlng.lng, e.latlng.lat]);
      setRouteMode(null);
      showToast('Počítám trasu...');
      const result = await fetchRoute(routeStart, [e.latlng.lng, e.latlng.lat]);
      if (result.error) {
        showToast('Chyba: ' + result.error);
      } else {
        setRoute(result);
        const props = result.features?.[0]?.properties;
        const dist = props?.summary?.distance;
        const dur = props?.summary?.duration;
        setRouteInfo({ dist, dur, engine: props?.engine || 'ors', warning: props?.warning, steps: props?.segments?.[0]?.steps });
      }
    }
  };

  const clearRoute = () => {
    setRoute(null); setRouteStart(null); setRouteEnd(null);
    setRouteInfo(null); setRouteMode(null);
  };

  const handleLangChange = (l) => { setLangState(l); setLang(l); };

  const handleCityChange = (newCity) => {
    if (!CITIES[newCity] || newCity === city) return;
    setCity(newCity);
    localStorage.setItem('wheelca-city', newCity);
    setPois(null); setFootways(null); setBarriers(null); setRoute(null); setRouteInfo(null); setRouteStart(null); setRouteEnd(null);
    graphRef.current = null;
    showToast((CITIES[newCity].name[lang] || CITIES[newCity].name.en) + '...');
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(ll);
        setFlyTarget(ll);
        showToast('Poloha nalezena');
      },
      () => showToast('Nepodařilo se zjistit polohu')
    );
  };

  const handleFindWc = async () => {
    showToast('Hledám nejbližší WC...');
    const getPos = () => new Promise((resolve, reject) => {
      if (userPos) return resolve(userPos);
      navigator.geolocation?.getCurrentPosition(
        (p) => resolve([p.coords.latitude, p.coords.longitude]),
        () => reject()
      );
    });

    try {
      const pos = await getPos();
      setUserPos(pos);
      const data = await fetchNearestPois(pos[0], pos[1], 'toilets', null, 1);
      const wc = data?.features?.[0];
      if (!wc) { showToast('Žádné WC v okolí nenalezeno'); return; }

      const coords = wc.geometry.coordinates;
      const dist = wc.properties.distance_m;
      const name = wc.properties.name || 'WC';
      const wh = WHEELCHAIR_LABELS[wc.properties.wheelchair] || '';
      showToast(`${name} (${dist} m) — ${wh}`);

      // Route to it
      const result = await fetchRoute([pos[1], pos[0]], [coords[0], coords[1]]);
      if (!result.error) {
        setRouteStart([pos[1], pos[0]]);
        setRouteEnd([coords[0], coords[1]]);
        setRoute(result);
        const props = result.features?.[0]?.properties;
        setRouteInfo({
          dist: props?.summary?.distance, dur: props?.summary?.duration,
          engine: props?.engine || 'ors', warning: props?.warning,
          steps: props?.segments?.[0]?.steps
        });
      } else {
        setFlyTarget([coords[1], coords[0]]);
      }
    } catch {
      showToast('Zapněte polohu pro nalezení WC');
    }
  };

  const handleSearchSelect = (latlng) => {
    setFlyTarget(latlng);
  };

  const handleReportSubmit = async (data) => {
    const result = await reportBarrier({ ...data, lat: reportPos[0], lng: reportPos[1] });
    if (result.id) {
      showToast('Bariéra nahlášena');
      setShowReport(false);
      if (mapRef.current) loadData(mapRef.current);
    }
  };

  const handleDataUpdated = useCallback(() => {
    async function reload() {
      const s = await getOfflineStatus();
      if (s.hasData) {
        const [allPois, allFootways, allBarriers] = await Promise.all([getFeatures('pois'), getFeatures('footways'), getFeatures('barriers')]);
        setOfflineData({ pois: allPois, footways: allFootways, barriers: allBarriers });
        graphRef.current = buildGraph(allFootways);
      }
    }
    reload();
  }, []);

  const handleOfflineStatusChange = useCallback((status) => {
    if (status === 'online' && mapRef.current) loadData(mapRef.current);
  }, [loadData]);

  function generateGpx(route, routeInfo) {
    const feat = route.features?.[0];
    if (!feat) return null;
    const coords = feat.geometry?.coordinates || [];
    const distStr = routeInfo?.dist ? (routeInfo.dist / 1000).toFixed(1) + ' km' : '';
    const durStr = routeInfo?.dur ? Math.round(routeInfo.dur / 60) + ' min' : '';
    const name = 'Wheelchair route' + (distStr ? ' - ' + distStr : '') + (durStr ? ', ' + durStr : '');
    let gpx = '<?xml version="1.0" encoding="UTF-8"?>
';
    gpx += '<gpx version="1.1" creator="WheelchairMap" xmlns="http://www.topografix.com/GPX/1/1">
';
    gpx += '  <metadata><name>' + name + '</name></metadata>
';
    gpx += '  <trk>
    <name>' + name + '</name>
    <trkseg>
';
    for (const cc of coords) { gpx += '      <trkpt lat="' + cc[1] + '" lon="' + cc[0] + '"></trkpt>
'; }
    gpx += '    </trkseg>
  </trk>
</gpx>
';
    return gpx;
  }

  const handleGpxExport = () => {
    if (!route) return;
    const gpx = generateGpx(route, routeInfo);
    if (!gpx) return;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wheelchair-route.gpx';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleShareUrl = () => {
    if (!routeStart || !routeEnd) return;
    const base = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();
    if (routeStart) params.set('start', routeStart[0] + ',' + routeStart[1]);
    if (routeEnd) params.set('end', routeEnd[0] + ',' + routeEnd[1]);
    params.set('profile', routeProfile);
    params.set('city', city);
    const shareUrl = base + '?' + params.toString();
    navigator.clipboard.writeText(shareUrl).then(() => showToast(t('urlCopied', lang))).catch(() => showToast(t('urlCopied', lang)));
  };

  function MapClickHandler() {
    useMapEvents({
      click: handleMapClick,
      contextmenu: (e) => {
        e.originalEvent.preventDefault();
        setReportPos([e.latlng.lat, e.latlng.lng]);
        setShowReport(true);
      }
    });
    return null;
  }

  const displayPois = filteredPois();

  return (
    <div className="app">
      <SearchBar onSelect={handleSearchSelect} lang={lang} />

      <Sidebar
        layers={layers} setLayers={setLayers}
        activeFilters={activeFilters} setActiveFilters={setActiveFilters}
        stats={stats} routeMode={routeMode} setRouteMode={setRouteMode}
        routeInfo={routeInfo} route={route} onClearRoute={clearRoute}
        loading={loading} onImport={handleImport}
        onLocate={handleLocate} onFindWc={handleFindWc}
        sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen}
      />

      <div className="map-area">
        <MapContainer center={CITIES[city]?.center || PRAGUE_CENTER} zoom={CITIES[city]?.zoom || 15} style={{ width: '100%', height: '100%' }} ref={mapRef}>
          <TileLayer attribution={TILE_ATTR} url={TILE_URL} />
          <DataLoader onMoveEnd={loadData} />
          <MapClickHandler />
          <FlyTo target={flyTarget} />
          <CityFlyTo city={city} />

          {layers.footways && <FootwayLayer data={footways} lang={lang} />}

          {layers.pois && displayPois?.features?.map(f => (
            <Marker
              key={f.id}
              position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
              icon={createPoiIcon(f.properties.wheelchair, f.properties.category)}
            >
              <Popup>
              <div dangerouslySetInnerHTML={{ __html: buildPoiPopup(f.properties, lang) }} />
              <button onClick={() => setShowRating(f)} style={{ marginTop: 4, padding: "3px 8px", background: "var(--primary)", color: "white", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>{t("rateBtn", lang)}</button>
            </Popup>
            </Marker>
          ))}

          {layers.barriers && barriers?.features?.map(f => (
            <Marker
              key={f.id}
              position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
              icon={createBarrierIcon()}
            >
              <Popup>
                <div className="popup-card">
                  <div className="popup-title">{BARRIER_TYPES.find(b => b.value === f.properties.barrier_type)?.label || 'Bariéra'}</div>
                  {f.properties.description && <p>{f.properties.description}</p>}
                  <div className="popup-row">
                    <span className="popup-label">Závažnost</span>
                    <span>{'●'.repeat(f.properties.severity)}{'○'.repeat(3 - f.properties.severity)}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {route?.features && (
            <>
              <GeoJSON
                key={'r-' + JSON.stringify(route.features[0]?.geometry?.coordinates?.slice(0,2))}
                data={route}
                style={() => ({ color: '#2563eb', weight: 5, opacity: 0.85 })}
              />
              <FitBounds
                routeId={JSON.stringify(route.features[0]?.geometry?.coordinates?.slice(0,2))}
                bounds={route.features?.[0]?.bbox ? [
                  [route.features[0].bbox[1], route.features[0].bbox[0]],
                  [route.features[0].bbox[3], route.features[0].bbox[2]]
                ] : null}
              />
            </>
          )}
          {routeStart && <Marker position={[routeStart[1], routeStart[0]]} icon={L.divIcon({ html: '<div class="marker-route green"></div>', className: '', iconSize: [16, 16], iconAnchor: [8, 8] })} />}
          {routeEnd && <Marker position={[routeEnd[1], routeEnd[0]]} icon={L.divIcon({ html: '<div class="marker-route red"></div>', className: '', iconSize: [16, 16], iconAnchor: [8, 8] })} />}
          {userPos && <Marker position={userPos} icon={L.divIcon({ html: '<div class="marker-user"></div>', className: '', iconSize: [18, 18], iconAnchor: [9, 9] })} />}
        </MapContainer>

        {/* Floating map buttons */}
        <div className="map-fab-group">
          <button className="map-fab" onClick={handleLocate} title="Moje poloha">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
            </svg>
          </button>
          <button className="map-fab map-fab-wc" onClick={handleFindWc} title="Nejbližší WC">
            <span style={{ fontSize: 18 }}>🚻</span>
          </button>
        </div>

        {/* Zoom info */}
        {mapRef.current && mapRef.current.getZoom && mapRef.current.getZoom() < 14 && (
          <div className="zoom-hint">Přibližte mapu pro zobrazení dat</div>
        )}
      </div>

      {showReport && reportPos && (
        <ReportDialog position={reportPos} onSubmit={handleReportSubmit} onClose={() => setShowReport(false)} isOffline={isOffline} lang={lang} />
      )}

      
      {showRating && (
        <RatingDialog poi={showRating} onSubmit={handleRatingSubmit} onClose={() => setShowRating(null)} isOffline={isOffline} lang={lang} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}


function RatingDialog({ poi, onSubmit, onClose, isOffline, lang }) {
  const [rating, setRating] = useState(poi.properties?.wheelchair || "yes");
  const [comment, setComment] = useState("");
  const RATING_OPTIONS = [
    { value: "yes", label: t("rateYes", lang), color: "#16a34a", desc: t("rateYesDesc", lang) },
    { value: "limited", label: t("rateLimited", lang), color: "#ca8a04", desc: t("rateLimitedDesc", lang) },
    { value: "no", label: t("rateNo", lang), color: "#dc2626", desc: t("rateNoDesc", lang) },
  ];
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{t("rateTitle", lang)}</h3>
          <button className="btn-icon" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
        {isOffline && <div style={{ background: "#fef9c3", border: "1px solid #ca8a04", borderRadius: 6, padding: "6px 10px", margin: "8px 0", color: "#a16207", fontSize: 12 }}>{t("rateOfflineNote", lang)}</div>}
        <p style={{ fontSize: 14, fontWeight: 600, margin: "8px 0" }}>{poi.properties?.name || t("noName", lang)}</p>
        <p className="text-muted text-sm" style={{ marginBottom: 8 }}>{getCategory(poi.properties?.category, lang)}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, margin: "8px 0" }}>
          {RATING_OPTIONS.map(opt => (
            <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
              background: rating === opt.value ? opt.color + "22" : "var(--surface)",
              border: "2px solid " + (rating === opt.value ? opt.color : "var(--border)"),
              borderRadius: 8, cursor: "pointer" }}>
              <input type="radio" name="rating" value={opt.value} checked={rating === opt.value} onChange={() => setRating(opt.value)} style={{ width: "auto", margin: 0 }} />
              <div>
                <div style={{ color: opt.color, fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                <div className="text-muted text-xs">{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>
        <textarea className="form-input" placeholder={t("rateCommentPlaceholder", lang)} value={comment} onChange={e => setComment(e.target.value)} rows={2} />
        <div className="modal-actions">
          <button className="btn btn-primary" onClick={() => onSubmit({ poi_id: poi.id, wheelchair_rating: rating, comment: comment || null })}>{t("rateSubmit", lang)}</button>
          <button className="btn btn-ghost" onClick={onClose}>{t("cancel", lang)}</button>
        </div>
      </div>
    </div>
  );
}
