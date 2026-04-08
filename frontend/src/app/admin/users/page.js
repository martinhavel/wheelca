'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function AdminUsersPage() {
  const { user, token, isLoading } = useAuth();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => {
    if (!token) return;
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    fetch(`${API}/api/admin/users${q}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setUsers(d.users || []); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, [token]);

  if (isLoading) return null;
  if (!user || user.role !== 'admin') { if (typeof window !== 'undefined') window.location.href = '/'; return null; }

  const toggleBan = async (id, banned) => {
    const endpoint = banned ? 'unban' : 'ban';
    await fetch(`${API}/api/admin/users/${id}/${endpoint}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    load();
  };

  return (
    <div style={{minHeight:'100vh',background:'var(--surface)',padding:20}}>
      <div style={{maxWidth:800,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{fontSize:24}}>Uzivatele</h1>
          <a href="/admin" style={{color:'var(--primary)',fontSize:14}}>Zpět</a>
        </div>
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Hledat..." style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--bg)',color:'var(--text)',fontSize:14}} />
          <button className="btn btn-primary" onClick={load}>Hledat</button>
        </div>
        {loading ? <p>Načítám...</p> : (
          <div style={{background:'var(--bg)',borderRadius:12,border:'1px solid var(--border)',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead><tr style={{background:'var(--surface)'}}>
                <th style={{padding:'10px 12px',textAlign:'left'}}>Email</th>
                <th style={{padding:'10px 12px',textAlign:'left'}}>Jméno</th>
                <th style={{padding:'10px 12px',textAlign:'left'}}>Role</th>
                <th style={{padding:'10px 12px',textAlign:'left'}}>Stav</th>
                <th style={{padding:'10px 12px',textAlign:'right'}}>Akce</th>
              </tr></thead>
              <tbody>{users.map(u => (
                <tr key={u.id} style={{borderTop:'1px solid var(--border)'}}>
                  <td style={{padding:'10px 12px'}}>{u.email}</td>
                  <td style={{padding:'10px 12px'}}>{u.display_name||'-'}</td>
                  <td style={{padding:'10px 12px'}}>{u.role}</td>
                  <td style={{padding:'10px 12px'}}>{u.banned ? <span style={{color:'#ef4444'}}>Ban</span> : <span style={{color:'#22c55e'}}>OK</span>}</td>
                  <td style={{padding:'10px 12px',textAlign:'right'}}>
                    <button className="btn btn-sm" style={{fontSize:11,background:u.banned?'#22c55e':'#ef4444',color:'#fff',border:'none'}} onClick={()=>toggleBan(u.id,u.banned)}>{u.banned?'Odbanovat':'Banovat'}</button>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
