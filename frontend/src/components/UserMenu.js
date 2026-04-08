'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthContext';

export default function UserMenu() {
  const { user, logout, isLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  if (isLoading) return null;
  if (!user) return <div className="user-menu-wrap"><a href="/login" className="btn-login">Přihlásit</a></div>;
  return (
    <div className="user-menu-wrap" ref={ref}>
      <button className="user-avatar" onClick={() => setOpen(!open)}>{(user.display_name||user.email)[0].toUpperCase()}</button>
      {open && <div className="user-dropdown">
        <div className="udd-header"><strong>{user.display_name||'Uživatel'}</strong><span>{user.email}</span></div>
        <a href="/profile" className="udd-item">Profil</a>
        <a href="/routes" className="udd-item">Uložené trasy</a>
        {user.role==='admin'&&<a href="/admin" className="udd-item">Admin</a>}
        <button className="udd-item" onClick={()=>{logout();setOpen(false);}}>Odhlásit</button>
      </div>}
    </div>
  );
}
