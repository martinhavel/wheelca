'use client';
import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      window.location.href = '/';
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24,textAlign:'center'}}>Přihlášení</h1>
        {error && <p style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Heslo</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:15}}>{loading?'Přihlašuji...':'Přihlásit se'}</button>
        </form>
        <div style={{marginTop:16,textAlign:'center',fontSize:13}}>
          <a href="/register" style={{color:'var(--primary)'}}>Registrace</a>
          <span style={{margin:'0 8px',color:'var(--text-muted)'}}>|</span>
          <a href="/forgot-password" style={{color:'var(--primary)'}}>Zapomenuté heslo</a>
        </div>
        <div style={{marginTop:12,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
