'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function ResetInner() {
  const params = useSearchParams();
  const [password, setPassword] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = params.get('token');
    if (!token) { setError('Chybi token'); return; }
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chyba');
      setDone(true);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  if (done) return (
    <div style={{textAlign:'center'}}>
      <p style={{color:'#22c55e',fontSize:16,marginBottom:12}}>Heslo bylo změněno!</p>
      <a href="/login" style={{color:'var(--primary)'}}>Přihlásit se</a>
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {error && <p style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</p>}
      <div style={{marginBottom:16}}>
        <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Nové heslo</label>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:15}}>{loading?'Menim...':'Změnit heslo'}</button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24,textAlign:'center'}}>Nové heslo</h1>
        <Suspense fallback={<p style={{textAlign:'center'}}>Načítám...</p>}><ResetInner /></Suspense>
      </div>
    </div>
  );
}
