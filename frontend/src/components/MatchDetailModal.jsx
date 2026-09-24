import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { X, ShieldAlert, Sparkles, Activity, Users, AlertCircle, RefreshCw } from 'lucide-react';

export const MatchDetailModal = ({ match, onClose }) => {
  const [detail, setDetail] = useState(null);
  const [liveData, setLiveData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pitch'); // 'pitch' | 'radar' | 'events'

  const fixtureId = match?.fixtureId;
  const isScheduled = match?.status === 'SCHEDULED';
  const isFinished = match?.status === 'FINISHED';

  useEffect(() => {
    if (!fixtureId) return;

    let isMounted = true;

    const fetchDetail = async () => {
      try {
        const res = await api.get(`/matches/detail/${fixtureId}`, {
          params: {
            competition: match.competition,
            homeTeam: match.homeTeam?.name,
            awayTeam: match.awayTeam?.name,
            status: match.status
          }
        });
        if (isMounted) {
          setDetail(res.data);
          if (res.data?.isInPlay) {
            setLiveData({ events: res.data.events });
          }
        }
      } catch (err) {
        console.error('Error fetching match detail:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchDetail();

    // Polling de 25 segundos para partidos en juego
    let intervalId = null;
    if (match.status === 'IN_PLAY' || detail?.isInPlay) {
      intervalId = setInterval(async () => {
        try {
          const liveRes = await api.get(`/matches/live/${fixtureId}`);
          if (isMounted && liveRes.data?.isInPlay) {
            setLiveData(liveRes.data);
          }
        } catch (e) {
          // Ignorar error de polling
        }
      }, 25000);
    }

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [fixtureId, match]);

  if (!match) return null;

  const hasSportmonks = detail?.detailAvailable || detail?.sportmonksAvailable;
  const radarData = detail?.radar || [];
  const xg = detail?.xg;
  const formations = detail?.formations;
  const lineups = detail?.lineups;
  const events = liveData?.events || detail?.events || [];
  const isInPlay = detail?.isInPlay || match.status === 'IN_PLAY';

  // Coordenadas calculadas para el Radar Spider de 5 ejes (SVG 320x320, centro 160,160, radio 110)
  const renderSpiderRadar = () => {
    if (!radarData || radarData.length === 0) return null;

    const cx = 160;
    const cy = 160;
    const radius = 110;
    const totalAxes = radarData.length;

    // Calcular puntos de polígono concéntrico (fondos 25%, 50%, 75%, 100%)
    const getRingPoints = (factor) => {
      return Array.from({ length: totalAxes }).map((_, i) => {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const x = cx + radius * factor * Math.cos(angle);
        const y = cy + radius * factor * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    };

    // Calcular puntos para Home y Away
    const getPolygonPoints = (teamKey) => {
      return radarData.map((d, i) => {
        const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
        const val = Math.min(Math.max(d[teamKey] || 0, 0), d.max || 100);
        const ratio = val / (d.max || 100);
        const x = cx + radius * ratio * Math.cos(angle);
        const y = cy + radius * ratio * Math.sin(angle);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(' ');
    };

    const homePoints = getPolygonPoints('home');
    const awayPoints = getPolygonPoints('away');

    return (
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 320 320" className="w-full max-w-[340px] h-auto overflow-visible">
          {/* Anillos concéntricos */}
          {[0.25, 0.5, 0.75, 1.0].map((step, idx) => (
            <polygon
              key={idx}
              points={getRingPoints(step)}
              fill={step === 1.0 ? '#0B150F' : 'none'}
              stroke="rgba(237, 239, 231, 0.12)"
              strokeWidth="1"
            />
          ))}

          {/* Ejes radiales */}
          {radarData.map((_, i) => {
            const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
            const x = cx + radius * Math.cos(angle);
            const y = cy + radius * Math.sin(angle);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={x}
                y2={y}
                stroke="rgba(237, 239, 231, 0.15)"
                strokeWidth="1"
              />
            );
          })}

          {/* Polígono Local (Verde #4C9A6A) */}
          <polygon
            points={homePoints}
            fill="#4C9A6A"
            fillOpacity="0.35"
            stroke="#4C9A6A"
            strokeWidth="2.5"
          />

          {/* Polígono Visitante (LED Ámbar #F2B705) */}
          <polygon
            points={awayPoints}
            fill="#F2B705"
            fillOpacity="0.3"
            stroke="#F2B705"
            strokeWidth="2.5"
          />

          {/* Puntos y Etiquetas de Vértices */}
          {radarData.map((d, i) => {
            const angle = (Math.PI * 2 / totalAxes) * i - Math.PI / 2;
            const labelRadius = radius + 22;
            const lx = cx + labelRadius * Math.cos(angle);
            const ly = cy + labelRadius * Math.sin(angle);

            return (
              <g key={i}>
                <text
                  x={lx}
                  y={ly}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className="fill-[#EDEFE7] text-[10px] font-mono uppercase tracking-wider font-semibold"
                >
                  {d.metric}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Tabla comparativa debajo del radar */}
        <div className="w-full mt-4 border border-hairline bg-pitch/60 divide-y divide-hairline-subtle text-xs font-mono">
          <div className="grid grid-cols-3 py-2 px-3 text-muted text-[10px] uppercase tracking-wider">
            <span className="text-win font-bold">{match.homeTeam?.name || 'Local'}</span>
            <span className="text-center">Métrica</span>
            <span className="text-right text-led font-bold">{match.awayTeam?.name || 'Visitante'}</span>
          </div>
          {radarData.map((d) => (
            <div key={d.metric} className="grid grid-cols-3 py-1.5 px-3 items-center">
              <span className="text-win font-scoreboard tabular-nums font-bold">
                {d.home}{d.unit}
              </span>
              <span className="text-center text-muted text-[11px]">{d.metric}</span>
              <span className="text-right text-led font-scoreboard tabular-nums font-bold">
                {d.away}{d.unit}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render de Cancha de Fútbol SVG completa
  const renderSoccerPitch = () => {
    if (!lineups) return null;

    const homeStarters = lineups.home?.starters || [];
    const awayStarters = lineups.away?.starters || [];

    return (
      <div className="space-y-4">
        {/* Cabecera táctica con indicador oficial vs probable */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono border-b border-hairline pb-2">
          <div>
            <span className="text-muted block text-[10px] uppercase">Formación Local</span>
            <span className="font-scoreboard text-win text-sm tracking-wider uppercase">
              {match.homeTeam?.shortName || match.homeTeam?.name} ({formations?.home || '4-3-3'})
            </span>
          </div>

          <div className="text-center">
            <span className={`text-[10px] px-2 py-0.5 border uppercase font-bold inline-block ${
              isFinished
                ? 'bg-win/20 text-win border-win/40'
                : 'bg-pitch text-muted border-hairline'
            }`}>
              {isFinished ? '✓ Alineación Oficial con la que salieron' : '📋 Última Alineación Titular del Club'}
            </span>
          </div>

          <div className="text-right">
            <span className="text-muted block text-[10px] uppercase">Formación Visitante</span>
            <span className="font-scoreboard text-led text-sm tracking-wider uppercase">
              {match.awayTeam?.shortName || match.awayTeam?.name} ({formations?.away || '4-2-3-1'})
            </span>
          </div>
        </div>

        {/* Cancha SVG Vertical */}
        <div className="relative border-2 border-hairline bg-[#0B150F] rounded-none overflow-hidden mx-auto max-w-[420px]">
          <svg viewBox="0 0 360 480" className="w-full h-auto block select-none">
            {/* Césped con franjas tácticas */}
            <defs>
              <pattern id="pitchStripes" width="360" height="40" patternUnits="userSpaceOnUse">
                <rect width="360" height="20" fill="#0E1A13" />
                <rect y="20" width="360" height="20" fill="#0A140E" />
              </pattern>
            </defs>
            <rect width="360" height="480" fill="url(#pitchStripes)" />

            {/* Líneas de Cal Reglamentarias */}
            <g stroke="rgba(237, 239, 231, 0.22)" strokeWidth="1.5" fill="none">
              {/* Contorno */}
              <rect x="15" y="15" width="330" height="450" />
              {/* Línea media */}
              <line x1="15" y1="240" x2="345" y2="240" />
              {/* Círculo central */}
              <circle cx="180" cy="240" r="42" />
              <circle cx="180" cy="240" r="2.5" fill="rgba(237, 239, 231, 0.4)" />

              {/* Área grande Superior (Away) */}
              <rect x="105" y="15" width="150" height="75" />
              <rect x="140" y="15" width="80" height="25" />
              <circle cx="180" cy="65" r="2" fill="rgba(237, 239, 231, 0.4)" />
              <path d="M 145,90 A 30,30 0 0,0 215,90" />

              {/* Área grande Inferior (Home) */}
              <rect x="105" y="390" width="150" height="75" />
              <rect x="140" y="440" width="80" height="25" />
              <circle cx="180" cy="415" r="2" fill="rgba(237, 239, 231, 0.4)" />
              <path d="M 145,390 A 30,30 0 0,1 215,390" />
            </g>

            {/* Jugadores Visitantes (Mitad Superior: y de 40 a 195) */}
            {awayStarters.map((p, idx) => {
              const xPos = p.x != null ? (15 + (p.x / 100) * 330) : (idx === 0 ? 180 : 60 + (idx % 4) * 80);
              const yPos = p.y != null ? (40 + ((p.y - 35) / 155) * 155) : (idx === 0 ? 45 : 85 + Math.floor(idx / 4) * 55);
              const nameParts = (p.name || '').trim().split(' ');
              const shortName = nameParts[nameParts.length - 1] || 'Jugador';
              const displayName = shortName.length > 10 ? shortName.slice(0, 9) + '.' : shortName;

              return (
                <g key={p.id || idx} className="cursor-pointer">
                  <circle cx={xPos} cy={yPos} r="10" fill="#111B15" stroke="#F2B705" strokeWidth="2" />
                  <text
                    x={xPos}
                    y={yPos}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-led text-[9px] font-scoreboard font-bold select-none"
                  >
                    {p.number || idx + 1}
                  </text>
                  <text
                    x={xPos}
                    y={yPos + 14}
                    textAnchor="middle"
                    className="fill-[#EDEFE7] text-[8px] font-mono tracking-tight font-semibold select-none"
                    style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.95))' }}
                  >
                    {displayName}
                  </text>
                </g>
              );
            })}

            {/* Jugadores Locales (Mitad Inferior: y de 285 a 440) */}
            {homeStarters.map((p, idx) => {
              const xPos = p.x != null ? (15 + (p.x / 100) * 330) : (idx === 0 ? 180 : 60 + (idx % 4) * 80);
              const yPos = p.y != null ? (440 - ((p.y - 35) / 155) * 155) : (idx === 0 ? 435 : 395 - Math.floor(idx / 4) * 55);
              const nameParts = (p.name || '').trim().split(' ');
              const shortName = nameParts[nameParts.length - 1] || 'Jugador';
              const displayName = shortName.length > 10 ? shortName.slice(0, 9) + '.' : shortName;

              // Para el portero local (y=440), colocar el nombre arriba para que no toque el borde
              const nameY = (idx === 0 || p.pos === 'GK') ? yPos - 13 : yPos + 14;

              return (
                <g key={p.id || idx} className="cursor-pointer">
                  <circle cx={xPos} cy={yPos} r="10" fill="#111B15" stroke="#4C9A6A" strokeWidth="2" />
                  <text
                    x={xPos}
                    y={yPos}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-win text-[9px] font-scoreboard font-bold select-none"
                  >
                    {p.number || idx + 1}
                  </text>
                  <text
                    x={xPos}
                    y={nameY}
                    textAnchor="middle"
                    className="fill-[#EDEFE7] text-[8px] font-mono tracking-tight font-semibold select-none"
                    style={{ filter: 'drop-shadow(0px 1px 2px rgba(0,0,0,0.95))' }}
                  >
                    {displayName}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Bancas / Suplentes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Suplentes Local */}
          <div className="border border-hairline bg-pitch/40 p-3">
            <span className="text-[10px] font-mono text-win uppercase tracking-wider block font-semibold mb-2">
              Banca: {match.homeTeam?.shortName || 'Local'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(lineups.home?.bench || []).map((b) => (
                <span key={b.id || b.name} className="px-2 py-0.5 bg-surface text-[10px] font-mono border border-hairline-subtle text-muted">
                  #{b.number} {b.name}
                </span>
              ))}
            </div>
          </div>

          {/* Suplentes Visitante */}
          <div className="border border-hairline bg-pitch/40 p-3">
            <span className="text-[10px] font-mono text-led uppercase tracking-wider block font-semibold mb-2">
              Banca: {match.awayTeam?.shortName || 'Visitante'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(lineups.away?.bench || []).map((b) => (
                <span key={b.id || b.name} className="px-2 py-0.5 bg-surface text-[10px] font-mono border border-hairline-subtle text-muted">
                  #{b.number} {b.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-pitch/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl border border-hairline bg-surface max-h-[92vh] flex flex-col shadow-2xl">
        {/* Modal Top Scoreboard Header */}
        <div className="border-b border-hairline p-5 bg-surface-subtle flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2 text-[11px] font-mono text-muted uppercase">
              <span className="w-2 h-2 bg-led animate-pulse"></span>
              <span className="font-semibold text-main">{match.competition}</span>
              <span>•</span>
              <span>{new Date(match.utcDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1 border border-hairline text-muted hover:text-main hover:border-main transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Teams Matchup Header */}
          <div className="grid grid-cols-11 items-center gap-2">
            {/* Local */}
            <div className="col-span-4 flex items-center space-x-3 justify-end text-right">
              <div>
                <h3 className="font-scoreboard uppercase text-sm sm:text-lg text-main leading-tight truncate">
                  {match.homeTeam?.name}
                </h3>
                <span className="text-[10px] font-mono text-muted uppercase">Local</span>
              </div>
              {match.homeTeam?.crest && (
                <img src={match.homeTeam.crest} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
              )}
            </div>

            {/* Score / Status */}
            <div className="col-span-3 text-center">
              <div className="bg-pitch border border-hairline px-3 py-1.5 inline-block">
                <span className="font-scoreboard text-2xl sm:text-3xl text-led tabular-nums block">
                  {match.score?.fullTime?.home ?? '-'} : {match.score?.fullTime?.away ?? '-'}
                </span>
                <span className="text-[9px] font-mono uppercase tracking-widest text-muted block">
                  {isFinished ? 'Finalizado' : isScheduled ? 'Programado' : 'En Vivo 🔴'}
                </span>
              </div>

              {/* Bonus xG display */}
              {xg && (
                <div className="mt-1 text-[10px] font-mono text-muted">
                  xG: <span className="text-win font-bold">{xg.home}</span> - <span className="text-led font-bold">{xg.away}</span>
                </div>
              )}
            </div>

            {/* Visitante */}
            <div className="col-span-4 flex items-center space-x-3 justify-start text-left">
              {match.awayTeam?.crest && (
                <img src={match.awayTeam.crest} alt="" className="w-10 h-10 object-contain flex-shrink-0" />
              )}
              <div>
                <h3 className="font-scoreboard uppercase text-sm sm:text-lg text-main leading-tight truncate">
                  {match.awayTeam?.name}
                </h3>
                <span className="text-[10px] font-mono text-muted uppercase">Visitante</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-muted font-mono text-xs uppercase flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-led mb-2" />
              <span>Consultando inteligencia táctica...</span>
            </div>
          ) : !hasSportmonks ? (
            /* Estado vacío elegante para liga no cubierta */
            <div className="border border-hairline bg-pitch/50 p-8 text-center space-y-4 my-4">
              <div className="w-12 h-12 border border-hairline bg-surface mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-led" />
              </div>
              <div>
                <h4 className="font-scoreboard uppercase text-main text-base tracking-wide">
                  Detalle Táctico Avanzado No Disponible
                </h4>
                <p className="text-xs font-mono text-muted max-w-md mx-auto mt-2 leading-relaxed">
                  {detail?.reason || 'Estadísticas detalladas no disponibles para este encuentro. Se requiere conexión a fuente de datos complementaria.'}
                </p>
              </div>

              <div className="pt-3 border-t border-hairline-subtle text-[11px] font-mono text-muted">
                <span>Marcador oficial y programación sincronizados con la fuente principal.</span>
              </div>
            </div>
          ) : (
            /* Detalle táctico completo */
            <div>
              {/* Navigation Tabs for Detail */}
              <div className="flex items-center space-x-2 border-b border-hairline pb-3 mb-5 text-xs font-mono">
                <button
                  onClick={() => setActiveTab('pitch')}
                  className={`px-3 py-1.5 uppercase font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'pitch' ? 'border-led text-led bg-pitch' : 'border-transparent text-muted hover:text-main'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{isFinished ? 'Alineación Oficial (con la que jugaron)' : 'Última Alineación Titular'}</span>
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab('radar')}
                  className={`px-3 py-1.5 uppercase font-semibold border-b-2 transition-all cursor-pointer ${
                    activeTab === 'radar' ? 'border-led text-led bg-pitch' : 'border-transparent text-muted hover:text-main'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Radar de Rendimiento (5 Ejes)</span>
                  </span>
                </button>

                {isInPlay && (
                  <button
                    onClick={() => setActiveTab('events')}
                    className={`px-3 py-1.5 uppercase font-semibold border-b-2 transition-all cursor-pointer ${
                      activeTab === 'events' ? 'border-led text-led bg-pitch' : 'border-transparent text-muted hover:text-main'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-loss animate-pulse" />
                      <span>En Vivo ({events.length})</span>
                    </span>
                  </button>
                )}
              </div>

              {/* Tab 1: Pitch SVG */}
              {activeTab === 'pitch' && renderSoccerPitch()}

              {/* Tab 2: Radar Spider Chart */}
              {activeTab === 'radar' && renderSpiderRadar()}

              {/* Tab 3: Live Events Timeline */}
              {activeTab === 'events' && isInPlay && (
                <div className="border border-hairline bg-pitch/40 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-mono text-muted border-b border-hairline pb-2">
                    <span className="text-loss font-bold uppercase flex items-center gap-1">
                      <span className="w-2 h-2 bg-loss rounded-full animate-ping"></span>
                      Minuto a Minuto Oficial
                    </span>
                    <span>Actualización cada 25s</span>
                  </div>

                  {events.length === 0 ? (
                    <p className="text-center font-mono text-xs text-muted py-6">Sin incidencias reportadas aún en el encuentro.</p>
                  ) : (
                    <div className="space-y-2">
                      {events.map((ev, idx) => (
                        <div key={idx} className="flex items-center space-x-3 p-2 bg-surface text-xs font-mono border border-hairline-subtle">
                          <span className="px-2 py-0.5 bg-pitch text-led font-scoreboard tabular-nums border border-hairline text-center w-12">
                            {ev.minute}'
                          </span>
                          <span className="text-base">
                            {ev.type === 'goal' ? '⚽' : ev.type === 'yellowcard' ? '🟨' : ev.type === 'redcard' ? '🟥' : '🔄'}
                          </span>
                          <div className="flex-1 truncate">
                            <span className="text-main font-semibold">{ev.player}</span>
                            <span className="text-muted text-[10px] ml-2 uppercase">({ev.type})</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-hairline p-3 bg-surface-subtle text-right flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 border border-hairline text-xs font-mono uppercase text-muted hover:text-main hover:border-main transition-colors cursor-pointer"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};