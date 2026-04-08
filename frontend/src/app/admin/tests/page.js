'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '../../../components/AuthContext';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function AdminTestsPage() {
  const { user, token, isLoading } = useAuth();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/admin/tests`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => { setTests(d.tests || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  if (isLoading) return null;
  if (!user || user.role !== 'admin') { if (typeof window !== 'undefined') window.location.href = '/'; return null; }

  return (
    <div style={{minHeight:'100vh',background:'var(--surface)',padding:20}}>
      <div style={{maxWidth:800,margin:'0 auto'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h1 style={{fontSize:24}}>Vysledky testu</h1>
          <a href="/admin" style={{color:'var(--primary)',fontSize:14}}>Zpět</a>
        </div>
        {loading ? <p>Načítám...</p> : tests.length === 0 ? <p style={{color:'var(--text-muted)'}}>Zadne testy</p> : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {tests.map((t,i) => (
              <div key={i} style={{background:'var(--bg)',borderRadius:8,padding:12,border:'1px solid var(--border)'}}>
                <div style={{display:'flex',justifyContent:'space-between'}}>
                  <strong>{t.name || t.test_name || 'Test #'+(i+1)}</strong>
                  <span style={{color:t.passed?'#22c55e':'#ef4444',fontSize:13}}>{t.passed?'OK':'FAIL'}</span>
                </div>
                {t.message && <p style={{fontSize:12,color:'var(--text-muted)',marginTop:4}}>{t.message}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
