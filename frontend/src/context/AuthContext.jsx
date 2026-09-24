import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAccessToken } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restaurar sesión con la cookie httpOnly de refresh
  useEffect(() => {
    api.post('/auth/refresh')
      .then((res) => {
        setAccessToken(res.data.accessToken);
        setUser(res.data.user);
      })
      .catch(() => {
        setAccessToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));

    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (email, password, totpCode) => {
    const res = await api.post('/auth/login', { email, password, ...(totpCode ? { totpCode } : {}) });
    if (res.data?.requires2FA) return res.data;
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  const register = useCallback(async (email, password) => {
    const res = await api.post('/auth/register', { email, password });
    setAccessToken(res.data.accessToken);
    setUser(res.data.user);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const updateFavoriteClub = useCallback(async (clubId) => {
    const res = await api.put('/clubs/favorite', { clubId });
    setUser(res.data.user);
    return res.data.user;
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout, updateFavoriteClub }),
    [user, loading, login, register, logout, updateFavoriteClub]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
