'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { fetchPois, fetchFootways, fetchBarriers, fetchRoute, fetchNearestPois, reportBarrier, submitRating, fetchStats, importOsmPois, importOsmFootways, importOsmToilets } from '../lib/api';
import { PRAGUE_CENTER, WHEELCHAIR_COLORS, CATEGORY_ICONS, SCORE_COLORS, FILTER_GROUPS, BARRIER_TYPE_VALUES } from '../lib/constants';
import { t, getLang, setLang, getCategory, getWheelchairLabel, getScoreLabel, getSurface, getSmoothness, getBarrierTypeLabel } from '../lib/i18n';
import { CITIES } from '../lib/cities';
import { getFeatures, filterByBounds, savePendingBarrier, getPendingBarriers, clearPendingBarriers, savePendingRating, getOfflineStatus } from '../lib/offlineStorage';
import { buildGraph, findRoute as offlineRoute, PROFILES as ROUTE_PROFILES } from '../lib/offlineRouter';
import SearchBar from './SearchBar';
import Sidebar from './Sidebar';
import ReportDialog from './ReportDialog';
import RatingDialog from './RatingDialog';

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>';

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
            <div class="popup-title">${t('sidewalk', lang)}</div>
            <div class="popup-row"><span class="popup-label">${t('surface', lang)}</span><span>${getSurface(p.surface, lang) || p.surface || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">${t('smoothness', lang)}</span><span>${getSmoothness(p.smoothness, lang) || p.smoothness || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">${t('slope', lang)}</span><span>${p.incline || '—'}</span></div>
            <div class="popup-row"><span class="popup-label">${t('accessibility', lang)}</span><span style="color:${SCORE_COLORS[p.accessibility_score]}">${getScoreLabel(p.accessibility_score, lang)}</span></div>
          </div>
        `);
      }
    }).addTo(map);
    return () => { if (layerRef.current) map.removeLayer(layerRef.current); };
  }, [data, map, lang]);
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

function CityFlyTo({ city }) {
  const map = useMap();
  const prevCity = useRef(city);
  useEffect(() => {
    if (city !== prevCity.current && CITIES[city]) {
      prevCity.current = city;
      map.flyTo(CITIES[city].center, CITIES[city].zoom, { duration: 1.5 });
    }
  }, [city, map]);
  return null;
}

function buildPoiPopup(p, lang) {
  const tags = p.tags || {};
  const cat = getCategory(p.category, lang);
  const wColor = WHEELCHAIR_COLORS[p.wheelchair] || '#9ca3af';
  const wLabel = getWheelchairLabel(p.wheelchair, lang);
  let extra = '';
  if (p.category === 'toilets') {
    if (tags.fee) extra += `<div class="popup-row"><span class="popup-label">${t('fee', lang)}</span><span>${tags.fee === 'yes' ? t('feeYes', lang) : t('feeNo', lang)}</span></div>`;
    if (tags.opening_hours) extra += `<div class="popup-row"><span class="popup-label">${t('openingHours', lang)}</span><span>${tags.opening_hours}</span></div>`;
    if (tags.access) extra += `<div class="popup-row"><span class="popup-label">${t('access', lang)}</span><span>${tags.access}</span></div>`;
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
  const [lang, setLangState] = useState(getLang());
  const [city, setCity] = useState('prague');
  const [showRating, setShowRating] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineData, setOfflineData] = useState(null);
  const [routeProfile, setRouteProfile] = useState('accessible');
  const mapRef = useRef(null);
  const lastImportRef = useRef(0);
  const graphRef = useRef(null);

  const handleSetLang = (newLang) => {
    setLang(newLang);
    setLangState(newLang);
  };

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3500); };

  // Online/offline detection
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  // Load offline data from IndexedDB when offline
  useEffect(() => {
    if (!isOnline) {
      (async () => {
        try {
          const status = await getOfflineStatus();
          if (status.hasData) {
            const [poisData, footwaysData, barriersData] = await Promise.all([
              getFeatures('pois'), getFeatures('footways'), getFeatures('barriers')
            ]);
            setOfflineData({ pois: poisData, footways: footwaysData, barriers: barriersData });
            // Build routing graph
            if (footwaysData.length > 0 && !graphRef.current) {
              showToast(t('toastBuildingGraph', lang));
              graphRef.current = buildGraph(footwaysData);
            }
            showToast(t('toastOfflineCache', lang));
          } else {
            showToast(t('toastNoOfflineData', lang));
          }
        } catch { showToast(t('toastLoadError', lang)); }
      })();
    }
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchStats().then(setStats).catch(() => {}); }, []);

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

    // Offline mode: load from IndexedDB
    if (!isOnline && offlineData) {
      if (layers.pois) {
        const filtered = filterByBounds(offlineData.pois, bounds);
        setPois({ type: 'FeatureCollection', features: filtered });
      }
      if (layers.footways) {
        const filtered = filterByBounds(offlineData.footways, bounds);
        setFootways({ type: 'FeatureCollection', features: filtered });
      }
      if (layers.barriers) {
        const filtered = filterByBounds(offlineData.barriers, bounds);
        setBarriers({ type: 'FeatureCollection', features: filtered });
      }
      return;
    }

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
  }, [layers, isOnline, offlineData]);

  const handleImport = async () => {
    if (!mapRef.current) return;
    setLoading(true);
    const bounds = mapRef.current.getBounds();
    try {
      const [p, f, w] = await Promise.all([
        importOsmPois(bounds), importOsmFootways(bounds), importOsmToilets(bounds)
      ]);
      showToast(`${t('toastImported', lang)} ${(p?.imported||0)+(w?.imported||0)} ${t('toastImportPlaces', lang)}, ${f?.imported||0} ${t('toastImportSidewalks', lang)}`);
      loadData(mapRef.current);
      fetchStats().then(setStats);
    } catch { showToast(t('toastImportError', lang)); }
    setLoading(false);
  };

  const handleMapClick = async (e) => {
    if (routeMode === 'start') {
      setRouteStart([e.latlng.lng, e.latlng.lat]);
      setRouteMode('end');
      showToast(t('toastClickEnd', lang));
    } else if (routeMode === 'end') {
      const endCoords = [e.latlng.lng, e.latlng.lat];
      setRouteEnd(endCoords);
      setRouteMode(null);
      showToast(t('toastCalculating', lang));

      // Offline routing
      if (!isOnline) {
        if (!graphRef.current) {
          showToast(t('toastNoOfflineData', lang));
          return;
        }
        const result = offlineRoute(graphRef.current, routeStart[0], routeStart[1], endCoords[0], endCoords[1], routeProfile);
        if (result.error) {
          showToast(result.error);
        } else {
          setRoute(result);
          const props = result.features?.[0]?.properties;
          const dist = props?.summary?.distance;
          const dur = props?.summary?.duration;
          setRouteInfo({ dist, dur, engine: props?.engine || 'offline', warning: props?.warning, steps: props?.segments?.[0]?.steps });
          showToast(`${t('toastOfflineRouteLabel', lang)} ${(dist/1000).toFixed(1)} km, ${Math.round(dur/60)} min`);
        }
        return;
      }

      // Online routing
      const result = await fetchRoute(routeStart, endCoords);
      if (result.error) {
        showToast(t('toastRouteError', lang) + result.error);
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

  const handleGpxExport = () => {
    if (!route?.features?.[0]) return;
    const coords = route.features[0].geometry?.coordinates || [];
    const distStr = routeInfo?.dist ? (routeInfo.dist / 1000).toFixed(1) + ' km' : '';
    const durStr = routeInfo?.dur ? Math.round(routeInfo.dur / 60) + ' min' : '';
    const name = 'Wheelchair route' + (distStr ? ' - ' + distStr : '') + (durStr ? ', ' + durStr : '');
    let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
    gpx += `<gpx version="1.1" creator="WheelchairMap" xmlns="http://www.topografix.com/GPX/1/1">\n`;
    gpx += `  <metadata><name>${name}</name></metadata>\n`;
    gpx += `  <trk>\n    <name>${name}</name>\n    <trkseg>\n`;
    for (const cc of coords) { gpx += `      <trkpt lat="${cc[1]}" lon="${cc[0]}"></trkpt>\n`; }
    gpx += `    </trkseg>\n  </trk>\n</gpx>\n`;
    const blob = new Blob([gpx], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'wheelca-route.gpx'; a.click();
    URL.revokeObjectURL(url);
    showToast(t('gpxExported', lang));
  };

  const handleShareUrl = () => {
    if (!routeStart || !routeEnd) return;
    const params = new URLSearchParams();
    params.set('start', routeStart[0] + ',' + routeStart[1]);
    params.set('end', routeEnd[0] + ',' + routeEnd[1]);
    if (city !== 'prague') params.set('city', city);
    const url = window.location.origin + '?' + params.toString();
    navigator.clipboard.writeText(url).then(
      () => showToast(t('urlCopied', lang)),
      () => showToast(t('urlCopied', lang))
    );
  };

  const handleRatingSubmit = async (data) => {
    if (!isOnline) {
      await savePendingRating(data);
      showToast(t('toastRatingOffline', lang));
      setShowRating(null);
      return;
    }
    try {
      await submitRating(data);
      showToast(t('rateSuccess', lang));
      setShowRating(null);
      if (mapRef.current) loadData(mapRef.current);
    } catch {
      showToast(t('rateError', lang));
    }
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const ll = [pos.coords.latitude, pos.coords.longitude];
        setUserPos(ll);
        setFlyTarget(ll);
        showToast(t('toastLocationFound', lang));
      },
      () => showToast(t('toastLocationError', lang))
    );
  };

  const handleFindWc = async (accessibleOnly = false) => {
    showToast(t('toastSearchingWc', lang));
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
      const data = await fetchNearestPois(pos[0], pos[1], 'toilets', accessibleOnly ? 'yes' : null, 3);
      const wc = data?.features?.[0];
      if (!wc) { showToast(t('toastNoWcFound', lang)); return; }

      const coords = wc.geometry.coordinates;
      const dist = wc.properties.distance_m;
      const name = wc.properties.name || 'WC';
      const wh = getWheelchairLabel(wc.properties.wheelchair, lang);
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
      showToast(t('toastEnableLocation', lang));
    }
  };

  const handleSearchSelect = (latlng) => {
    setFlyTarget(latlng);
  };

  const handleReportSubmit = async (data) => {
    const payload = { ...data, lat: reportPos[0], lng: reportPos[1] };
    if (!isOnline) {
      await savePendingBarrier(payload);
      showToast(t('toastBarrierOffline', lang));
      setShowReport(false);
      return;
    }
    const result = await reportBarrier(payload);
    if (result.id) {
      showToast(t('toastBarrierReported', lang));
      setShowReport(false);
      if (mapRef.current) loadData(mapRef.current);
    }
  };

  function MapClickHandler() {
    useMapEvents({
      click: handleMapClick,
      dblclick: (e) => {
        e.originalEvent.preventDefault();
        setUserPos([e.latlng.lat, e.latlng.lng]);
        showToast(t('toastPositionSet', lang));
      },
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
        lang={lang} onSetLang={handleSetLang}
        city={city} onSetCity={setCity}
        onGpxExport={handleGpxExport} onShareUrl={handleShareUrl}
        isOnline={isOnline}
      />

      <div className="map-area">
        <MapContainer center={CITIES[city]?.center || PRAGUE_CENTER} zoom={CITIES[city]?.zoom || 15} style={{ width: '100%', height: '100%' }} ref={mapRef} doubleClickZoom={false}>
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
              eventHandlers={{ dblclick: () => setShowRating(f) }}
            >
              <Popup><div dangerouslySetInnerHTML={{ __html: buildPoiPopup(f.properties, lang) }} /></Popup>
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
                  <div className="popup-title">{getBarrierTypeLabel(f.properties.barrier_type, lang) || t('barrier', lang)}</div>
                  {f.properties.description && <p>{f.properties.description}</p>}
                  <div className="popup-row">
                    <span className="popup-label">{t('severity', lang)}</span>
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
          <button className="map-fab" onClick={handleLocate} title={t('myLocation', lang)}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4m10-10h-4M6 12H2"/>
            </svg>
          </button>
          <button className="map-fab map-fab-wc" onClick={handleFindWc} title={t('nearestWc', lang)}>
            <span style={{ fontSize: 18 }}>🚻</span>
          </button>
        </div>

        {/* Online/Offline indicator */}
        {!isOnline && (
          <div className="offline-badge">{t('offline', lang)}</div>
        )}

        {/* Zoom info */}
        {mapRef.current && mapRef.current.getZoom && mapRef.current.getZoom() < 14 && (
          <div className="zoom-hint">{t('zoomHint', lang)}</div>
        )}
      </div>

      {showReport && reportPos && (
        <ReportDialog position={reportPos} onSubmit={handleReportSubmit} onClose={() => setShowReport(false)} lang={lang} />
      )}

      {showRating && (
        <RatingDialog poi={showRating} onSubmit={handleRatingSubmit} onClose={() => setShowRating(null)} lang={lang} />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
