'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { fetchPois, fetchFootways, fetchBarriers, fetchRoute, fetchNearestPois, reportBarrier, fetchStats, importOsmPois, importOsmFootways, importOsmToilets, submitRating } from '../lib/api';
import { getFeatures, filterByBounds, savePendingBarrier, getPendingBarriers, clearPendingBarriers, savePendingRating, getOfflineStatus } from '../lib/offlineStorage';
import { buildGraph, findRoute as offlineRoute, PROFILES as ROUTE_PROFILES } from '../lib/offlineRouter';
import { t, getLang, setLang, SUPPORTED_LANGS, getSurface, getSmoothness, getCategory } from '../lib/i18n';
import { CITIES } from '../lib/cities';
import OfflineManager from './OfflineManager';

const SCORE_COLORS = { 0: '#888', 1: '#22c55e', 2: '#eab308', 3: '#ef4444' };

const WHEELCHAIR_ICONS = {
  yes: '#22c55e',
  limited: '#eab308',
  no: '#ef4444',
  unknown: '#888'
};

function getScoreLabel(score, lang) {
  const keys = { 0: 'scoreUnknown', 1: 'scoreGood', 2: 'scoreLimited', 3: 'scoreBad' };
  return t(keys[score], lang);
}

function getWheelchairLabel(value, lang) {
  const keys = { yes: 'wheelchairYes', limited: 'wheelchairLimited', no: 'wheelchairNo', unknown: 'wheelchairUnknown' };
  return t(keys[value] || 'wheelchairUnknown', lang);
}

function getBarrierTypes(lang) {
  return [
    { value: 'steps', label: t('barrierSteps', lang) },
    { value: 'high_kerb', label: t('barrierKerb', lang) },
    { value: 'narrow_passage', label: t('barrierNarrow', lang) },
    { value: 'steep_slope', label: t('barrierSlope', lang) },
    { value: 'bad_surface', label: t('barrierSurface', lang) },
    { value: 'construction', label: t('barrierConstruction', lang) },
    { value: 'no_ramp', label: t('barrierNoRamp', lang) },
    { value: 'other', label: t('barrierOther', lang) }
  ];
}

