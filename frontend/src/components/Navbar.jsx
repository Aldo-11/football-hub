import React from 'react';
import { Activity, BarChart3, Dices, GitCompare, Landmark, Compass, Trophy, LogOut, RefreshCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useClub } from '../context/ClubContext';
import { Crest } from './ui';

export const TABS = [
  { id: 'dashboard', label: 'Matchday', icon: Activity },
  { id: 'analysis', label: 'Análisis', icon: BarChart3 },
  { id: 'simulation', label: 'Simulación', icon: Dices },
  { id: 'compare', label: 'H2H', icon: GitCompare },
  { id: 'club', label: 'Club', icon: Landmark },
  { id: 'predictions', label: 'Pronósticos', icon: Compass },
  { id: 'leaderboard', label: 'Ranking', icon: Trophy }
];

export const Navbar = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();
  const { club } = useClub();

  return (
    <header className="border-b border-hairline bg-surface/95 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-3">
        <button className="flex items-center gap-2" onClick={() => onSelectTab('dashboard')} aria-label="Ir a Matchday">
          <span className="w-8 h-8 border border-led/40 bg-pitch flex items-center justify-center font-scoreboard text-led">FH</span>
          <span className="font-scoreboard tracking-wider text-sm text-main uppercase hidden sm:inline">Football Hub</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {club && (
            <button onClick={() => onSelectTab('team-select')} title="Cambiar de club"
              className="flex items-center gap-1.5 px-2 py-1 text-xs border border-hairline text-main hover:border-muted min-w-0">
              <Crest src={club.crest} size="w-4 h-4" />
              <span className="truncate max-w-[100px]">{club.shortName}</span>
              <RefreshCcw className="w-3 h-3 text-muted flex-shrink-0" />
            </button>
          )}
          <span className="hidden md:block text-xs font-mono text-muted truncate max-w-[160px]">{user?.email}</span>
          <button onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión" className="p-1.5 text-muted hover:text-loss border border-hairline hover:border-loss">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {club && (
        <nav className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 flex overflow-x-auto" aria-label="Secciones">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => onSelectTab(id)} aria-current={currentTab === id ? 'page' : undefined}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs uppercase tracking-wider font-semibold border-b-2 whitespace-nowrap ${
                currentTab === id ? 'border-led text-led' : 'border-transparent text-muted hover:text-main'}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </nav>
      )}
    </header>
  );
};
