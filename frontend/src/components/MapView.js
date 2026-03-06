'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, GeoJSON, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import { fetchPois, fetchFootways, fetchBarriers, fetchRoute, reportBarrier, fetchStats, importOsmPois, importOsmFootways } from '../lib/api';

const PRAGUE_CENTER = [50.0755, 14.4378];

const SCORE_COLORS = { 0: '#888', 1: '#22c55e', 2: '#eab308', 3: '#ef4444' };
const SCORE_LABELS = { 0: 'Neznámý', 1: 'Přístupný', 2: 'Omezeně', 3: 'Nepřístupný' };

const WHEELCHAIR_ICONS = {
  yes: '#22c55e',
  limited: '#eab308',
  no: '#ef4444',
  unknown: '#888'
};

const CATEGORY_CS = {
  restaurant: 'Restaurace', cafe: 'Kavárna', bar: 'Bar', pub: 'Hospoda',
  fast_food: 'Rychlé občerstvení', pharmacy: 'Lékárna', hospital: 'Nemocnice',
  clinic: 'Klinika', doctors: 'Lékař', dentist: 'Zubař', bank: 'Banka',
  atm: 'Bankomat', post_office: 'Pošta', library: 'Knihovna', school: 'Škola',
  university: 'Univerzita', kindergarten: 'Školka', theatre: 'Divadlo',
  cinema: 'Kino', museum: 'Muzeum', gallery: 'Galerie', place_of_worship: 'Kostel/chrám',
  parking: 'Parkoviště', fuel: 'Čerpací stanice', toilets: 'Toalety',
  supermarket: 'Supermarket', convenience: 'Potraviny', bakery: 'Pekárna',
  clothes: 'Oblečení', hairdresser: 'Kadeřnictví', optician: 'Optika',
  shoes: 'Obuv', electronics: 'Elektronika', hotel: 'Hotel', hostel: 'Hostel',
  guest_house: 'Penzion', apartment: 'Apartmán', information: 'Informace',
  yes: 'Budova', other: 'Ostatní'
};

const WHEELCHAIR_CS = {
  yes: 'Přístupné', limited: 'Omezeně přístupné', no: 'Nepřístupné', unknown: 'Neznámé'
};

const SURFACE_CS = {
  asphalt: 'asfalt', concrete: 'beton', paving_stones: 'dlažba',
  'concrete:plates': 'betonové desky', cobblestone: 'kostky',
  sett: 'žulové kostky', compacted: 'zhutněný štěrk',
  fine_gravel: 'jemný štěrk', gravel: 'štěrk', sand: 'písek',
  grass: 'tráva', dirt: 'hlína', mud: 'bláto',
  'cobblestone:flattened': 'ploché kostky', wood: 'dřevo', metal: 'kov'
};

const SMOOTH_CS = {
  excellent: 'vynikající', good: 'dobrá', intermediate: 'střední',
  bad: 'špatná', very_bad: 'velmi špatná', horrible: 'hrozná'
};

const BARRIER_TYPES = [
  { value: 'steps', label: 'Schody' },
  { value: 'high_kerb', label: 'Vysoký obrubník' },
  { value: 'narrow_passage', label: 'Úzký průchod' },
  { value: 'steep_slope', label: 'Strmý svah' },
  { value: 'bad_surface', label: 'Špatný povrch' },
  { value: 'construction', label: 'Stavba/uzavírka' },
  { value: 'no_ramp', label: 'Chybí rampa' },
  { value: 'other', label: 'Jiné' }
];

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
    html: `<div style="width:16px;height:16px;background:#ef4444;border:2px solid white;border-radius:3px;display:flex;align-items:center;justify-content:center;font-size:10px;color:white;font-weight:bold;box-shadow:0 1px 3px rgba(0,0,0,0.5)">!</div>`,
    className: '',
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
}

function DataLoader({ onMoveEnd }) {
  useMapEvents({ moveend: (e) => onMoveEnd(e.target) });
  return null;
}

function FootwayLayer({ data }) {
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
        layer.bindPopup(`
          <b>Chodník</b><br/>
          Povrch: ${SURFACE_CS[p.surface] || p.surface || '?'}<br/>
          Hladkost: ${SMOOTH_CS[p.smoothness] || p.smoothness || '?'}<br/>
          Sklon: ${p.incline || '?'}<br/>
          Přístupnost: ${SCORE_LABELS[p.accessibility_score]}
        `);
      }
    }).addTo(map);
    return () => {
      if (layerRef.current) map.removeLayer(layerRef.current);
    };
  }, [data, map]);
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

