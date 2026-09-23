import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TeamSelect } from './pages/TeamSelect';
import { Dashboard } from './pages/Dashboard';
import { Predictions } from './pages/Predictions';
import { Leaderboard } from './pages/Leaderboard';

export const App = () => {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'
  const [currentTab, setCurrentTab] = useState('dashboard'); // 'dashboard' | 'predictions' | 'leaderboard' | 'team-select'

  if (loading) {
    return (
      <div className="min-h-screen bg-pitch flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-2 border-led border-t-transparent animate-spin rounded-none mb-4"></div>
        <span className="font-scoreboard tracking-widest text-led uppercase text-sm">
          Cargando Football Hub...
        </span>
      </div>
    );
  }

  // Si no está autenticado
  if (!user) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    );
  }

  // Si no ha seleccionado equipo favorito todavía
  if (!user.favoriteTeamId || currentTab === 'team-select') {
    return (
      <div>
        <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />
        <TeamSelect onComplete={() => setCurrentTab('dashboard')} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pitch text-main flex flex-col">
      <Navbar currentTab={currentTab} onSelectTab={setCurrentTab} />

      <main className="flex-1">
        {currentTab === 'dashboard' && (
          <Dashboard onNavigateToPredictions={() => setCurrentTab('predictions')} />
        )}
        {currentTab === 'predictions' && <Predictions />}
        {currentTab === 'leaderboard' && <Leaderboard />}
      </main>

      {/* Stadium Footer */}
      <footer className="border-t border-hairline bg-surface py-6 text-center text-xs font-mono text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Football Hub © 2026/2027 — Matchday Intelligence Engine</span>
          <div className="flex items-center space-x-3 text-[10px] text-muted uppercase">
            <span>Fuente: football-data.org</span>
            <span>•</span>
            <span>Modelo: Poisson</span>
            <span>•</span>
            <span>BFF Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;