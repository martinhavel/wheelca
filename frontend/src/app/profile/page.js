'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function ProfilePage() {
  const { user, token, logout, isLoading } = useAuth();
  const [name, setName] = useState('');
  const [wheelchairType, setWheelchairType] = useState('');
  const [maxIncline, setMaxIncline] = useState('');
  const [oldPw, setOldPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.display_name || '');
      setWheelchairType(user.wheelchair_type || '');
      setMaxIncline(user.max_incline != null ? String(user.max_incline) : '');
    }
  }, [user]);

  if (isLoading) return null;
  if (!user) { if (typeof window !== 'undefined') window.location.href = '/login'; return null; }

  const saveProfile = async (e) => {
    e.preventDefault(); setMsg(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ display_name: name, wheelchair_type: wheelchairType || null, max_incline: maxIncline ? parseFloat(maxIncline) : null })
      });
      if (res.ok) setMsg('Ulozeno'); else { const d = await res.json(); setMsg(d.error || 'Chyba'); }
    } catch { setMsg('Chyba'); }
    setLoading(false);
  };

  const changePw = async (e) => {
    e.preventDefault(); setPwMsg('');
    try {
      const res = await fetch(`${API}/api/auth/change-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPw, new_password: newPw })
      });
      if (res.ok) { setPwMsg('Heslo změněno'); setOldPw(''); setNewPw(''); }
      else { const d = await res.json(); setPwMsg(d.error || 'Chyba'); }
    } catch { setPwMsg('Chyba'); }
  };

  const exportData = async () => {
    const res = await fetch(`${API}/api/auth/gdpr-export`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'my-data.json'; a.click();
  };

  const deleteAccount = async () => {
    if (!confirm('Opravdu chcete smazat účet? Toto nelze vzít zpět.')) return;
    const res = await fetch(`${API}/api/auth/delete-account`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) { logout(); window.location.href = '/'; }
  };

  const inp = {width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14};

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:480,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24}}>Profil</h1>
        <form onSubmit={saveProfile}>
          {msg && <p style={{color:msg==='Ulozeno'?'#22c55e':'#ef4444',fontSize:13,marginBottom:8}}>{msg}</p>}
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Jméno</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Typ voziku</label>
            <select value={wheelchairType} onChange={e=>setWheelchairType(e.target.value)} style={inp}>
              <option value="">-- nevybrano --</option>
              <option value="manual">Mechanický</option>
              <option value="electric">Elektrický</option>
              <option value="scooter">Skuter</option>
            </select>
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Max. sklon (%)</label>
            <input type="number" value={maxIncline} onChange={e=>setMaxIncline(e.target.value)} step="0.5" min="0" max="30" style={inp} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:15}}>Uložit profil</button>
        </form>

        <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'24px 0'}} />
        <h2 style={{fontSize:18,marginBottom:12}}>Zmena hesla</h2>
        <form onSubmit={changePw}>
          {pwMsg && <p style={{color:pwMsg==='Heslo změněno'?'#22c55e':'#ef4444',fontSize:13,marginBottom:8}}>{pwMsg}</p>}
          <div style={{marginBottom:12}}>
            <input type="password" placeholder="Staré heslo" value={oldPw} onChange={e=>setOldPw(e.target.value)} required style={inp} />
          </div>
          <div style={{marginBottom:12}}>
            <input type="password" placeholder="Nové heslo" value={newPw} onChange={e=>setNewPw(e.target.value)} required minLength={8} style={inp} />
          </div>
          <button type="submit" className="btn btn-primary" style={{width:'100%',padding:'10px'}}>Změnit heslo</button>
        </form>

        <hr style={{border:'none',borderTop:'1px solid var(--border)',margin:'24px 0'}} />
        <h2 style={{fontSize:18,marginBottom:12}}>Osobni udaje (GDPR)</h2>
        <div style={{display:'flex',gap:8}}>
          <button className="btn" style={{background:'var(--surface)',color:'var(--text)',border:'1px solid var(--border)',flex:1}} onClick={exportData}>Export dat</button>
          <button className="btn btn-danger" style={{flex:1}} onClick={deleteAccount}>Smazat účet</button>
        </div>

        <div style={{marginTop:24,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
