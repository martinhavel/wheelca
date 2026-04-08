'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function AdminPage() {
  const { user, token, isLoading } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null).then(d => setStats(d)).catch(() => {});
  }, [token]);

  if (isLoading) return null;
  if (!user || user.role !== 'admin') { if (typeof window !== 'undefined') window.location.href = '/'; return null; }

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:600,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24}}>Admin</h1>
        <div style={{display:'flex',gap:8,marginBottom:24,flexWrap:'wrap'}}>
          <a href="/admin/users" className="btn" style={{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)'}}>Uzivatele</a>
          <a href="/admin/barriers" className="btn" style={{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)'}}>Bariery</a>
          <a href="/admin/tests" className="btn" style={{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)'}}>Testy</a>
        </div>
        {stats ? (
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
            {Object.entries(stats).map(([k,v]) => (
              <div key={k} style={{background:'var(--surface)',borderRadius:8,padding:12,border:'1px solid var(--border)'}}>
                <div style={{fontSize:24,fontWeight:700}}>{typeof v === 'number' ? v.toLocaleString() : String(v)}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{k}</div>
              </div>
            ))}
          </div>
        ) : <p style={{color:'var(--text-muted)'}}>Načítám statistiky...</p>}
        <div style={{marginTop:24,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
