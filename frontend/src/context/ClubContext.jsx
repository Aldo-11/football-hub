import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useApi } from '../hooks/useApi';

/**
 * Club seleccionado por el usuario. Es la única fuente de verdad del
 * "Tu club" en toda la interfaz: todas las pantallas leen `club` de aquí.
 */
const ClubContext = createContext(null);

export const ClubProvider = ({ children }) => {
  const { user } = useAuth();
  const { data, loading, error, reload } = useApi(user ? '/clubs' : null);

  const value = useMemo(() => {
    const clubs = data?.clubs || [];
    const club = clubs.find((c) => c.id === user?.favoriteTeamId) || null;
    return { clubs, club, loading, error, reload };
  }, [data, loading, error, reload, user?.favoriteTeamId]);

  return <ClubContext.Provider value={value}>{children}</ClubContext.Provider>;
};

export const useClub = () => useContext(ClubContext);
