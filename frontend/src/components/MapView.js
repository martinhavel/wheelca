'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { fetchPois, fetchFootways, fetchBarriers, fetchRoute, reportBarrier, fetchStats, importOsmPois, importOsmFootways, submitRating, importOsmToilets, fetchNearestPois } from '../lib/api';
import { getFeatures, filterByBounds, savePendingBarrier, getPendingBarriers, clearPendingBarriers, savePendingRating, getOfflineStatus } from '../lib/offlineStorage';
import { buildGraph, findRoute as offlineRoute, PROFILES as ROUTE_PROFILES } from '../lib/offlineRouter';
import { t, getLang, setLang, SUPPORTED_LANGS, getSurface, getSmoothness, getCategory } from '../lib/i18n';
import { CITIES } from '../lib/cities';
import OfflineManager from './OfflineManager';
import { useAuth } from './AuthContext';
import UserMenu from './UserMenu';
import SaveRouteDialog from './SaveRouteDialog';

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
    html: '<div style="width:12px;height:12px;border-radius:50%;background:' + color + ';border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.5)"></div>',
    className: '',
    iconSize: [12, 12],
    iconAnchor: [6, 6]
  });
}

function createWcIcon(color) {
  return L.divIcon({
    html: '<div style="width:28px;height:28px;border-radius:8px;background:white;display:flex;align-items:center;justify-content:center;font-size:16px;border:2.5px solid ' + color + ';box-shadow:0 2px 6px rgba(0,0,0,0.25)">\ud83d\udebb</div>',
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
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
    start: startParts,
    end: endParts,
    profile: profile || 'accessible',
    city: city || 'prague',
  };
}

export default function MapView() {
  const { user, token: authToken } = useAuth();
  const [showSaveRoute, setShowSaveRoute] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [pendingNavTarget, setPendingNavTarget] = useState(null); // { name, lat, lng }
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
  const [showRating, setShowRating] = useState(null);
  const [lang, setLangState] = useState('cs');
  const [city, setCity] = useState('prague');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [wcOnly, setWcOnly] = useState(false);
  const [userPos, setUserPos] = useState(null);
  const [positionMode, setPositionMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const mapRef = useRef(null);
  const lastImportRef = useRef(0);
  const graphRef = useRef(null);
  const graphBuildingRef = useRef(false);
  const autoRouteRef = useRef(false);
  const searchTimerRef = useRef(null);
  const searchBoxRef = useRef(null);
  const loadIdRef = useRef(0);
  const importDebounceRef = useRef(null);

  // Initialize lang and city from localStorage
  useEffect(() => {
    setLangState(getLang());
    const savedCity = localStorage.getItem('wheelca-city');
    if (savedCity && CITIES[savedCity]) {
      setCity(savedCity);
    }
  }, []);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) {
        setSearchResults(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        setLayers(l => ({ ...l, footways: false }));
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
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      // Fallback: use map center
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        setUserPos([c.lat, c.lng]);
        showToast(t('posSetToCenter', lang));
      }
      return;
    }
    showToast(t('geoLocating', lang));
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserPos([latitude, longitude]);
        if (mapRef.current) {
          mapRef.current.flyTo([latitude, longitude], 16, { duration: 1.5 });
        }
        showToast(t('posSet', lang));
      },
      () => {
        // GPS failed: use map center as fallback
        if (mapRef.current) {
          const c = mapRef.current.getCenter();
          setUserPos([c.lat, c.lng]);
          showToast(t('posSetToCenter', lang));
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Debounced autocomplete search
  const handleSearchInput = (value) => {
    setSearchQuery(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!value.trim()) {
      setSearchResults(null);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          'https://nominatim.openstreetmap.org/search?format=json&limit=6&q=' +
          encodeURIComponent(value)
        );
        const data = await res.json();
        if (data.length === 0) {
          setSearchResults([]);
        } else {
          setSearchResults(data);
        }
      } catch (err) {
        setSearchResults([]);
      }
    }, 350);
  };

  const handleSearchResultClick = (result) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);
    if (mapRef.current) {
      mapRef.current.flyTo([lat, lon], 16, { duration: 1.5 });
    }
    setSearchResult({
      name: result.display_name.split(',').slice(0, 2).join(',').trim(),
      lat: lat,
      lng: lon
    });
    setSearchQuery('');
    setSearchResults(null);
  };

  const handleSearchClear = () => {
    setSearchQuery('');
    setSearchResults(null);
    setSearchResult(null);
  };

  const handleNavigateToSearch = async () => {
    if (!searchResult) return;
    const end = [searchResult.lng, searchResult.lat];
    let start;
    if (userPos) {
      start = [userPos[1], userPos[0]];
    } else {
      // No position - save target and ask user to set start
      setPendingNavTarget(end);
      setSearchResult(null);
      showToast("Dvojklikem na mapu zvolte výchozí bod");
      return;
    }

    setRouteStart(start);
    setRouteEnd(end);
    setSearchResult(null);
    showToast(t('toastCalculating', lang));

    let result;
    if (isOffline || (graphRef.current && routeProfile !== 'server')) {
      if (!graphRef.current) {
        if (offlineData?.footways) {
          showToast(t('toastBuildingGraph', lang));
          graphRef.current = buildGraph(offlineData.footways);
        } else {
          showToast(t('toastNoOfflineData', lang));
          return;
        }
      }
      result = offlineRoute(graphRef.current, start[0], start[1], end[0], end[1], routeProfile);
    } else {
      result = await fetchRoute(start, end);
    }

    if (result && !result.error) {
      setRoute(result);
      setLayers(l => ({ ...l, footways: false }));
      const props = result.features?.[0]?.properties;
      setRouteInfo({
        dist: props?.summary?.distance,
        dur: props?.summary?.duration,
        engine: props?.engine || 'ors',
        warning: props?.warning,
        accessibility: props?.accessibility,
        steps: props?.segments?.[0]?.steps
      });
      const dist = props?.summary?.distance;
      const dur = props?.summary?.duration;
      const distStr = dist ? (dist/1000).toFixed(1) + ' km' : '?';
      const durStr = dur ? Math.round(dur/60) + ' min' : '?';
      showToast(distStr + ', ' + durStr);
    } else {
      showToast(result?.error || t('toastLoadError', lang));
    }
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchResults(null);
      e.target.blur();
    }
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
    const thisLoadId = ++loadIdRef.current;

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
    if (loadIdRef.current !== thisLoadId) return;
    if (poisData) setPois(poisData);
    if (footwaysData) setFootways(footwaysData);
    if (barriersData) setBarriers(barriersData);

    const now = Date.now();
    if (now - lastImportRef.current < 30000) return;
    lastImportRef.current = now;

    // Debounced auto-import: wait 1s after last pan
    if (importDebounceRef.current) clearTimeout(importDebounceRef.current);
    importDebounceRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const [poisResult, footwaysResult, toiletsResult] = await Promise.all([
          importOsmPois(bounds),
          importOsmFootways(bounds),
          importOsmToilets(bounds)
        ]);
        const pi = poisResult?.imported || 0;
        const fi = footwaysResult?.imported || 0;
        const ti = toiletsResult?.imported || 0;
        if (pi || fi || ti) {
          const [newPois, newFootways] = await Promise.all([fetchPois(bounds), fetchFootways(bounds)]);
          if (newPois) setPois(newPois);
          if (newFootways) setFootways(newFootways);
          fetchStats().then(setStats);
        }
      } catch (e) {
        // Silent on failure for auto-import
      }
      setLoading(false);
    }, 1000);
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
        setLayers(l => ({ ...l, footways: false }));
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

  const handleFindWc = async () => {
    showToast(t('wcFinding', lang));
    let pos = userPos;
    if (!pos && mapRef.current) {
      const c = mapRef.current.getCenter();
      pos = [c.lat, c.lng];
    }
    if (!pos) { showToast(t('wcNotFound', lang)); return; }
    try {
      const data = await fetchNearestPois(pos[0], pos[1], 'toilets', null, 1);
      const wc = data?.features?.[0];
      if (!wc) { showToast(t('wcNotFound', lang)); return; }
      const coords = wc.geometry.coordinates;
      const dist = wc.properties.distance_m;
      const name = wc.properties.name || 'WC';
      const wh = getWheelchairLabel(wc.properties.wheelchair, lang);
      showToast(name + ' (' + dist + ' m) \u2014 ' + wh);
      // Route from user position (or map center) to WC
      setRouteStart([pos[1], pos[0]]);
      setRouteEnd([coords[0], coords[1]]);
      const result = await fetchRoute([pos[1], pos[0]], [coords[0], coords[1]]);
      if (!result.error) {
        setRoute(result);
        setLayers(l => ({ ...l, footways: false }));
        const props = result.features?.[0]?.properties;
        setRouteInfo({ dist: props?.summary?.distance, dur: props?.summary?.duration, engine: props?.engine || 'ors', warning: props?.warning, accessibility: props?.accessibility, steps: props?.segments?.[0]?.steps });
      } else if (mapRef.current) {
        mapRef.current.flyTo([coords[1], coords[0]], 17, { duration: 1 });
      }
    } catch {
      showToast(t('wcNotFound', lang));
    }
  };

  function MapClickHandler() {
    const map = useMap();
    useEffect(() => { map.doubleClickZoom.disable(); }, [map]);
    useMapEvents({
      click: (e) => {
        if (positionMode) {
          setUserPos([e.latlng.lat, e.latlng.lng]);
          setPositionMode(false);
          showToast(t('posSet', lang));
          return;
        }
        handleMapClick(e);
      },
      dblclick: (e) => {
        e.originalEvent.preventDefault();
        setUserPos([e.latlng.lat, e.latlng.lng]);
        showToast(t("posSet", lang));
      },
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
    <div id="map-container" className={positionMode ? 'position-mode' : ''}>
      <UserMenu />
      {/* Floating search bar - ALWAYS visible */}
      <div className="search-float" ref={searchBoxRef}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={handleSearchKeyDown}
          placeholder={t('searchPlaceholderShort', lang)}
          autoComplete="off"
        />
        {searchQuery && (
          <button className="search-clear" onClick={handleSearchClear}>&times;</button>
        )}
        {searchResults !== null && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <div className="search-no-results">{t('noResults', lang)}</div>
            ) : (
              searchResults.slice(0, 6).map((r, i) => (
                <div key={i} className="search-item" onClick={() => handleSearchResultClick(r)}>
                  {r.display_name}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Floating action buttons - ALWAYS visible */}
      <div className="fab-group">
        <button className="fab" onClick={() => setPanelOpen(!panelOpen)} title={panelOpen ? t('panelClose', lang) : t('panelOpen', lang)}>
          {panelOpen ? '✕' : '☰'}
        </button>
        <button className="fab fab-locate" onClick={handleGeolocate} title={t('geoLocate', lang)}>
          📍
        </button>
        <button className="fab fab-route" onClick={() => { setRouteMode('start'); setRoute(null); setRouteInfo(null); setSearchResult(null); showToast(t('toastClickStart', lang)); }} title={t('findRoute', lang)}>
          🧭
        </button>
        <button className="fab fab-wc" onClick={handleFindWc} title={t('wcNearest', lang)}>
          🚻
        </button>
        <button className="fab fab-layer" onClick={() => setLayers(l => ({ ...l, footways: !l.footways }))} title={layers.footways ? 'Skrýt chodníky' : 'Zobrazit chodníky'}>
          {layers.footways ? '🟢' : '⚫'}
        </button>
      </div>

      {/* Map */}
      <MapContainer
        center={initialCenter}
        zoom={CITIES[city]?.zoom || 15}
        doubleClickZoom={false} style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DataLoader onMoveEnd={loadData} />
        <MapClickHandler />
        <CityFlyTo city={city} />

        {layers.footways && <FootwayLayer data={footways} lang={lang} />}

        {layers.pois && pois?.features?.filter(f => !wcOnly || f.properties.category === 'toilets').map(f => (
          <Marker
            key={f.id}
            position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            icon={f.properties.category === 'toilets' ? createWcIcon(WHEELCHAIR_ICONS[f.properties.wheelchair]) : createCircleIcon(WHEELCHAIR_ICONS[f.properties.wheelchair])}
            eventHandlers={{ click: () => {} }}
          >
            <Popup>
              <b>{f.properties.name || t('noName', lang)}</b><br/>
              {getCategory(f.properties.category, lang) || f.properties.category}<br/>
              {getWheelchairLabel(f.properties.wheelchair, lang)}
              {f.properties.category === 'toilets' && f.properties.tags?.fee && <><br/>{t('wcFee', lang)}: {f.properties.tags.fee === 'yes' ? t('wcYes', lang) : t('wcNo', lang)}</>}
              {f.properties.category === 'toilets' && f.properties.tags?.opening_hours && <><br/>{t('wcHours', lang)}: {f.properties.tags.opening_hours}</>}
              <br/>
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
        {userPos && (
          <Marker position={userPos} icon={L.divIcon({
            html: '<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.3),0 2px 6px rgba(0,0,0,0.3)"></div>',
            className: '', iconSize: [18, 18], iconAnchor: [9, 9]
          })} />
        )}
      </MapContainer>

      {/* Collapsible panel */}
      <div className={'panel' + (panelOpen ? '' : ' collapsed')}>
        <div className="panel-header">
          <h2>
            <span>WheelCA</span>
            {isOffline && <span style={{ fontSize: 11, color: '#ef4444', fontWeight: 400 }}>{t('offline', lang)}</span>}
          </h2>
          <button className="panel-close" onClick={() => setPanelOpen(false)}>&times;</button>
        </div>

        {/* Stats */}
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
            {stats.total_toilets > 0 && (
              <div className="stat-card">
                <div className="stat-value">{stats.total_toilets}</div>
                <div className="stat-label">{t('statToilets', lang)} ({stats.accessible_toilets || 0} \u267f)</div>
              </div>
            )}
          </div>
        )}

        {/* City selector + Language */}
        <h3>{t('selectCity', lang)}</h3>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={city} onChange={(e) => handleCityChange(e.target.value)} style={{ flex: 1, marginBottom: 0 }}>
            {Object.entries(CITIES).map(([key, c]) => (
              <option key={key} value={key}>{c.name[lang] || c.name.en}</option>
            ))}
          </select>
          {SUPPORTED_LANGS.map(sl => (
            <button key={sl.code}
              className="btn btn-sm"
              style={{
                padding: '4px 8px', fontSize: 11,
                background: lang === sl.code ? 'var(--primary)' : 'var(--surface)',
                color: lang === sl.code ? 'white' : 'var(--text-muted)',
                border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', fontWeight: 600
              }}
              onClick={() => handleLangChange(sl.code)}>
              {sl.label}
            </button>
          ))}
        </div>

        {/* WC section */}
        <h3>{'\ud83d\udebb'} WC</h3>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={handleFindWc} style={{ background: 'var(--purple)' }}>
            {'\ud83d\udebb'} {t('wcNearest', lang)}
          </button>
          <label className="layer-toggle">
            <input type="checkbox" checked={wcOnly} onChange={() => setWcOnly(!wcOnly)} />
            {t('wcFilter', lang)}
          </label>
        </div>

        {/* Layers */}
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

        {/* Navigation */}
        <h3>{t('navigation', lang)}</h3>
        <div style={{ marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 6, flexWrap: 'wrap' }}>
            {Object.entries(ROUTE_PROFILES).map(([key, p]) => (
              <button key={key}
                className={'btn btn-sm ' + (routeProfile === key ? 'btn-primary' : '')}
                style={routeProfile !== key ? { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                onClick={() => setRouteProfile(key)}>
                {p.name}
              </button>
            ))}
            {!isOffline && (
              <button
                className={'btn btn-sm ' + (routeProfile === 'server' ? 'btn-primary' : '')}
                style={routeProfile !== 'server' ? { background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
                onClick={() => setRouteProfile('server')}>
                {t('server', lang)}
              </button>
            )}
          </div>
        </div>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { setRouteMode('start'); setRoute(null); setRouteInfo(null); setSearchResult(null); showToast(t('toastClickStart', lang)); }}>
            {t('findRoute', lang)}
          </button>
          {route && (
            <>
              <button className="btn btn-danger btn-sm" onClick={() => { setRoute(null); setRouteStart(null); setRouteEnd(null); setRouteInfo(null); setSearchResult(null); setLayers(l => ({ ...l, footways: true })); }}>{t('cancel', lang)}</button>
              <button className="btn btn-sm" style={{ background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)' }} onClick={handleGpxExport}>
                {t('gpxExport', lang)}
              </button>
              <button className="btn btn-sm" style={{ background: 'var(--surface)', color: 'var(--primary)', border: '1px solid var(--primary)' }} onClick={handleShareUrl}>
                {t('shareUrl', lang)}
              </button>
              {user && <button className="btn btn-sm" style={{background:"#333",color:"#4cc9f0",border:"1px solid #4cc9f0"}} onClick={() => setShowSaveRoute(true)}>Uložit trasu</button>}
            </>
          )}
        </div>
        {routeMode === 'start' && <p style={{ fontSize: 13, color: 'var(--primary)' }}>{t('clickStart', lang)}</p>}
        {routeMode === 'end' && <p style={{ fontSize: 13, color: 'var(--primary)' }}>{t('clickEnd', lang)}</p>}

        {routeInfo && (
          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 10, margin: '8px 0', fontSize: 13, border: '1px solid var(--border)' }}>
            {routeInfo.engine?.startsWith('offline-') ? (
              <div style={{ background: '#0891b222', border: '1px solid var(--primary)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: 'var(--primary)', fontSize: 12 }}>
                {t('offlineRoute', lang)} - {routeInfo.engine.includes('accessible') ? t('mostAccessible', lang) : t('shortestRoute', lang)}
              </div>
            ) : routeInfo.engine !== 'osrm-foot' ? (
              <div style={{ background: '#22c55e22', border: '1px solid var(--green)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: 'var(--green)', fontSize: 12 }}>
                {t('wheelchairRoute', lang)}
              </div>
            ) : (
              <div style={{ background: '#eab30822', border: '1px solid var(--yellow)', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: 'var(--yellow)', fontSize: 12 }}>
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
                <div style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                  {routeInfo.accessibility.good > 0 && <span style={{ color: '#22c55e' }}>{routeInfo.accessibility.good}{t('pctAccessible', lang)}</span>}
                  {routeInfo.accessibility.limited > 0 && <span style={{ color: '#eab308' }}>{routeInfo.accessibility.limited}{t('pctLimited', lang)}</span>}
                  {routeInfo.accessibility.bad > 0 && <span style={{ color: '#ef4444' }}>{routeInfo.accessibility.bad}{t('pctBad', lang)}</span>}
                  {routeInfo.accessibility.unknown > 0 && <span style={{ color: '#888' }}>{routeInfo.accessibility.unknown}{t('pctUnknown', lang)}</span>}
                </div>
              </div>
            )}
            {routeInfo.warning && <p style={{ color: 'var(--yellow)', fontSize: 11, marginBottom: 6 }}>{routeInfo.warning}</p>}
            {routeInfo.steps && routeInfo.steps.length > 0 && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {routeInfo.steps.map((s, i) => (
                  <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                    {s.instruction}{s.name ? ' - ' + s.name : ''} <span style={{ color: 'var(--text-light)' }}>({s.distance > 1000 ? (s.distance/1000).toFixed(1) + 'km' : Math.round(s.distance) + 'm'})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Import */}
        {!isOffline && (
          <>
            <h3>{t('importTitle', lang)}</h3>
            <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
              {loading ? t('importing', lang) : t('importBtn', lang)}
            </button>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{t('importDesc', lang)}</p>
          </>
        )}

        {/* Offline Manager */}
        <OfflineManager onStatusChange={handleOfflineStatusChange} onDataUpdated={handleDataUpdated} lang={lang} city={city} onCityChange={handleCityChange} />

        {/* Help/Legend - collapsible */}
        <div style={{ marginTop: 8 }}>
          <button className="btn btn-sm" onClick={() => setShowHelp(!showHelp)}
            style={{ background: 'var(--surface)', color: 'var(--text-muted)', border: '1px solid var(--border)', width: '100%' }}>
            {showHelp ? t('helpClose', lang) : t('help', lang)}
          </button>
        </div>
        {showHelp && (
          <div className="help-section" style={{ marginTop: 8 }}>
            <div className="help-block">
              <h4>{t('helpMapTitle', lang)}</h4>
              <p>{t('helpMapText', lang)}</p>
            </div>
            <div className="help-block">
              <h4>{t('helpLinesTitle', lang)}</h4>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#22c55e' }}></div>
                  <span>{t('helpGreen', lang)}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#eab308' }}></div>
                  <span>{t('helpYellow', lang)}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#ef4444' }}></div>
                  <span>{t('helpRed', lang)}</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#888' }}></div>
                  <span>{t('helpGray', lang)}</span>
                </div>
              </div>
            </div>
            <div className="help-block">
              <h4>{t('helpDotsTitle', lang)}</h4>
              <div className="legend">
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid white', flexShrink: 0 }}></div>
                  <span>{t('helpDotGreen', lang)}</span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', border: '2px solid white', flexShrink: 0 }}></div>
                  <span>{t('helpDotYellow', lang)}</span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid white', flexShrink: 0 }}></div>
                  <span>{t('helpDotRed', lang)}</span>
                </div>
              </div>
            </div>
            <div className="help-block">
              <h4>{t('helpHowTitle', lang)}</h4>
              <ul>
                <li>{t('helpZoom', lang)}</li>
                <li>{t('helpClick', lang)}</li>
                <li>{t('helpRoute', lang)}</li>
                <li>{t('helpRightClick', lang)}</li>
                <li>{t('helpOffline', lang)}</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>{t('rightClickHint', lang)}</p>
        <p style={{ fontSize: 10, color: 'var(--text-light)', marginTop: 4 }}>Data: OpenStreetMap contributors</p>
      </div>

      {/* Dialogs */}
      {showReport && reportPos && (
        <ReportDialog
          position={reportPos}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReport(false)}
          isOffline={isOffline}
          lang={lang}
        />
      )}

      {showRating && (
        <RatingDialog
          poi={showRating}
          onSubmit={handleRatingSubmit}
          onClose={() => setShowRating(null)}
          isOffline={isOffline}
          lang={lang}
        />
      )}

      {showSaveRoute && route && <SaveRouteDialog route={route} routeStart={routeStart} routeEnd={routeEnd} routeInfo={routeInfo} token={authToken} onClose={() => setShowSaveRoute(false)} onSaved={() => showToast("Trasa uložena")} />}
      {/* Search result info card */}
      {searchResult && (
        <div className="search-result-card">
          <div className="src-content">
            <div>
              <div className="src-name">{searchResult.name}</div>
              {!userPos && <div className="src-hint">Pozice nezjištěna — dvojklikem na mapě zvolíte start</div>}
            </div>
            <button className="btn btn-primary btn-sm" onClick={handleNavigateToSearch}>
              🧭 Navigovat sem
            </button>
          </div>
          <button className="src-close" onClick={() => setSearchResult(null)}>✕</button>
        </div>
      )}

      {/* Toast */}
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
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '8px 0' }}>
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
        <p style={{ fontSize: 14, fontWeight: 600, margin: '8px 0', color: 'var(--text)' }}>
          {poi.properties?.name || t('noName', lang)}
        </p>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>
          {poi.properties?.category || ''}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, margin: '8px 0' }}>
          {RATING_OPTIONS.map(opt => (
            <label key={opt.value} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              background: rating === opt.value ? opt.color + '22' : 'var(--surface)',
              border: '2px solid ' + (rating === opt.value ? opt.color : 'var(--border)'),
              borderRadius: 8, cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <input type="radio" name="rating" value={opt.value}
                checked={rating === opt.value}
                onChange={() => setRating(opt.value)}
                style={{ width: 'auto', margin: 0 }} />
              <div>
                <div style={{ color: opt.color, fontWeight: 600, fontSize: 13 }}>{opt.label}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: 11 }}>{opt.desc}</div>
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
