'use client';
import { useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chyba');
      setSent(true);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24,textAlign:'center'}}>Obnova hesla</h1>
        {sent ? (
          <div style={{textAlign:'center'}}>
            <p style={{fontSize:14,color:'var(--text-muted)'}}>Pokud účet s tímto emailem existuje, poslali jsme vám odkaz pro obnovu hesla.</p>
            <a href="/login" style={{display:'inline-block',marginTop:16,color:'var(--primary)',fontSize:14}}>Zpět na přihlášení</a>
          </div>
        ) : (
          <>
            {error && <p style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</p>}
            <form onSubmit={handleSubmit}>
              <div style={{marginBottom:16}}>
                <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Email</label>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
              </div>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:15}}>{loading?'Odesílám...':'Odeslat odkaz'}</button>
            </form>
            <div style={{marginTop:16,textAlign:'center'}}><a href="/login" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na přihlášení</a></div>
          </>
        )}
      </div>
    </div>
  );
}
