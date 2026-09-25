import React, { useEffect, useState } from 'react';
import { useAuth } from './context/AuthContext';
import { useClub } from './context/ClubContext';
import { Navbar, TABS } from './components/Navbar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { TeamSelect } from './pages/TeamSelect';
import { Dashboard } from './pages/Dashboard';
import { Analysis } from './pages/Analysis';
import { Simulation } from './pages/Simulation';
import { Compare } from './pages/Compare';
import { Club } from './pages/Club';
import { Predictions } from './pages/Predictions';
import { Leaderboard } from './pages/Leaderboard';
import { Loading, ErrorState } from './components/ui';

const PAGES = { dashboard: Dashboard, analysis: Analysis, simulation: Simulation, compare: Compare, club: Club, predictions: Predictions, leaderboard: Leaderboard };
const VALID = new Set([...TABS.map((t) => t.id), 'team-select']);

// La pestaña se refleja en la URL (#analysis) para poder recargar o compartir
const tabFromHash = () => {
  const t = window.location.hash.replace('#', '');
  return VALID.has(t) ? t : 'dashboard';
};

export const App = () => {
  const { user, loading } = useAuth();
  const clubState = useClub();
  const [authView, setAuthView] = useState('login');
  const [tab, setTab] = useState(tabFromHash);

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const selectTab = (t) => {
    setTab(t);
    if (window.location.hash !== `#${t}`) window.history.replaceState(null, '', `#${t}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-pitch flex items-center justify-center"><Loading label="Cargando Football Hub…" /></div>;
  }

  if (!user) {
    return authView === 'login'
      ? <Login onSwitchToRegister={() => setAuthView('register')} />
      : <Register onSwitchToLogin={() => setAuthView('login')} />;
  }

  if (clubState.loading) {
    return <div className="min-h-screen bg-pitch flex items-center justify-center"><Loading label="Cargando clubes…" /></div>;
  }
  if (clubState.error) {
    return <div className="min-h-screen bg-pitch flex items-center justify-center"><ErrorState error={clubState.error} onRetry={clubState.reload} /></div>;
  }

  const needsClub = !clubState.club || tab === 'team-select';
  const Page = PAGES[tab] || Dashboard;

  return (
    <div className="min-h-screen bg-pitch text-main flex flex-col">
      <Navbar currentTab={tab} onSelectTab={selectTab} />
      <main className="flex-1">
        {needsClub
          ? <TeamSelect onComplete={() => selectTab('dashboard')} />
          // key: al cambiar de club se remonta la página y no quedan datos del club anterior
          : <Page key={clubState.club.id} />}
      </main>
      <footer className="border-t border-hairline bg-surface py-4 text-center text-[11px] font-mono text-muted">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-1">
          <span>Football Hub · proyecto académico · temporada en curso</span>
          <span>Datos deportivos: ESPN · Análisis, modelos y puntos clave: Football Hub</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
