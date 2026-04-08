'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  saveFeatures, clearStore, setMeta, getMeta, getOfflineStatus,
  generateTileUrls, getPendingBarriers, clearPendingBarriers,
  getPendingRatings, clearPendingRatings
} from '../lib/offlineStorage';
import { reportBarrier, submitRatingsBatch, fetchDelta } from '../lib/api';
import { t } from '../lib/i18n';
import CITIES from '../lib/cities';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

const TILE_ZOOMS = [12, 13, 14, 15, 16];

export default function OfflineManager({ onStatusChange, onDataUpdated, lang, city, onCityChange }) {
  const handleCityChange = (newCity) => {
    if (onCityChange) onCityChange(newCity);
  };
  const [status, setStatus] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState({ phase: '', percent: 0, detail: '' });
  const [online, setOnline] = useState(true);
  const [meta, setMetaState] = useState(null);
  const [tilesCached, setTilesCached] = useState(0);
  const [syncLog, setSyncLog] = useState(null);

  const cityConfig = CITIES[city];
  const cityBbox = cityConfig.bbox;
  const cityName = cityConfig.name[lang] || cityConfig.name.en;

  useEffect(() => {
    setOnline(navigator.onLine);
    const goOnline = () => { setOnline(true); onStatusChange?.('online'); };
    const goOffline = () => { setOnline(false); onStatusChange?.('offline'); };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [onStatusChange]);

  const refreshStatus = useCallback(async () => {
    const s = await getOfflineStatus();
    setStatus(s);
    return s;
  }, []);

  useEffect(() => {
    refreshStatus();
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'GET_CACHE_SIZE' });
    }
    const handler = (e) => {
      if (e.data.type === 'CACHE_SIZE') setTilesCached(e.data.tiles);
      if (e.data.type === 'CACHE_PROGRESS') {
        setProgress({ phase: 'tiles', percent: Math.round(e.data.done / e.data.total * 100), detail: e.data.done + '/' + e.data.total + ' ' + t('tilesInCache', lang) });
      }
      if (e.data.type === 'CACHE_COMPLETE') {
        setProgress({ phase: 'done', percent: 100, detail: t('done', lang) });
        setDownloading(false);
        refreshStatus();
      }
      if (e.data.type === 'CACHE_CLEARED') {
        setTilesCached(0);
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, [refreshStatus, lang]);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await fetch(API + `/api/export/${city}/meta`);
      const data = await res.json();
      setMetaState(data);
    } catch (e) { /* offline */ }
  }, [city]);

  useEffect(() => { if (online) fetchMeta(); }, [fetchMeta, online]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (online && status?.hasData) {
      syncAll();
    }
  }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync everything: upload pending + download delta
  const syncAll = async () => {
    if (syncing || !online) return;
    setSyncing(true);
    const log = { barriers: 0, ratings: 0, deltaPois: 0, deltaFootways: 0, deltaBarriers: 0 };

    try {
      // 1. Upload pending barriers
      const pendingBarriers = await getPendingBarriers();
      if (pendingBarriers.length > 0) {
        for (const b of pendingBarriers) {
          try {
            await reportBarrier(b);
            log.barriers++;
          } catch (e) { /* retry next time */ }
        }
        if (log.barriers > 0) await clearPendingBarriers();
      }

      // 2. Upload pending ratings
      const pendingRatings = await getPendingRatings();
      if (pendingRatings.length > 0) {
        try {
          const result = await submitRatingsBatch(pendingRatings);
          log.ratings = result.synced || 0;
          if (log.ratings > 0) await clearPendingRatings();
        } catch (e) { /* retry next time */ }
      }

      // 3. Download delta updates
      const lastSync = await getMeta(`lastSync-${city}`);
      if (lastSync) {
        try {
          const delta = await fetchDelta(lastSync, city);
          if (delta.counts) {
            // Merge updated POIs
            if (delta.pois?.length > 0) {
              await saveFeatures('pois', delta.pois);
              log.deltaPois = delta.pois.length;
            }
            // Merge updated footways
            if (delta.footways?.length > 0) {
              await saveFeatures('footways', delta.footways);
              log.deltaFootways = delta.footways.length;
            }
            // Merge updated barriers
            if (delta.barriers?.length > 0) {
              await saveFeatures('barriers', delta.barriers.filter(b => b.properties.active !== false));
              log.deltaBarriers = delta.barriers.length;
            }
          }
        } catch (e) { /* delta failed, not critical */ }
      }

      // Update sync timestamp
      await setMeta(`lastSync-${city}`, new Date().toISOString());
      await refreshStatus();

      const totalChanges = log.barriers + log.ratings + log.deltaPois + log.deltaFootways + log.deltaBarriers;
      if (totalChanges > 0) {
        setSyncLog(log);
        onDataUpdated?.();
        // Auto-hide log after 8s
        setTimeout(() => setSyncLog(null), 8000);
      }
    } catch (e) {
      console.error('Sync error:', e);
    }
    setSyncing(false);
  };

  const downloadData = async () => {
    setDownloading(true);
    setProgress({ phase: 'data', percent: 0, detail: t('downloadingData', lang) });
    try {
      const res = await fetch(API + `/api/export/${city}`);
      const data = await res.json();
      setProgress({ phase: 'data', percent: 30, detail: t('savingPOI', lang) });
      await saveFeatures('pois', data.pois.features);

      setProgress({ phase: 'data', percent: 50, detail: t('savingSidewalks', lang) });
      await saveFeatures('footways', data.footways.features);

      setProgress({ phase: 'data', percent: 65, detail: t('savingBarriers', lang) });
      await saveFeatures('barriers', data.barriers.features);

      await setMeta(`lastSync-${city}`, new Date().toISOString());
      await setMeta(`dataVersion-${city}`, data.version);
      setProgress({ phase: 'data', percent: 70, detail: t('dataSaved', lang) });
    } catch (e) {
      setProgress({ phase: 'error', percent: 0, detail: t('downloadError', lang) + ' ' + e.message });
      setDownloading(false);
      return;
    }

    setProgress({ phase: 'tiles', percent: 70, detail: t('generatingTiles', lang) });
    const tileUrls = generateTileUrls(cityBbox.minLat, cityBbox.minLng, cityBbox.maxLat, cityBbox.maxLng, TILE_ZOOMS);
    setProgress({ phase: 'tiles', percent: 72, detail: t('downloadingTiles', lang) + ' ' + tileUrls.length + ' ' + t('tiles', lang) });

    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CACHE_TILES', tiles: tileUrls });
    } else {
      setProgress({ phase: 'done', percent: 100, detail: t('dataSavedNoSW', lang) });
      setDownloading(false);
    }
    await refreshStatus();
    onDataUpdated?.();
  };

  const clearOfflineData = async () => {
    await clearStore('pois');
    await clearStore('footways');
    await clearStore('barriers');
    await clearStore('meta');
    await clearStore('pendingRatings');
    await clearStore('pendingBarriers');
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_TILE_CACHE' });
    }
    await refreshStatus();
    setTilesCached(0);
  };

  return (
    <div>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {t('offlinePackages', lang)}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: online ? '#22c55e' : '#ef4444',
          display: 'inline-block'
        }} />
        <span style={{ fontSize: 11, color: online ? '#22c55e' : '#ef4444', fontWeight: 400 }}>
          {online ? t('online', lang) : t('offlineLabel', lang)}
        </span>
        {syncing && <span style={{ fontSize: 11, color: '#4cc9f0', fontWeight: 400 }}>{t('syncing', lang)}</span>}
      </h3>

      <p style={{ fontSize: 11, color: '#666', margin: '2px 0 6px' }}>
        {lang === 'cs' ? 'Mapa funguje všude online. Pro offline použití stáhni balíček:' :
         lang === 'de' ? 'Karte funktioniert überall online. Für offline Pakete herunterladen:' :
         'Map works everywhere online. For offline use download a package:'}
      </p>

      {/* City package buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, margin: '4px 0 8px' }}>
        {Object.keys(CITIES).map(key => {
          const cityObj = CITIES[key];
          const isActive = city === key;
          return (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 8px', background: '#16213e', borderRadius: 6,
              border: isActive ? '1px solid #4cc9f0' : '1px solid #333',
            }}>
              <span style={{ flex: 1, fontSize: 13, color: isActive ? '#4cc9f0' : '#ccc', fontWeight: isActive ? 600 : 400 }}>
                {cityObj.name[lang] || cityObj.name.en}
              </span>
              {isActive && status?.hasData && (
                <span style={{ fontSize: 10, color: '#22c55e' }}>
                  {status.poisCount} {t('places', lang)}
                </span>
              )}
              {!downloading && online && (
                <button className="btn btn-sm"
                  style={{ padding: '2px 8px', fontSize: 11, background: isActive ? '#4cc9f0' : '#333', color: isActive ? '#1a1a2e' : '#aaa' }}
                  onClick={() => { handleCityChange(key); setTimeout(() => downloadData(), 100); }}>
                  {isActive && status?.hasData ? t('updateAll', lang) : t('downloadCity', lang)}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {downloading && (
        <div style={{ margin: '4px 0 8px' }}>
          <div style={{ background: '#333', borderRadius: 4, height: 6, overflow: 'hidden' }}>
            <div style={{
              background: progress.phase === 'error' ? '#ef4444' : '#4cc9f0',
              height: '100%', width: progress.percent + '%',
              transition: 'width 0.3s'
            }} />
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{progress.detail}</div>
        </div>
      )}

      {status?.hasData && (
        <div style={{ background: '#16213e', borderRadius: 8, padding: 8, margin: '4px 0', fontSize: 11 }}>
          <div style={{ color: '#aaa' }}>
            {status.poisCount} {t('places', lang)}, {status.footwaysCount} {t('sidewalks', lang)}, {status.barriersCount} {t('barriers', lang)}
            {tilesCached > 0 ? ', ' + tilesCached + ' ' + t('tilesInCache', lang) : ''}
          </div>
          {(status.pendingRatings > 0 || status.pendingBarriers > 0) && (
            <div style={{ color: '#eab308', marginTop: 2 }}>
              {t('pendingSync', lang)} {status.pendingRatings > 0 ? status.pendingRatings + ' ' + t('pendingRatings', lang) : ''}{status.pendingRatings > 0 && status.pendingBarriers > 0 ? ', ' : ''}{status.pendingBarriers > 0 ? status.pendingBarriers + ' ' + t('pendingBarriers', lang) : ''}
            </div>
          )}
          {status.lastSync && (
            <div style={{ color: '#666', marginTop: 2 }}>
              {t('lastSync', lang)} {new Date(status.lastSync).toLocaleString('cs')}
            </div>
          )}
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {online && (
              <button className="btn btn-sm" style={{ background: '#333', color: '#4cc9f0', fontSize: 11, padding: '2px 8px' }} onClick={syncAll} disabled={syncing}>
                {syncing ? t('syncDots', lang) : t('synchronize', lang)}
              </button>
            )}
            <button className="btn btn-sm" style={{ background: '#333', color: '#ef4444', fontSize: 11, padding: '2px 8px' }} onClick={clearOfflineData}>
              {t('deleteData', lang)}
            </button>
          </div>
        </div>
      )}

      {syncLog && (
        <div style={{ background: '#22c55e22', border: '1px solid #22c55e', borderRadius: 6, padding: '6px 10px', margin: '4px 0', fontSize: 11, color: '#22c55e' }}>
          {t('syncedLabel', lang)}
          {syncLog.barriers > 0 ? ' ' + syncLog.barriers + ' ' + t('syncBarriers', lang) : ''}
          {syncLog.ratings > 0 ? ' ' + syncLog.ratings + ' ' + t('syncRatings', lang) : ''}
          {syncLog.deltaPois > 0 ? ' ' + syncLog.deltaPois + ' ' + t('syncPoisUpdated', lang) : ''}
          {syncLog.deltaFootways > 0 ? ' ' + syncLog.deltaFootways + ' ' + t('syncFootwaysUpdated', lang) : ''}
          {syncLog.deltaBarriers > 0 ? ' ' + syncLog.deltaBarriers + ' ' + t('syncBarriersUpdated', lang) : ''}
        </div>
      )}

      {!online && !status?.hasData && (
        <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
          {t('noDataOffline', lang)}
        </div>
      )}
    </div>
  );
}
