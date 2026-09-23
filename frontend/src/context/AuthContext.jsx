import React, { createContext, useContext, useState, useEffect } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Intentar renovar sesión al cargar
  useEffect(() => {
    const initAuth = async () => {
      try {
        const res = await api.post('/auth/refresh');
        if (res.data?.accessToken) {
          setAccessToken(res.data.accessToken);
          setUser(res.data.user);
        }
      } catch (err) {
        // No hay sesión activa o expiró
        setAccessToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleAuthExpired = () => {
      setUser(null);
      setAccessToken(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = async (email, password, totpCode) => {
    const res = await api.post('/auth/login', { email, password, totpCode });
    if (res.data?.requires2FA) {
      return res.data;
    }
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (e) {
      // Ignorar error al cerrar sesión
    }
    setAccessToken(null);
    setUser(null);
  };

  const updateFavoriteTeam = async (teamId) => {
    const res = await api.put('/teams/favorite', { teamId });
    setUser(res.data.user);
    return res.data.user;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateFavoriteTeam, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);