export default function MapView() {
  const [pois, setPois] = useState(null);
  const [footways, setFootways] = useState(null);
  const [barriers, setBarriers] = useState(null);
  const [route, setRoute] = useState(null);
  const [stats, setStats] = useState(null);
  const [toast, setToast] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportPos, setReportPos] = useState(null);
  const [routeMode, setRouteMode] = useState(null); // null, 'start', 'end'
  const [routeStart, setRouteStart] = useState(null);
  const [routeEnd, setRouteEnd] = useState(null);
  const [layers, setLayers] = useState({ pois: true, footways: true, barriers: true });
  const [loading, setLoading] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const mapRef = useRef(null);
  const lastImportRef = useRef(0);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  useEffect(() => {
    fetchStats().then(setStats).catch(() => {});
  }, []);

  const loadData = useCallback(async (map) => {
    if (map.getZoom() < 15) return;
    const bounds = map.getBounds();

    // Nejdřív zobrazíme co už máme v DB
    const [poisData, footwaysData, barriersData] = await Promise.all([
      layers.pois ? fetchPois(bounds) : null,
      layers.footways ? fetchFootways(bounds) : null,
      layers.barriers ? fetchBarriers(bounds) : null
    ]);
    if (poisData) setPois(poisData);
    if (footwaysData) setFootways(footwaysData);
    if (barriersData) setBarriers(barriersData);

    // Automatický import z OSM — cooldown 3s mezi importy
    const now = Date.now();
    if (now - lastImportRef.current < 3000) return;
    lastImportRef.current = now;

    try {
      setLoading(true);
      showToast('Načítám data z OpenStreetMap...');
      const [poisResult, footwaysResult] = await Promise.all([
        importOsmPois(bounds),
        importOsmFootways(bounds)
      ]);
      const pi = poisResult?.imported || 0;
      const fi = footwaysResult?.imported || 0;
      if (pi || fi) {
        showToast(`Načteno: ${pi} míst, ${fi} chodníků`);
        const [newPois, newFootways] = await Promise.all([fetchPois(bounds), fetchFootways(bounds)]);
        if (newPois) setPois(newPois);
        if (newFootways) setFootways(newFootways);
        fetchStats().then(setStats);
      } else {
        setToast('');
      }
    } catch (e) {
      showToast('Nepodařilo se načíst data');
    }
    setLoading(false);
  }, [layers]);

  const handleImport = async () => {
    if (!mapRef.current) return;
    setLoading(true);
    const bounds = mapRef.current.getBounds();
    try {
      const [poisResult, footwaysResult] = await Promise.all([
        importOsmPois(bounds),
        importOsmFootways(bounds)
      ]);
      const pi = poisResult?.imported || 0;
      const fi = footwaysResult?.imported || 0;
      showToast(`Načteno: ${pi} míst, ${fi} chodníků`);
      loadData(mapRef.current);
      fetchStats().then(setStats);
    } catch (e) {
      showToast('Nepodařilo se načíst data');
    }
    setLoading(false);
  };

  const handleMapClick = async (e) => {
    if (routeMode === 'start') {
      setRouteStart([e.latlng.lng, e.latlng.lat]);
      setRouteMode('end');
      showToast('Klikni na cíl trasy');
    } else if (routeMode === 'end') {
      setRouteEnd([e.latlng.lng, e.latlng.lat]);
      setRouteMode(null);
      showToast('Počítám trasu...');
      const result = await fetchRoute(routeStart, [e.latlng.lng, e.latlng.lat]);
      if (result.error) {
        showToast('Chyba: ' + result.error);
      } else {
        setRoute(result);
        const feat = result.features?.[0];
        const props = feat?.properties;
        const dist = props?.summary?.distance;
        const dur = props?.summary?.duration;
        const engine = props?.engine || 'ors';
        const warning = props?.warning;
        setRouteInfo({ dist, dur, engine, warning, steps: props?.segments?.[0]?.steps });
        showToast(engine === 'osrm-foot'
          ? `Pěší trasa: ${dist ? (dist/1000).toFixed(1) + ' km' : '?'}, ${dur ? Math.round(dur/60) + ' min' : '?'}`
          : `Bezbariérová trasa: ${dist ? (dist/1000).toFixed(1) + ' km' : '?'}, ${dur ? Math.round(dur/60) + ' min' : '?'}`);
      }
    }
  };

  const handleReportSubmit = async (data) => {
    const result = await reportBarrier({ ...data, lat: reportPos[0], lng: reportPos[1] });
    if (result.id) {
      showToast('Bariéra nahlášena!');
      setShowReport(false);
      if (mapRef.current) loadData(mapRef.current);
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


  return (
    <div id="map-container">
      <MapContainer
        center={PRAGUE_CENTER}
        zoom={15}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <DataLoader onMoveEnd={loadData} />
        <MapClickHandler />

        {layers.footways && <FootwayLayer data={footways} />}

        {layers.pois && pois?.features?.map(f => (
          <Marker
            key={f.id}
            position={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
            icon={createCircleIcon(WHEELCHAIR_ICONS[f.properties.wheelchair])}
          >
            <Popup>
              <b>{f.properties.name || 'Bez názvu'}</b><br/>
              {CATEGORY_CS[f.properties.category] || f.properties.category}<br/>
              {WHEELCHAIR_CS[f.properties.wheelchair] || f.properties.wheelchair}
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
              <b>{BARRIER_TYPES.find(b => b.value === f.properties.barrier_type)?.label}</b><br/>
              {f.properties.description || ''}<br/>
              Závažnost: {'!'.repeat(f.properties.severity)}<br/>
              {f.properties.verified ? 'Ověřeno' : 'Neověřeno'}
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
        <h2>
          Bezbariérová Praha
          <button className="btn btn-sm" style={{ marginLeft: 8, background: '#333', color: '#4cc9f0' }}
            onClick={() => setShowHelp(!showHelp)}>
            {showHelp ? 'Zavřít nápovědu' : '? Nápověda'}
          </button>
        </h2>

        {showHelp && (
          <div className="help-section">
            <div className="help-block">
              <h4>Co zobrazuje mapa?</h4>
              <p>Mapa ukazuje přístupnost ulic, chodníků a budov v Praze pro lidi na vozíku. Data pocházejí z OpenStreetMap a hlášení komunity.</p>
            </div>

            <div className="help-block">
              <h4>Barevné čáry = chodníky a cesty</h4>
              <div className="legend">
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#22c55e' }}></div>
                  <span><b>Zelená</b> — sjízdný povrch (asfalt, dlažba, beton). Bezpečné pro vozík.</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#eab308' }}></div>
                  <span><b>Žlutá</b> — omezeně sjízdný (zhutněný štěrk, ploché kostky). Průjezdné s opatrností.</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#ef4444' }}></div>
                  <span><b>Červená</b> — nesjízdný povrch (kostky, štěrk, hlína, tráva) nebo označeno jako nepřístupné.</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color" style={{ background: '#888' }}></div>
                  <span><b>Šedá</b> — neznámé. Povrch není v datech uveden.</span>
                </div>
              </div>
            </div>

            <div className="help-block">
              <h4>Barevné tečky = budovy a místa</h4>
              <div className="legend">
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#22c55e', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>Zelená</b> — plně bezbariérové (rampa, výtah, široké dveře)</span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#eab308', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>Žlutá</b> — částečně přístupné (někde schod, užší dveře)</span>
                </div>
                <div className="legend-item">
                  <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444', border: '2px solid white', flexShrink: 0 }}></div>
                  <span><b>Červená</b> — nepřístupné (schody, bez rampy)</span>
                </div>
              </div>
            </div>

            <div className="help-block">
              <h4>Červenobílý ! = bariéra</h4>
              <p>Konkrétní překážka nahlášená komunitou — schody, vysoký obrubník, stavba apod. Klikni pro detail.</p>
            </div>

            <div className="help-block">
              <h4>Jak používat?</h4>
              <ul>
                <li><b>Přibliž mapu</b> (zoom 14+) a data se načtou automaticky</li>
                <li><b>Klikni na čáru/tečku</b> pro detail (povrch, sklon, název)</li>
                <li><b>Najdi trasu</b> — klikni na start, pak na cíl. Trasa se vyhne schodům a špatným povrchům.</li>
                <li><b>Pravý klik</b> na mapu = nahlásit novou bariéru</li>
                <li><b>Načíst místa</b> — stáhne aktuální data z OpenStreetMap pro zobrazený výřez</li>
              </ul>
            </div>
          </div>
        )}

        {stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{stats.accessible_pois || 0}</div>
              <div className="stat-label">Přístupných</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.active_barriers || 0}</div>
              <div className="stat-label">Bariér</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_footways || 0}</div>
              <div className="stat-label">Chodníků</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_pois || 0}</div>
              <div className="stat-label">Celkem míst</div>
            </div>
          </div>
        )}

        <h3>Vrstvy</h3>
        <div>
          {[['pois', 'Budovy a místa'], ['footways', 'Chodníky a cesty'], ['barriers', 'Bariéry (hlášení)']].map(([key, label]) => (
            <label className="layer-toggle" key={key}>
              <input type="checkbox" checked={layers[key]}
                onChange={() => setLayers(l => ({ ...l, [key]: !l[key] }))} />
              {label}
            </label>
          ))}
        </div>

        <h3>Navigace</h3>
        <div className="btn-group">
          <button className="btn btn-primary" onClick={() => { setRouteMode('start'); setRoute(null); showToast('Klikni na start trasy'); }}>
            Najdi trasu
          </button>
          {route && <button className="btn btn-danger btn-sm" onClick={() => { setRoute(null); setRouteStart(null); setRouteEnd(null); setRouteInfo(null); }}>Zrušit</button>}
        </div>
        {routeMode === 'start' && <p style={{ fontSize: 13, color: '#4cc9f0' }}>Klikni na mapu pro START trasy</p>}
        {routeMode === 'end' && <p style={{ fontSize: 13, color: '#4cc9f0' }}>Klikni na mapu pro CÍL trasy</p>}

        {routeInfo && (
          <div style={{ background: '#16213e', borderRadius: 8, padding: 10, margin: '8px 0', fontSize: 13 }}>
            {routeInfo.engine !== 'osrm-foot' ? (
              <div style={{ background: '#22c55e22', border: '1px solid #22c55e', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: '#22c55e', fontSize: 12 }}>
                Bezbariérová trasa — vyhýbá se schodům, vysokým obrubníkům a špatným povrchům
              </div>
            ) : (
              <div style={{ background: '#eab30822', border: '1px solid #eab308', borderRadius: 6, padding: '6px 10px', marginBottom: 8, color: '#eab308', fontSize: 12 }}>
                Pěší trasa — nelze ověřit bezbariérovost (chybí wheelchair profil)
              </div>
            )}
            <div style={{ display: 'flex', gap: 16, marginBottom: 6 }}>
              <span><b>{routeInfo.dist ? (routeInfo.dist/1000).toFixed(1) : '?'} km</b></span>
              <span>{routeInfo.dur ? Math.round(routeInfo.dur/60) : '?'} min</span>
            </div>
            {routeInfo.warning && <p style={{ color: '#eab308', fontSize: 11, marginBottom: 6 }}>{routeInfo.warning}</p>}
            {routeInfo.steps && (
              <div style={{ maxHeight: 120, overflowY: 'auto' }}>
                {routeInfo.steps.map((s, i) => (
                  <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid #333', color: '#ccc' }}>
                    {s.instruction}{s.name ? ` — ${s.name}` : ''} <span style={{ color: '#888' }}>({s.distance > 1000 ? (s.distance/1000).toFixed(1) + 'km' : Math.round(s.distance) + 'm'})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <p style={{ fontSize: 12, color: '#888' }}>Pravý klik na mapu = nahlásit bariéru</p>

        <h3>Načíst místa a chodníky</h3>
        <button className="btn btn-primary" onClick={handleImport} disabled={loading}>
          {loading ? 'Načítám...' : 'Načíst data pro tuto oblast'}
        </button>
        <p style={{ fontSize: 11, color: '#666', marginTop: 4 }}>Stáhne budovy, obchody, chodníky a další místa v zobrazeném výřezu. Přibliž mapu pro načtení.</p>
      </div>

      {/* Report dialog */}
      {showReport && reportPos && (
        <ReportDialog
          position={reportPos}
          onSubmit={handleReportSubmit}
          onClose={() => setShowReport(false)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}

function ReportDialog({ position, onSubmit, onClose }) {
  const [type, setType] = useState('steps');
  const [desc, setDesc] = useState('');
  const [severity, setSeverity] = useState(2);

  return (
    <div className="report-overlay" onClick={onClose}>
      <div className="report-dialog" onClick={e => e.stopPropagation()}>
        <h2>Nahlásit bariéru</h2>
        <p style={{ fontSize: 12, color: '#888', margin: '8px 0' }}>
          Pozice: {position[0].toFixed(5)}, {position[1].toFixed(5)}
        </p>
        <select value={type} onChange={e => setType(e.target.value)}>
          {BARRIER_TYPES.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
        <textarea placeholder="Popis bariéry..." value={desc} onChange={e => setDesc(e.target.value)} rows={3} />
        <label style={{ fontSize: 13 }}>Závažnost: {severity}</label>
        <input type="range" min={1} max={3} value={severity} onChange={e => setSeverity(+e.target.value)} />
        <div className="btn-group" style={{ marginTop: 12 }}>
          <button className="btn btn-primary" onClick={() => onSubmit({ barrier_type: type, description: desc, severity })}>
            Odeslat
          </button>
          <button className="btn btn-danger" onClick={onClose}>Zrušit</button>
        </div>
      </div>
    </div>
  );
}
