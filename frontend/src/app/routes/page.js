'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function RoutesPage() {
  const { user, token, isLoading } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/routes`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setRoutes(Array.isArray(d) ? d : d.routes || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (isLoading) return null;
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }

  const deleteRoute = async (id) => {
    if (!confirm('Smazat trasu?')) return;
    await fetch(`${API}/api/routes/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    setRoutes(routes.filter(r => r.id !== id));
  };

  const viewRoute = async (id) => {
    try {
      const res = await fetch(`${API}/api/routes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.start_lng != null && data.end_lng != null) {
        const params = new URLSearchParams({
          start: `${data.start_lng},${data.start_lat}`,
          end: `${data.end_lng},${data.end_lat}`,
          profile: data.engine === 'osrm-foot' ? 'server' : 'accessible',
          savedRoute: id
        });
        window.location.href = '/?' + params.toString();
      }
    } catch (e) {
      alert('Nepodařilo se načíst trasu');
    }
  };

  const shareRoute = async (id) => {
    const res = await fetch(`${API}/api/routes/${id}/share`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.share_url) {
      await navigator.clipboard.writeText(data.share_url).catch(() => {});
      alert('Odkaz zkopírován: ' + data.share_url);
      // Extract token from share_url for local state
      const urlToken = data.share_url.split('/route/')[1];
      if (urlToken) {
        setRoutes(routes.map(r => r.id === id ? { ...r, share_token: urlToken } : r));
      }
    }
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:600,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24}}>Uložené trasy</h1>
        {loading ? <p>Načítám...</p> : routes.length === 0 ? <p style={{color:'var(--text-muted)'}}>Žádné uložené trasy</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {routes.map(r => (
              <div key={r.id} style={{background:'var(--surface)',borderRadius:8,padding:12,border:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <strong style={{fontSize:15}}>{r.name}</strong>
                  <span style={{fontSize:12,color:'var(--text-muted)'}}>{r.distance_m ? (r.distance_m/1000).toFixed(1)+' km' : ''}</span>
                </div>
                {r.start_label && r.end_label && (
                  <div style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{r.start_label} → {r.end_label}</div>
                )}
                <div style={{display:'flex',gap:8,marginTop:8}}>
                  <button className="btn btn-sm" style={{background:'var(--primary)',color:'#fff',border:'none',fontSize:12}} onClick={()=>viewRoute(r.id)}>Zobrazit</button>
                  <button className="btn btn-sm" style={{background:'var(--surface)',color:'var(--primary)',border:'1px solid var(--primary)',fontSize:12}} onClick={()=>shareRoute(r.id)}>Sdílet</button>
                  <button className="btn btn-sm btn-danger" style={{fontSize:12}} onClick={()=>deleteRoute(r.id)}>Smazat</button>
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{marginTop:24,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
