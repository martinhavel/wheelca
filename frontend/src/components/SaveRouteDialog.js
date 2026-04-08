'use client';
import { useState } from 'react';
const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';

export default function SaveRouteDialog({ route, routeStart, routeEnd, routeInfo, token, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!token) { setError('Přihlašte se pro uložení trasy'); return; }
    if (!name.trim()) { setError('Zadejte název'); return; }
    setLoading(true);
    setError('');
    try {
      console.log('Saving route, token:', token ? 'present' : 'missing', 'route:', !!route);
      const res = await fetch(`${API}/api/routes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), start_point: routeStart, end_point: routeEnd, route_geojson: route, distance_m: routeInfo?.dist, duration_s: routeInfo?.dur, engine: routeInfo?.engine })
      });
      const data = await res.json();
      console.log('Save response:', res.status, data);
      if (res.ok) { onSaved(); onClose(); } else { setError(data.error || 'Chyba při ukládání'); }
    } catch (err) { console.error('Save route error:', err); setError('Chyba připojení k serveru'); }
    setLoading(false);
  };
  return (
    <div className="report-overlay" onClick={onClose}><div className="report-dialog" onClick={e=>e.stopPropagation()}>
      <h2>Uložit trasu</h2>
      {error && <p style={{color:'#ef4444',fontSize:13}}>{error}</p>}
      <input value={name} onChange={e=>setName(e.target.value)} placeholder="Název trasy" autoFocus />
      <div className="btn-group" style={{marginTop:12}}>
        <button className="btn btn-primary" onClick={save} disabled={loading}>{loading?'Ukládám...':'Uložit'}</button>
        <button className="btn btn-danger" onClick={onClose}>Zrušit</button>
      </div>
    </div></div>
  );
}
