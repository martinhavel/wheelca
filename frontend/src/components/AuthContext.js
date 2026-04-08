'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3010';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined);
  const [token, setToken] = useState(null);

  const fetchMe = useCallback(async (t) => {
    try {
      const res = await fetch(`${API}/api/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
      if (res.ok) return await res.json();
    } catch {}
    return null;
  }, []);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('wc_token') : null;
    if (saved) {
      setToken(saved);
      fetchMe(saved).then(u => setUser(u || null)).catch(() => setUser(null));
    } else { setUser(null); }
  }, [fetchMe]);

  const login = async (email, password) => {
    const res = await fetch(`${API}/api/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('wc_token', data.token);
    setToken(data.token); setUser(data.user);
    return data.user;
  };

  const register = async (email, password, display_name) => {
    const res = await fetch(`${API}/api/auth/register`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, display_name })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Registration failed');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('wc_token'); setToken(null); setUser(null);
    fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, isLoading: user === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}
export const useAuth = () => useContext(AuthContext);