function createCircleIcon(color) {
  return L.divIcon({
    html: `<div style="width:12px;height:12px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>`,
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function createBarrierIcon() {
  return L.divIcon({
    html: '<div style="width:16px;height:16px;background:#ef4444;border:2px solid white;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold;box-shadow:0 1px 3px rgba(0,0,0,0.5)">!</div>',
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
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
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (!data?.features?.length) return;
    layerRef.current = L.geoJSON(data, {
      style: (feature) => ({
        color: SCORE_COLORS[feature.properties.accessibility_score] || '#888',
        weight: 4,
        opacity: 0.8
      }),
      onEachFeature: (feature, layer) => {
        const p = feature.properties;
        layer.bindPopup(
          '<b>' + t('sidewalk', lang) + '</b><br/>' +
          t('surface', lang) + ': ' + (getSurface(p.surface, lang) || p.surface || '?') + '<br/>' +
          t('smoothness', lang) + ': ' + (getSmoothness(p.smoothness, lang) || p.smoothness || '?') + '<br/>' +
          t('slope', lang) + ': ' + (p.incline || '?') + '<br/>' +
          t('accessibility', lang) + ': ' + getScoreLabel(p.accessibility_score, lang)
        );
      }
    }).addTo(map);
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [data, map, lang]);
  return null;
}

function FitBounds({ routeId, bounds }) {
  const map = useMap();
  const fittedRef = useRef(null);
  useEffect(() => {
    if (bounds && routeId && fittedRef.current !== routeId) {
      fittedRef.current = routeId;
      map.fitBounds(bounds, { padding: [50, 50] });
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

function generateGpx(route, routeInfo) {
  const feat = route.features?.[0];
  if (!feat) return null;
  const coords = feat.geometry?.coordinates || [];
  const distStr = routeInfo?.dist ? (routeInfo.dist / 1000).toFixed(1) + ' km' : '';
  const durStr = routeInfo?.dur ? Math.round(routeInfo.dur / 60) + ' min' : '';
  const name = 'Wheelchair route' + (distStr ? ' - ' + distStr : '') + (durStr ? ', ' + durStr : '');

  let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
  gpx += '<gpx version="1.1" creator="WheelchairMap" xmlns="http://www.topografix.com/GPX/1/1">\n';
  gpx += '  <metadata><name>' + name + '</name></metadata>\n';
  gpx += '  <trk>\n';
  gpx += '    <name>' + name + '</name>\n';
  gpx += '    <trkseg>\n';
  for (const c of coords) {
    // GeoJSON is [lng, lat], GPX wants lat/lon
    gpx += '      <trkpt lat="' + c[1] + '" lon="' + c[0] + '"></trkpt>\n';
  }
  gpx += '    </trkseg>\n';
  gpx += '  </trk>\n';
  gpx += '</gpx>\n';
  return gpx;
}

function downloadGpx(route, routeInfo) {
  const gpx = generateGpx(route, routeInfo);
  if (!gpx) return;
  const blob = new Blob([gpx], { type: 'application/gpx+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'wheelchair-route.gpx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildShareUrl(routeStart, routeEnd, routeProfile, city) {
  const base = window.location.origin + window.location.pathname;
  const params = new URLSearchParams();
  if (routeStart) params.set('start', routeStart[0] + ',' + routeStart[1]);
  if (routeEnd) params.set('end', routeEnd[0] + ',' + routeEnd[1]);
  params.set('profile', routeProfile);
  params.set('city', city);
  return base + '?' + params.toString();
}

function parseUrlParams() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const startStr = params.get('start');
  const endStr = params.get('end');
  const profile = params.get('profile');
  const city = params.get('city');
  if (!startStr || !endStr) return null;
  const startParts = startStr.split(',').map(Number);
  const endParts = endStr.split(',').map(Number);
  if (startParts.length !== 2 || endParts.length !== 2) return null;
  if (startParts.some(isNaN) || endParts.some(isNaN)) return null;
  return {
    start: startParts, // [lng, lat]
    end: endParts,     // [lng, lat]
    profile: profile || 'accessible',
    city: city || 'prague',
  };
}

export default function MapView() {
  const [pois, setPois] = useState(null);
  const [footways, setFootways] = useState(null);
  const [barriers, setBarriers] = useState(null);
  const [route, setRoute] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportPos, setReportPos] = useState(null);
  const [routeMode, setRouteMode] = useState(null);
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [layers, setLayers] = useState({ pois: true, footways: true, barriers: true });
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  const [offlineData, setOfflineData] = useState(null);
  const [routeProfile, setRouteProfile] = useState('accessible');
  const [showRating, setShowRating] = useState(null); // POI feature to rate
  const [lang, setLangState] = useState('cs');
  const [city, setCity] = useState('prague'); // for offline data packages
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const mapRef = useRef(null);
  const lastImportRef = useRef(0);
  const graphRef = useRef(null);
  const graphBuildingRef = useRef(false);
  const autoRouteRef = useRef(false);

  // Initialize lang and city from localStorage
  useEffect(() => {
    setLangState(getLang());
    const savedCity = localStorage.getItem('wheelca-city');
    if (savedCity && CITIES[savedCity]) {
      setCity(savedCity);
    }
  }, []);

  // Auto-route from URL params on page load
  useEffect(() => {
    if (autoRouteRef.current) return;
    const urlParams = parseUrlParams();
    if (!urlParams) return;
    autoRouteRef.current = true;

    if (urlParams.city && CITIES[urlParams.city]) {
      setCity(urlParams.city);
      localStorage.setItem('wheelca-city', urlParams.city);
    }
    if (urlParams.profile) {
      setRouteProfile(urlParams.profile);
    }
    setRouteStart(urlParams.start);
    setRouteEnd(urlParams.end);

    // Delay routing until map is ready
    const timer = setTimeout(async () => {
      const start = urlParams.start;
      const end = urlParams.end;
      let result;
      if (graphRef.current && urlParams.profile !== 'server') {
        result = offlineRoute(graphRef.current, start[0], start[1], end[0], end[1], urlParams.profile);
      } else {
        try {
          result = await fetchRoute(start, end);
        } catch (e) {
          return;
        }
      }
      if (result && !result.error) {
        setRoute(result);
        const feat = result.features?.[0];
        const props = feat?.properties;
        const dist = props?.summary?.distance;
        const dur = props?.summary?.duration;
        const engine = props?.engine || 'ors';
        const warning = props?.warning;
        const accessibility = props?.accessibility;
        setRouteInfo({ dist, dur, engine, warning, accessibility, steps: props?.segments?.[0]?.steps });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleLangChange = (l) => {
    setLangState(l);
    setLang(l);
  };

  const handleCityChange = (newCity) => {
    if (!CITIES[newCity] || newCity === city) return;
    setCity(newCity);
    localStorage.setItem('wheelca-city', newCity);
    // Clear existing data for fresh load
    setPois(null);
    setFootways(null);
    setBarriers(null);
    setRoute(null);
    setRouteInfo(null);
    setRouteStart(null);
    setRouteEnd(null);
    graphRef.current = null;
    const cityName = CITIES[newCity].name[lang] || CITIES[newCity].name.en;
    showToast(cityName + '...');
    // Data will reload via DataLoader's moveend event after flyTo
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      showToast(t('geoNotSupported', lang));
      return;
    }
    showToast(t('geoLocating', lang));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16, { duration: 1.5 });
        }
      },
      () => showToast(t('geoError', lang)),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        'https://nominatim.openstreetmap.org/search?format=json&limit=5&q=' +
        encodeURIComponent(searchQuery)
      );
      const data = await res.json();
      if (data.length === 0) {
        showToast(t('searchNoResults', lang));
        return;
      }
      if (data.length === 1 || data[0].importance > 0.5) {
        // Go directly to first result
        const r = data[0];
        if (mapRef.current) {
          mapRef.current.flyTo([parseFloat(r.lat), parseFloat(r.lon)], 16, { duration: 1.5 });
        }
        setSearchQuery('');
        setSearchResults(null);
      } else {
        setSearchResults(data);
      }
    } catch (err) {
      showToast(t('searchError', lang));
    }
  };

  const handleSearchResultClick = (result) => {
    if (mapRef.current) {
      mapRef.current.flyTo([parseFloat(result.lat), parseFloat(result.lon)], 16, { duration: 1.5 });
    }
    setSearchQuery('');
    setSearchResults(null);
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  // Load offline data cache into memory + build routing graph
  useEffect(() => {
    async function loadOfflineCache() {
      const status = await getOfflineStatus();
      if (status.hasData) {
        const [allPois, allFootways, allBarriers] = await Promise.all([
          getFeatures('pois'),
          getFeatures('footways'),
          getFeatures('barriers')
        ]);
        setOfflineData({ pois: allPois, footways: allFootways, barriers: allBarriers });
        // Build routing graph in background
        if (!graphRef.current && !graphBuildingRef.current) {
          graphBuildingRef.current = true;
          setTimeout(() => {
            graphRef.current = buildGraph(allFootways);
            graphBuildingRef.current = false;
          }, 100);
        }
      }
    }
    loadOfflineCache();
  }, []);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  useEffect(() => {
    if (!isOffline) {
      fetchStats().then(setStats).catch(() => {});
    }
  }, [isOffline]);

  // Sync pending barriers when coming back online
  useEffect(() => {
    if (!isOffline) {
      getPendingBarriers().then(async (pending) => {
        if (pending.length === 0) return;
        let synced = 0;
        for (const b of pending) {
          try {
            await reportBarrier(b);
            synced++;
          } catch (e) { /* retry next time */ }
        }
        if (synced > 0) {
          await clearPendingBarriers();
          showToast(t('toastSynced', lang) + ' ' + synced + ' ' + t('toastBarriersSync', lang));
        }
      });
    }
  }, [isOffline]);

  const loadDataFromOffline = useCallback((map) => {
    if (!offlineData) return;
    const bounds = map.getBounds();
    if (layers.pois) {
      const filtered = filterByBounds(offlineData.pois, bounds);
      setPois({ type: 'FeatureCollection', features: filtered.slice(0, 2000) });
    }
    if (layers.footways) {
      const filtered = filterByBounds(offlineData.footways, bounds);
      setFootways({ type: 'FeatureCollection', features: filtered.slice(0, 10000) });
    }
    if (layers.barriers) {
      const filtered = filterByBounds(offlineData.barriers, bounds);
      setBarriers({ type: 'FeatureCollection', features: filtered });
    }
  }, [offlineData, layers]);

  const loadData = useCallback(async (map) => {
    if (map.getZoom() < 15) return;

    // Offline mode - load from IndexedDB
    if (isOffline) {
      loadDataFromOffline(map);
      return;
    }

    const bounds = map.getBounds();

    const [poisData, footwaysData, barriersData] = await Promise.all([
      layers.pois ? fetchPois(bounds) : null,
      layers.footways ? fetchFootways(bounds) : null,
      layers.barriers ? fetchBarriers(bounds) : null
    ]);
    if (poisData) setPois(poisData);
    if (footwaysData) setFootways(footwaysData);
    if (barriersData) setBarriers(barriersData);

    const now = Date.now();
    if (now - lastImportRef.current < 3000) return;
    lastImportRef.current = now;

    try {
      setLoading(true);
      showToast(t('toastLoadingOSM', lang));
      const [poisResult, footwaysResult, toiletsResult] = await Promise.all([
        importOsmPois(bounds),
        importOsmFootways(bounds),
        importOsmToilets(bounds)
      ]);
      const pi = poisResult?.imported || 0;
      const fi = footwaysResult?.imported || 0;
      const ti = toiletsResult?.imported || 0;
      if (pi || fi || ti) {
        showToast(t('toastLoaded', lang) + ' ' + pi + ' ' + t('toastPlaces', lang) + ', ' + fi + ' ' + t('toastSidewalks', lang) + (ti ? ', ' + ti + ' WC' : ''));
        const [newPois, newFootways] = await Promise.all([fetchPois(bounds), fetchFootways(bounds)]);
        if (newPois) setPois(newPois);
        if (newFootways) setFootways(newFootways);
        fetchStats().then(setStats);
      } else {
        setToast('');
      }
    } catch (e) {
      if (offlineData) {
        loadDataFromOffline(map);
        showToast(t('toastOfflineCache', lang));
      } else {
        showToast(t('toastLoadError', lang));
      }
    }
    setLoading(false);
  }, [layers, isOffline, offlineData, loadDataFromOffline, lang]);

  const handleImport = async () => {
    if (!mapRef.current || isOffline) return;
    setLoading(true);
    const bounds = mapRef.current.getBounds();
    try {
      const [poisResult, footwaysResult, toiletsResult] = await Promise.all([
        importOsmPois(bounds),
        importOsmFootways(bounds),
        importOsmToilets(bounds)
      ]);
      const pi = poisResult?.imported || 0;
      const fi = footwaysResult?.imported || 0;
      const ti = toiletsResult?.imported || 0;
      showToast(t('toastLoaded', lang) + ' ' + pi + ' ' + t('toastPlaces', lang) + ', ' + fi + ' ' + t('toastSidewalks', lang));
      loadData(mapRef.current);
      fetchStats().then(setStats);
    } catch (e) {
      showToast(t('toastLoadError', lang));
    }
    setLoading(false);
  };

  const handleMapClick = async (e) => {
    if (routeMode === 'start') {
      setRouteStart([e.latlng.lng, e.latlng.lat]);
      setRouteMode('end');
      showToast(t('toastClickEnd', lang));
    } else if (routeMode === 'end') {
      const endCoord = [e.latlng.lng, e.latlng.lat];
      setRouteEnd(endCoord);
      setRouteMode(null);
      showToast(t('toastCalculating', lang));

      let result;
      if (isOffline || (graphRef.current && routeProfile !== 'server')) {
        // Use offline router
        if (!graphRef.current) {
          if (offlineData?.footways) {
            showToast(t('toastBuildingGraph', lang));
            graphRef.current = buildGraph(offlineData.footways);
          } else {
            showToast(t('toastNoOfflineData', lang));
            return;
          }
        }
        result = offlineRoute(graphRef.current, routeStart[0], routeStart[1], endCoord[0], endCoord[1], routeProfile);
      } else {
        result = await fetchRoute(routeStart, endCoord);
      }

      if (result.error) {
        showToast(t('cancel', lang) + ': ' + result.error);
      } else {
        setRoute(result);
        const feat = result.features?.[0];
        const props = feat?.properties;
        const dist = props?.summary?.distance;
        const dur = props?.summary?.duration;
        const engine = props?.engine || 'ors';
        const warning = props?.warning;
        const accessibility = props?.accessibility;
        setRouteInfo({ dist, dur, engine, warning, accessibility, steps: props?.segments?.[0]?.steps });
        const distStr = dist ? (dist/1000).toFixed(1) + ' km' : '?';
        const durStr = dur ? Math.round(dur/60) + ' min' : '?';
        if (engine.startsWith('offline-')) {
          showToast(t('toastOfflineRouteLabel', lang) + ' ' + distStr + ', ' + durStr);
        } else if (engine === 'osrm-foot') {
          showToast(t('toastFootRouteLabel', lang) + ' ' + distStr + ', ' + durStr);
        } else {
          showToast(t('toastWheelchairRouteLabel', lang) + ' ' + distStr + ', ' + durStr);
        }
      }
    }
  };

  const handleReportSubmit = async (data) => {
    const barrierData = { ...data, lat: reportPos[0], lng: reportPos[1] };
    if (isOffline) {
      await savePendingBarrier(barrierData);
      showToast(t('toastBarrierOffline', lang));
      setShowReport(false);
      return;
    }
    const result = await reportBarrier(barrierData);
    if (result.id) {
      showToast(t('toastBarrierReported', lang));
      setShowReport(false);
      if (mapRef.current) loadData(mapRef.current);
    }
  };

  const handleRatingSubmit = async (data) => {
    if (isOffline) {
      await savePendingRating(data);
      showToast(t('toastRatingOffline', lang));
    } else {
      const result = await submitRating(data);
      if (result.id) {
        showToast(t('toastRatingSent', lang));
      }
    }
    setShowRating(null);
  };

  const handleDataUpdated = useCallback(() => {
    // Reload offline data after sync
    async function reload() {
      const s = await getOfflineStatus();
      if (s.hasData) {
        const [allPois, allFootways, allBarriers] = await Promise.all([
          getFeatures('pois'),
          getFeatures('footways'),
          getFeatures('barriers')
        ]);
        setOfflineData({ pois: allPois, footways: allFootways, barriers: allBarriers });
        graphRef.current = buildGraph(allFootways);
      }
    }
    reload();
  }, []);

  const handleOfflineStatusChange = useCallback((status) => {
    if (status === 'online' && mapRef.current) {
      loadData(mapRef.current);
    }
  }, [loadData]);

  const handleGpxExport = () => {
    if (route) {
      downloadGpx(route, routeInfo);
    }
  };

  const handleShareUrl = () => {
    if (routeStart && routeEnd) {
      const url = buildShareUrl(routeStart, routeEnd, routeProfile, city);
      navigator.clipboard.writeText(url).then(() => {
        showToast(t('urlCopied', lang));
      }).catch(() => {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast(t('urlCopied', lang));
      });
    }
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

  const initialCenter = CITIES[city]?.center || CITIES.prague.center;

  return (
    <div id="map-container">
      <MapContainer
        center={initialCenter}
        zoom={CITIES[city]?.zoom || 15}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <DataLoader onMoveEnd={loadData} />
        <MapClickHandler />
        <CityFlyTo city={city} />

        {layers.footways && <FootwayLayer data={footways} lang={lang} />}

        {layers.pois && pois?.features?.map(f => (
          <Marker
            key={f.id}
            position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            icon={createCircleIcon(WHEELCHAIR_ICONS[f.properties.wheelchair])}
            eventHandlers={{ click: () => {} }}
          >
            <Popup>
              <b>{f.properties.name || t('noName', lang)}</b><br/>
              {getCategory(f.properties.category, lang) || f.properties.category}<br/>
              {getWheelchairLabel(f.properties.wheelchair, lang)}<br/>
              <button onClick={() => setShowRating(f)} style={{
                marginTop: 4, padding: '3px 8px', background: '#4cc9f0', color: '#1a1a2e',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600
              }}>{t('rateBtn', lang)}</button>
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
              <b>{getBarrierTypes(lang).find(b => b.value === f.properties.barrier_type)?.label}</b><br/>
              {f.properties.description || ''}<br/>
              {t('severity', lang)} {'!'.repeat(f.properties.severity)}<br/>
              {f.properties.verified ? t('verified', lang) : t('unverified', lang)}
            </Popup>
          </Marker>
        ))}

        {route && route.features && (
          <>
            <GeoJSON
              key={'route-' + JSON.stringify(route.features[0]?.geometry?.coordinates?.slice(0,2))}
              data={route}
              style={() => ({ color: '#4cc9f0', weight: 6, opacity: 0.85 })}
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
        {routeStart && (
          <Marker position={[routeStart[1], routeStart[0]]} icon={L.divIcon({
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#22c55e;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
            className: '', iconSize: [14, 14], iconAnchor: [7, 7]
          })} />
        )}
        {routeEnd && (
          <Marker position={[routeEnd[1], routeEnd[0]]} icon={L.divIcon({
            html: '<div style="width:14px;height:14px;border-radius:50%;background:#ef4444;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.5)"></div>',
            className: '', iconSize: [14, 14], iconAnchor: [7, 7]
          })} />
        )}
      </MapContainer>

      {/* Panel */}
      <div className="panel">
        <h2 style={{ flexWrap: 'wrap', gap: 4 }}>
          <span style={{ fontSize: 16 }}>WheelCA</span>
          {isOffline && <span style={{ fontSize: 11, color: '#ef4444', marginLeft: 4, fontWeight: 400 }}>{t('offline', lang)}</span>}
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
            <button className="btn btn-sm" style={{ background: '#333', color: '#4cc9f0', padding: '2px 6px', fontSize: 11 }}
              onClick={() => setShowHelp(!showHelp)}>
              {showHelp ? 'X' : '?'}
            </button>
            {SUPPORTED_LANGS.map(sl => (
              <button key={sl.code}
                className="btn btn-sm"
                style={{
                  padding: '2px 6px', fontSize: 10,
                  background: lang === sl.code ? '#4cc9f0' : '#333',
                  color: lang === sl.code ? '#1a1a2e' : '#666',
                  border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600
                }}
                onClick={() => handleLangChange(sl.code)}>
                {sl.label}
              </button>
            ))}
          </span>
        </h2>

        {/* Search + GPS */}
        <div style={{ display: 'flex', gap: 4, margin: '6px 0 8px' }}>
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: 4 }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder', lang)}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button type="submit" className="btn btn-primary btn-sm" style={{ whiteSpace: 'nowrap' }}>
              {t('searchBtn', lang)}
            </button>
          </form>
          <button className="btn btn-sm" onClick={handleGeolocate}
            style={{ background: '#16213e', border: '1px solid #333', color: '#4cc9f0', fontSize: 16, padding: '4px 8px', cursor: 'pointer', borderRadius: 8 }}
            title={t('geoLocate', lang)}>
            +
          </button>
        </div>

        {/* Search results dropdown */}
        {searchResults && searchResults.length > 1 && (
          <div style={{ background: '#16213e', borderRadius: 8, marginBottom: 8, maxHeight: 150, overflowY: 'auto' }}>
            {searchResults.map((r, i) => (
              <div key={i} onClick={() => handleSearchResultClick(r)}
                style={{ padding: '6px 10px', cursor: 'pointer', borderBottom: '1px solid #333', fontSize: 12, color: '#ccc' }}
                onMouseEnter={(e) => e.target.style.background = '#333'}
                onMouseLeave={(e) => e.target.style.background = 'transparent'}>
                {r.display_name}
              </div>
            ))}
          </div>
        )}

        {showHelp && (
          <div className="help-section">
            <div className="help-block">
              <h4>{t('helpMapTitle', lang)}</h4>
              <p>{t('helpMapText', lang)}</p>
            </div>
            <div className="help-block">
              <h4>{t('helpLinesTitle', lang)}</h4>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#22c55e' }}></div>
                  <span><b>{t('helpGreen', lang).charAt(0).toUpperCase() + t('helpGreen', lang).slice(1)}</b></span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#eab308' }}></div>
                  <span><b>{t('helpYellow', lang).charAt(0).toUpperCase() + t('helpYellow', lang).slice(1)}</b></span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#ef4444' }}></div>
                  <span><b>{t('helpRed', lang).charAt(0).toUpperCase() + t('helpRed', lang).slice(1)}</b></span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#888' }}></div>
                  <span><b>{t('helpGray', lang).charAt(0).toUpperCase() + t('helpGray', lang).slice(1)}</b></span>
                </div>
              </div>
            </div>
            <div className="help-block">
              <h4>{t('helpDotsTitle', lang)}</h4>
              <div className="legend">
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>{t('helpDotGreen', lang).charAt(0).toUpperCase() + t('helpDotGreen', lang).slice(1)}</b></span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>{t('helpDotYellow', lang).charAt(0).toUpperCase() + t('helpDotYellow', lang).slice(1)}</b></span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>{t('helpDotRed', lang).charAt(0).toUpperCase() + t('helpDotRed', lang).slice(1)}</b></span>
                </div>
              </div>
            </div>
            <div className="help-block">
              <h4>{t('helpHowTitle', lang)}</h4>
              <ul>
                <li><b>{t('helpZoom', lang)}</b></li>
                <li><b>{t('helpClick', lang)}</b></li>
                <li><b>{t('helpRoute', lang)}</b></li>
                <li><b>{t('helpRightClick', lang)}</b></li>
                <li><b>{t('helpOffline', lang)}</b></li>
              </ul>
            </div>
          </div>
        )}

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.accessible_pois || 0}</div>
              <div className="stat-label">{t('statAccessible', lang)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.active_barriers || 0}</div>
              <div className="stat-label">{t('statBarriers', lang)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_footways || 0}</div>
              <div className="stat-label">{t('statFootways', lang)}</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_pois || 0}</div>
              <div className="stat-label">{t('statTotal', lang)}</div>
            </div>
          </div>
        )}

        <h3>{t('layers', lang)}</h3>
        <div>
          {[['pois', t('layerPois', lang)], ['footways', t('layerFootways', lang)], ['barriers', t('layerBarriers', lang)]].map(([key, label]) => (
            <label className="layer-toggle" key={key}>
              <input type="checkbox" checked={layers[key]}
                onChange={() => setLayers(l => ({ ...l, [key]: !l[key] }))} />
              {label}
            </label>
          ))}
        </div>

        <h3>{t('navigation', lang)}</h3>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
            {Object.entries(ROUTE_PROFILES).map(([key, p]) => (
              <button key={key}
                className={'btn btn-sm ' + (routeProfile === key ? 'btn-primary' : '')}
                style={routeProfile !== key ? { background: '#333', color: '#aaa' } : {}}
                onClick={() => setRouteProfile(key)}>
                {p.name}
              </button>
            ))}
            {!isOffline && (
              <button
                className={'btn btn-sm ' + (routeProfile === 'server' ? 'btn-primary' : '')}
                style={routeProfile !== 'server' ? { background: '#333', color: '#aaa' } : {}}
                onClick={() => setRouteProfile('server')}>
                {t('server', lang)}
              </button>
            )}
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { setRouteMode('start'); setRoute(null); setRouteInfo(null); showToast(t('toastClickStart', lang)); }}>
            {t('findRoute', lang)}
          </button>
          {route && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => { setRoute(null); setRouteStart(null); setRouteEnd(null); setRouteInfo(null); }}>{t('cancel', lang)}</button>
              <button className="btn btn-sm" style={{ background: '#333', color: '#4cc9f0', border: '1px solid #4cc9f0' }} onClick={handleGpxExport}>
                {t('gpxExport', lang)}
              </button>
              <button className="btn btn-sm" style={{ background: '#333', color: '#4cc9f0', border: '1px solid #4cc9f0' }} onClick={handleShareUrl}>
                {t('shareUrl', lang)}
              </button>
            </>
          )}
        </div>
        {routeMode === 'start' && <p style={{ fontSize: 13, color: '#4cc9f0' }}>{t('clickStart', lang)}</p>}
        {routeMode === 'end' && <p style={{ fontSize: 13, color: '#4cc9f0' }}>{t('clickEnd', lang)}</p>}

        {routeInfo && (
          <div style={{ background: '#16213e', borderRadius: 8, padding: 10, margin: '8px 0', fontSize: 13 }}>
            {routeInfo.engine?.startsWith('offline-') ? (
              <div style={{ background: '#4cc9f022', border: '1px solid #4cc9f0', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: '#4cc9f0', fontSize: 12 }}>
                {t('offlineRoute', lang)} - {routeInfo.engine.includes('accessible') ? t('mostAccessible', lang) : t('shortestRoute', lang)}
              </div>
            ) : routeInfo.engine !== 'osrm-foot' ? (
              <div style={{ background: '#22c55e22', border: '1px solid #22c55e', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: '#22c55e', fontSize: 12 }}>
                {t('wheelchairRoute', lang)}
              </div>
            ) : (
              <div style={{ background: '#eab30822', border: '1px solid #eab308', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: '#eab308', fontSize: 12 }}>
                {t('footRoute', lang)}
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
              <span><b>{routeInfo.dist ? (routeInfo.dist/1000).toFixed(1) : '?'} km</b></span>
              <span>{routeInfo.dur ? Math.round(routeInfo.dur/60) : '?'} min</span>
            </div>
            {routeInfo.accessibility && (
              <div style={{ marginBottom: 6 }}>
                <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 4 }}>
                  {routeInfo.accessibility.good > 0 && <div style={{ width: routeInfo.accessibility.good + '%', background: '#22c55e' }} />}
                  {routeInfo.accessibility.limited > 0 && <div style={{ width: routeInfo.accessibility.limited + '%', background: '#eab308' }} />}
                  {routeInfo.accessibility.bad > 0 && <div style={{ width: routeInfo.accessibility.bad + '%', background: '#ef4444' }} />}
                  {routeInfo.accessibility.unknown > 0 && <div style={{ width: routeInfo.accessibility.unknown + '%', background: '#888' }} />}
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: '#aaa', flexWrap: 'wrap' }}>
                  {routeInfo.accessibility.good > 0 && <span style={{ color: '#22c55e' }}>{routeInfo.accessibility.good}{t('pctAccessible', lang)}</span>}
                  {routeInfo.accessibility.limited > 0 && <span style={{ color: '#eab308' }}>{routeInfo.accessibility.limited}{t('pctLimited', lang)}</span>}
                  {routeInfo.accessibility.bad > 0 && <span style={{ color: '#ef4444' }}>{routeInfo.accessibility.bad}{t('pctBad', lang)}</span>}
                  {routeInfo.accessibility.unknown > 0 && <span style={{ color: '#888' }}>{routeInfo.accessibility.unknown}{t('pctUnknown', lang)}</span>}
                </div>
              </div>
            )}
            {routeInfo.warning && <p style={{ color: '#eab308', fontSize: 11, marginBottom: 6 }}>{routeInfo.warning}</p>}
            {routeInfo.steps && routeInfo.steps.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {routeInfo.steps.map((s, i) => (
                  <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #333', color: '#ccc' }}>
                    {s.instruction}{s.name ? ' - ' + s.name : ''} <span style={{ color: '#888' }}>({s.distance > 1000 ? (s.distance/1000).toFixed(1) + 'km' : Math.round(s.distance) + 'm'})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#888' }}>{t('rightClickHint', lang)}</p>

        {!isOffline && (
          <>
            <h3>{t('importTitle', lang)}</h3>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? t('importing', lang) : t('importBtn', lang)}
            </button>
            <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{t('importDesc', lang)}</p>
          </>
        )}

        <OfflineManager onStatusChange={handleOfflineStatusChange} onDataUpdated={handleDataUpdated} lang={lang} city={city} onCityChange={handleCityChange} />
      </div>

      {/* Report dialog */}
      {showReport && reportPos && (
        <ReportDialog
          position={reportPos}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReport(false)}
          isOffline={isOffline}
          lang={lang}
        />
      )}

      {/* Rating dialog */}
      {showRating && (
        <RatingDialog
          poi={showRating}
          onSubmit={handleRatingSubmit}
          onClose={() => setShowRating(null)}
          isOffline={isOffline}
          lang={lang}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ReportDialog({ position, onSubmit, onClose, isOffline, lang }) {
  const [type, setType] = useState('steps');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState(2);
  const barrierTypes = getBarrierTypes(lang);

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-dialog" onClick={e => e.stopPropagation()}>
        <h2>{t('reportTitle', lang)}</h2>
        {isOffline && (
          <div style={{ background: '#eab30822', border: '1px solid #eab308', borderRadius: 6, padding: '6px 10px', margin: '8px 0', color: '#eab308', fontSize: 12 }}>
            {t('reportOfflineNote', lang)}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
          {t('reportPosition', lang)} {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
        <select value={type} onChange={e => setType(e.target.value)}>
          {barrierTypes.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <textarea placeholder={t('reportDescPlaceholder', lang)} value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label style={{ fontSize: 13 }}>{t('reportSeverity', lang)} {severity}</label>
        <input type="range" min={1} max={3} value={severity} onChange={e => setSeverity(+e.target.value)} />
        <div className="btn-group" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => onSubmit({ barrier_type: type, description: desc, severity })}>
            {t('reportSubmit', lang)}
          </button>
          <button className="btn btn-danger" onClick={onClose}>{t('cancel', lang)}</button>
        </div>
      </div>
    </div>
  );
}

function RatingDialog({ poi, onSubmit, onClose, isOffline, lang }) {
  const [rating, setRating] = useState(poi.properties?.wheelchair || 'yes');
  const [comment, setComment] = useState('');

  const RATING_OPTIONS = [
    { value: 'yes', label: t('rateYes', lang), color: '#22c55e', desc: t('rateYesDesc', lang) },
    { value: 'limited', label: t('rateLimited', lang), color: '#eab308', desc: t('rateLimitedDesc', lang) },
    { value: 'no', label: t('rateNo', lang), color: '#ef4444', desc: t('rateNoDesc', lang) },
  ];

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-dialog" onClick={e => e.stopPropagation()}>
        <h2>{t('rateTitle', lang)}</h2>
        {isOffline && (
          <div style={{ background: '#eab30822', border: '1px solid #eab308', borderRadius: 6, padding: '6px 10px', margin: '8px 0', color: '#eab308', fontSize: 12 }}>
            {t('rateOfflineNote', lang)}
          </div>
        )}
        <p style={{ fontSize: 14, fontWeight: 600, margin: '8px 0', color: '#eee' }}>
          {poi.properties?.name || t('noName', lang)}
        </p>
        <p style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
          {poi.properties?.category || ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
          {RATING_OPTIONS.map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              background: rating === opt.value ? opt.color + '22' : '#16213e',
              border: '2px solid ' + (rating === opt.value ? opt.color : '#333'),
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <input type="radio" name="rating" value={opt.value}
                checked={rating === opt.value}
                onChange={() => setRating(opt.value)}
                style={{ width: 'auto', margin: 0 }} />
              <div>
                <div style={{ color: opt.color, fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                <div style={{ color: '#aaa', fontSize: 11 }}>{opt.desc}</div>
              </div>
            </label>
          ))}
        </div>

        <textarea placeholder={t('rateCommentPlaceholder', lang)} value={comment}
          onChange={e => setComment(e.target.value)} rows={2} />

        <div className="btn-group" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => onSubmit({
            poi_id: poi.id,
            wheelchair_rating: rating,
            comment: comment || null,
          })}>
            {t('rateSubmit', lang)}
          </button>
          <button className="btn btn-danger" onClick={onClose}>{t('cancel', lang)}</button>
        </div>
      </div>
    </div>
  );
}
