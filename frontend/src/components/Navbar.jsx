import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Trophy, Activity, LogOut, Compass } from 'lucide-react';

export const Navbar = ({ currentTab, onSelectTab }) => {
  const { user, logout } = useAuth();

  return (
    <nav className="border-b border-hairline bg-surface/90 sticky top-0 z-50 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
          <div className="w-8 h-8 rounded-none border border-led/40 bg-pitch flex items-center justify-center">
            <span className="font-scoreboard text-led text-base">FH</span>
          </div>
          <div>
            <span className="font-scoreboard tracking-wider text-base text-main uppercase">Football Hub</span>
            <span className="block text-[10px] uppercase font-mono text-muted tracking-widest leading-none">Matchday Live</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 sm:space-x-4">
          <button
            onClick={() => onSelectTab('dashboard')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all ${
              currentTab === 'dashboard'
                ? 'border-led text-led bg-surface-subtle'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" />
              <span>Matchday</span>
            </span>
          </button>

          <button
            onClick={() => onSelectTab('predictions')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all ${
              currentTab === 'predictions'
                ? 'border-led text-led bg-surface-subtle'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5" />
              <span>Pronósticos</span>
            </span>
          </button>

          <button
            onClick={() => onSelectTab('leaderboard')}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider font-semibold border-b-2 transition-all ${
              currentTab === 'leaderboard'
                ? 'border-led text-led bg-surface-subtle'
                : 'border-transparent text-muted hover:text-main'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" />
              <span>Clasificación</span>
            </span>
          </button>
        </div>

        {/* User & Actions */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => onSelectTab('team-select')}
            title="Cambiar club seguido"
            className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1 text-xs border border-hairline text-muted hover:text-main hover:border-muted transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-led" />
            <span>Club</span>
          </button>

          <div className="text-right hidden md:block">
            <span className="block text-xs font-mono text-main truncate max-w-[150px]">{user?.email}</span>
            <div className="flex items-center justify-end space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-win animate-pulse"></span>
              <span className="text-[10px] text-win uppercase font-mono">En línea</span>
            </div>
          </div>

          <button
            onClick={logout}
            title="Cerrar sesión"
            className="p-1.5 text-muted hover:text-loss border border-hairline hover:border-loss transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </nav>
  );
};