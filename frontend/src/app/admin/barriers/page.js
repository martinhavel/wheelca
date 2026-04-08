'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function AdminBarriersPage() {
  const { user, token, isLoading } = useAuth();
  const [barriers, setBarriers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    fetch(`${API}/api/admin/barriers`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setBarriers(d.barriers || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  if (isLoading) return null;
  if (!user || user.role !== 'admin') { if (typeof window !== 'undefined') window.location.href = '/'; return null; }

  const verify = async (id) => {
    await fetch(`${API}/api/admin/barriers/${id}/verify`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    load();
  };
  const del = async (id) => {
    if (!confirm('Smazat barieru?')) return;
    await fetch(`${API}/api/admin/barriers/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--surface)',padding:20}}>
      <div style={{maxWidth:800,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{fontSize:24}}>Bariery</h1>
          <a href="/admin" style={{color:'var(--primary)',fontSize:14}}>Zpět</a>
        </div>
        {loading ? <p>Načítám...</p> : barriers.length === 0 ? <p style={{color:'var(--text-muted)'}}>Zadne bariery</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {barriers.map(b => (
              <div key={b.id} style={{background:'var(--bg)',borderRadius:8,padding:12,border:'1px solid var(--border)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>
                  <strong>{b.barrier_type}</strong>
                  <span style={{marginLeft:8,fontSize:12,color:'var(--text-muted)'}}>{b.description||''}</span>
                  {b.verified && <span style={{marginLeft:8,color:'#22c55e',fontSize:11}}>Overeno</span>}
                </div>
                <div style={{display:'flex',gap:6}}>
                  {!b.verified && <button className="btn btn-sm" style={{fontSize:11,background:'#22c55e',color:'#fff',border:'none'}} onClick={()=>verify(b.id)}>Overit</button>}
                  <button className="btn btn-sm btn-danger" style={{fontSize:11}} onClick={()=>del(b.id)}>Smazat</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
