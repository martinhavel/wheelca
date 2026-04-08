'use client';
import { useState, useEffect, use } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function SharedRoutePage({ params }) {
  const { token } = use(params);
  const [route, setRoute] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/api/routes/shared/${token}`)
      .then(r => r.json()).then(d => {
        if (d.error) setError(d.error);
        else setRoute(d);
      }).catch(() => setError('Chyba při načítání trasy'));
  }, [token]);

  const openInMap = () => {
    if (!route) return;
    const params = new URLSearchParams({
      start: `${route.start_lng},${route.start_lat}`,
      end: `${route.end_lng},${route.end_lat}`,
      profile: route.engine === 'osrm-foot' ? 'server' : 'accessible'
    });
    window.location.href = '/?' + params.toString();
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:500,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        {error ? <p style={{color:'#ef4444'}}>{error}</p> : !route ? <p>Načítám...</p> : (
          <>
            <h1 style={{fontSize:22,marginBottom:12}}>{route.name}</h1>
            <div style={{fontSize:14,color:'var(--text-muted)',marginBottom:12}}>
              {route.start_label && route.end_label && (
                <div style={{marginBottom:8}}>{route.start_label} → {route.end_label}</div>
              )}
              {route.distance_m && <span>{(route.distance_m/1000).toFixed(1)} km</span>}
              {route.duration_s && <span style={{marginLeft:12}}>{Math.round(route.duration_s/60)} min</span>}
            </div>
            {route.engine && route.engine !== 'osrm-foot' && (
              <div style={{background:'#22c55e22',border:'1px solid #22c55e',borderRadius:6,padding:'6px 10px',color:'#22c55e',fontSize:12,marginBottom:12}}>
                Bezbariérová trasa
              </div>
            )}
            <button className="btn btn-primary" onClick={openInMap} style={{width:'100%',marginTop:8}}>
              Zobrazit na mapě
            </button>
          </>
        )}
        <div style={{marginTop:24,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:14}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
