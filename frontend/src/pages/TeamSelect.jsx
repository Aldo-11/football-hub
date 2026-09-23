import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Shield, Check, Search } from 'lucide-react';

export const TeamSelect = ({ onComplete }) => {
  const { user, updateFavoriteTeam } = useAuth();
  const [teams, setTeams] = useState([]);
  const [selectedTeamId, setSelectedTeamId] = useState(user?.favoriteTeamId || '65');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await api.get('/teams');
        setTeams(res.data.teams || []);
      } catch (err) {
        console.error('Error fetching teams:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeams();
  }, []);

  const handleSave = async () => {
    if (!selectedTeamId) return;
    setSaving(true);
    try {
      await updateFavoriteTeam(selectedTeamId);
      onComplete();
    } catch (err) {
      console.error('Error saving favorite team:', err);
    } finally {
      setSaving(false);
    }
  };

  const filteredTeams = teams.filter(t =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.shortName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-pitch py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border border-hairline bg-surface p-6 sm:p-8 mb-6 text-center">
          <div className="inline-block border border-led/50 px-3 py-1 bg-pitch mb-3">
            <span className="font-scoreboard text-led text-xs tracking-widest uppercase">Paso Requerido</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-scoreboard uppercase text-main tracking-wide">
            Selecciona tu Club Insignia
          </h1>
          <p className="text-xs font-mono text-muted uppercase mt-2 max-w-xl mx-auto">
            Configura el equipo principal para seguir en tu Matchday, analizar estadísticas y predecir resultados en la liga.
          </p>

          {/* Search box */}
          <div className="mt-6 max-w-md mx-auto relative">
            <Search className="w-4 h-4 text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Buscar club por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-pitch border border-hairline pl-10 pr-4 py-2 text-sm font-mono text-main focus:border-led focus:outline-none"
            />
          </div>
        </div>

        {/* Team Grid */}
        {loading ? (
          <div className="text-center py-12 text-muted font-mono text-xs uppercase">
            Cargando catálogo de clubes...
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-8">
            {filteredTeams.map((team) => {
              const isSelected = selectedTeamId === team.id;
              return (
                <div
                  key={team.id}
                  onClick={() => setSelectedTeamId(team.id)}
                  className={`border p-4 cursor-pointer transition-all flex flex-col items-center justify-between text-center relative ${
                    isSelected
                      ? 'border-led bg-led/10 shadow-[0_0_15px_rgba(242,183,5,0.15)]'
                      : 'border-hairline bg-surface hover:bg-surface-hover hover:border-hairline'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 bg-led text-pitch p-0.5">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div className="w-16 h-16 my-2 flex items-center justify-center">
                    {team.crest ? (
                      <img src={team.crest} alt={team.name} className="max-w-full max-h-full object-contain" />
                    ) : (
                      <Shield className="w-10 h-10 text-muted" />
                    )}
                  </div>

                  <div className="w-full mt-2">
                    <span className="text-[10px] font-mono text-muted uppercase tracking-wider block">{team.league}</span>
                    <h3 className="font-scoreboard uppercase text-xs sm:text-sm text-main truncate tracking-wide mt-0.5">
                      {team.shortName || team.name}
                    </h3>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sticky Action Footer */}
        <div className="border border-hairline bg-surface p-4 flex items-center justify-between sticky bottom-4 z-40 shadow-2xl">
          <div className="text-xs font-mono text-muted">
            Club Seleccionado:{' '}
            <span className="text-main font-bold">
              {teams.find(t => t.id === selectedTeamId)?.name || 'Ninguno'}
            </span>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || !selectedTeamId}
            className="bg-led hover:bg-yellow-400 text-pitch font-scoreboard uppercase px-6 py-2.5 text-xs tracking-wider transition-colors disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Guardando...' : 'Confirmar y Entrar al Hub'}
          </button>
        </div>
      </div>
    </div>
  );
};