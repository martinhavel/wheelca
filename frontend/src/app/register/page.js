'use client';
import { useState } from 'react';
import { useAuth } from '../../components/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [gdpr, setGdpr] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!gdpr) { setError('Musíte souhlasit se zpracováním osobních údajů'); return; }
    setError(''); setLoading(true);
    try {
      await register(email, password, name);
      setSuccess(true);
    } catch (err) { setError(err.message); }
    setLoading(false);
  };

  if (success) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)',textAlign:'center'}}>
        <h2 style={{fontSize:20,marginBottom:12}}>Registrace úspěšná!</h2>
        <p style={{fontSize:14,color:'var(--text-muted)'}}>Na váš email jsme poslali ověřovací odkaz. Klikněte na něj pro aktivaci účtu.</p>
        <a href="/login" style={{display:'inline-block',marginTop:16,color:'var(--primary)',fontSize:14}}>Přihlásit se</a>
      </div>
    </div>
  );

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24,textAlign:'center'}}>Registrace</h1>
        {error && <p style={{color:'#ef4444',fontSize:13,marginBottom:12}}>{error}</p>}
        <form onSubmit={handleSubmit}>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Jméno</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'block',fontSize:13,marginBottom:4,color:'var(--text-muted)'}}>Heslo</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8} style={{width:'100%',padding:'10px 12px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface)',color:'var(--text)',fontSize:14}} />
          </div>
          <div style={{marginBottom:16}}>
            <label style={{display:'flex',alignItems:'flex-start',gap:8,fontSize:13,cursor:'pointer'}}>
              <input type="checkbox" checked={gdpr} onChange={e=>setGdpr(e.target.checked)} style={{marginTop:2}} />
              <span>Souhlasim se <a href="/privacy" target="_blank" style={{color:'var(--primary)'}}>zpracovanim osobnich udaju</a></span>
            </label>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{width:'100%',padding:'12px',fontSize:15}}>{loading?'Registruji...':'Zaregistrovat se'}</button>
        </form>
        <div style={{marginTop:16,textAlign:'center',fontSize:13}}>
          <a href="/login" style={{color:'var(--primary)'}}>Už mám účet</a>
        </div>
        <div style={{marginTop:12,textAlign:'center'}}><a href="/" style={{color:'var(--text-muted)',fontSize:13}}>Zpět na mapu</a></div>
      </div>
    </div>
  );
}
