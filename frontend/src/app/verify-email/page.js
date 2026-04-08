'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

function VerifyInner() {
  const params = useSearchParams();
  const [status, setStatus] = useState('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); setMsg('Chybí ověřovací token'); return; }
    fetch(`${API}/api/auth/verify-email`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    }).then(r => r.json()).then(d => {
      if (d.error) { setStatus('error'); setMsg(d.error); }
      else { setStatus('ok'); setMsg('Email uspesne overen!'); }
    }).catch(() => { setStatus('error'); setMsg('Chyba při ověřování'); });
  }, [params]);

  return (
    <div style={{textAlign:'center'}}>
      {status === 'loading' && <p>Ověřuji...</p>}
      {status === 'ok' && <><p style={{color:'#22c55e',fontSize:16,marginBottom:12}}>{msg}</p><a href="/login" style={{color:'var(--primary)'}}>Přihlásit se</a></>}
      {status === 'error' && <><p style={{color:'#ef4444',fontSize:14}}>{msg}</p><a href="/" style={{color:'var(--text-muted)',fontSize:13,display:'inline-block',marginTop:12}}>Zpět na mapu</a></>}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--surface)',padding:20}}>
      <div style={{background:'var(--bg)',borderRadius:12,padding:32,width:'100%',maxWidth:400,boxShadow:'0 8px 24px rgba(0,0,0,0.3)',border:'1px solid var(--border)'}}>
        <h1 style={{fontSize:24,marginBottom:24,textAlign:'center'}}>Ověření emailu</h1>
        <Suspense fallback={<p style={{textAlign:'center'}}>Načítám...</p>}><VerifyInner /></Suspense>
      </div>
    </div>
  );
}
