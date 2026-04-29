import React, { useState, useEffect } from 'react';
import {
  Trophy, Users, History, Play, Pause, RotateCcw,
  ChevronDown, Shield, User, ShieldCheck, X
} from 'lucide-react';
import { Game, Player, QueueState, MatchHistory } from '../types';
import { supabase } from '../services/supabase';

interface LandscapeViewProps {
  game: Game;
  queue: QueueState | null;
  players: Player[];
  isAdmin: boolean;
  onUpdate: (updates: Partial<Game>) => void;
  onScore: (team: 'A' | 'B', delta: number) => void;
  onEndMatch: (winner: 'A' | 'B' | 'Empate') => void;
}

type Panel = 'winner' | 'lineup' | 'history' | null;

export const LandscapeView: React.FC<LandscapeViewProps> = ({
  game, queue, players, isAdmin, onUpdate, onScore, onEndMatch
}) => {
  const [openPanel, setOpenPanel] = useState<Panel>(null);
  const [history, setHistory] = useState<MatchHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Timer logic ───────────────────────────────────────
  const { timerState, settings } = game;

  const calcTimeLeft = (): number => {
    if (!timerState.isRunning || !timerState.startTime) return timerState.remainingSeconds;
    const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
    return Math.max(0, timerState.remainingSeconds - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState<number>(calcTimeLeft);

  useEffect(() => {
    setTimeLeft(calcTimeLeft());
  }, [timerState.isRunning, timerState.startTime, timerState.remainingSeconds]);

  useEffect(() => {
    if (!timerState.isRunning) return;
    const interval = setInterval(() => {
      const remaining = calcTimeLeft();
      setTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (isAdmin) onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: 0 } });
      }
    }, 500);
    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.startTime, timerState.remainingSeconds, isAdmin]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  const totalSeconds = settings.matchTime * 60;
  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  const isRunning = timerState.isRunning;
  const isLow = timeLeft <= 30 && isRunning;

  const handleToggle = () => {
    if (isRunning) {
      onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: timeLeft } });
    } else {
      onUpdate({ timerState: { isRunning: true, startTime: Date.now(), remainingSeconds: timeLeft } });
    }
  };

  const handleReset = () => {
    onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: settings.matchTime * 60 } });
  };

  // ── Panel toggle ──────────────────────────────────────
  const togglePanel = async (panel: Panel) => {
    if (openPanel === panel) {
      setOpenPanel(null);
      return;
    }
    setOpenPanel(panel);
    if (panel === 'history') {
      setLoadingHistory(true);
      try {
        const data = await supabase.history.getByGame(game.id);
        setHistory(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingHistory(false);
      }
    }
  };

  const handleEndMatchAndClose = (winner: 'A' | 'B' | 'Empate') => {
    onEndMatch(winner);
    setOpenPanel(null);
  };

  // ── Helpers ───────────────────────────────────────────
  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || '?';
  const isGK = (id: string) => players.find(p => p.id === id)?.isGoalkeeper ?? false;

  // ── Widget button ─────────────────────────────────────
  const Widget = ({
    panel, icon, label, color
  }: { panel: Panel; icon: React.ReactNode; label: string; color: string }) => (
    <button
      onClick={() => togglePanel(panel)}
      className={`relative flex flex-col items-center justify-center w-11 h-11 rounded-full border-2 transition-all active:scale-90 shadow-lg ${
        openPanel === panel
          ? `${color} border-transparent text-white shadow-xl scale-105`
          : 'bg-white/10 dark:bg-slate-800/80 border-white/20 dark:border-slate-700 text-white/80 dark:text-slate-300 backdrop-blur-sm'
      }`}
      title={label}
    >
      {icon}
      {openPanel === panel && (
        <span className="absolute -bottom-4 text-[8px] font-black uppercase tracking-wider text-white/60 whitespace-nowrap">{label}</span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-950 dark:bg-slate-950 flex flex-col overflow-hidden">

      {/* ── Barra de progresso do timer ── */}
      <div className="absolute top-0 left-0 w-full h-[3px] bg-slate-800 z-10">
        <div
          className={`h-full transition-all duration-500 ${isLow ? 'bg-red-500 shadow-[0_0_8px_#ef4444]' : 'bg-blue-500 shadow-[0_0_8px_#3b82f6]'}`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex flex-1 min-h-0">

        {/* COLUNA ESQUERDA — widgets */}
        <div className="flex flex-col items-center justify-center gap-5 px-3 w-16 shrink-0">
          <Widget
            panel="winner"
            icon={<Trophy size={18} strokeWidth={2.5} />}
            label="FIM"
            color="bg-amber-500"
          />
          <Widget
            panel="lineup"
            icon={<Users size={18} strokeWidth={2.5} />}
            label="TIMES"
            color="bg-blue-600"
          />
          <Widget
            panel="history"
            icon={<History size={18} strokeWidth={2.5} />}
            label="HIST."
            color="bg-slate-600"
          />
        </div>

        {/* CENTRO — cronômetro */}
        <div className="flex-1 flex items-center justify-center min-w-0">
          <div
            className={`font-heading italic tabular-nums tracking-tighter font-black leading-none select-none transition-all duration-300 ${
              isLow
                ? 'text-red-400 drop-shadow-[0_0_30px_rgba(239,68,68,0.6)]'
                : isRunning
                ? 'text-white drop-shadow-[0_0_40px_rgba(59,130,246,0.4)] scale-105'
                : 'text-slate-500'
            }`}
            style={{ fontSize: 'clamp(4rem, 18vw, 9rem)' }}
          >
            {formatTime(timeLeft)}
          </div>
        </div>

        {/* COLUNA DIREITA — controles do timer */}
        {isAdmin && (
          <div className="flex flex-col items-center justify-center gap-3 px-3 w-16 shrink-0">
            {/* Play/Pause */}
            <button
              onClick={handleToggle}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-lg border-b-4 ${
                isRunning
                  ? 'bg-slate-700 border-slate-900 text-white'
                  : 'bg-blue-600 border-blue-800 text-white shadow-[0_0_20px_rgba(59,130,246,0.4)]'
              }`}
            >
              {isRunning ? <Pause size={18} strokeWidth={3} /> : <Play size={18} strokeWidth={3} />}
            </button>

            {/* Reset */}
            <button
              onClick={handleReset}
              className="w-11 h-11 rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700 text-slate-400 hover:text-white transition-all active:scale-90 shadow-md"
            >
              <RotateCcw size={16} strokeWidth={2.5} />
            </button>
          </div>
        )}
      </div>

      {/* ── BARRA INFERIOR — placar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 shrink-0">
        {/* Time A */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest hidden xs:block">
            {queue?.teamA ? getPlayerName(queue.teamA[0]).split(' ')[0] : 'ALPHA'}
          </span>
          <span className="text-[11px] font-black text-blue-400 uppercase tracking-widest xs:hidden">A</span>
          {isAdmin && (
            <>
              <button onClick={() => onScore('A', -1)} className="w-7 h-7 rounded-lg bg-slate-700 text-white font-black text-sm active:scale-90 border border-slate-600">−</button>
              <button onClick={() => onScore('A', 1)} className="w-8 h-7 rounded-lg bg-blue-600 text-white font-black text-sm active:scale-90 shadow-md">+</button>
            </>
          )}
        </div>

        {/* Placar central */}
        <div className="flex items-center gap-3">
          <span className="text-2xl font-heading italic font-black text-white tabular-nums">{game.scoreA}</span>
          <span className="text-base font-heading italic text-slate-600 font-black">×</span>
          <span className="text-2xl font-heading italic font-black text-white tabular-nums">{game.scoreB}</span>
        </div>

        {/* Time B */}
        <div className="flex items-center gap-2">
          {isAdmin && (
            <>
              <button onClick={() => onScore('B', 1)} className="w-8 h-7 rounded-lg bg-orange-600 text-white font-black text-sm active:scale-90 shadow-md">+</button>
              <button onClick={() => onScore('B', -1)} className="w-7 h-7 rounded-lg bg-slate-700 text-white font-black text-sm active:scale-90 border border-slate-600">−</button>
            </>
          )}
          <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest hidden xs:block">
            {queue?.teamB ? getPlayerName(queue.teamB[0]).split(' ')[0] : 'BETA'}
          </span>
          <span className="text-[11px] font-black text-orange-400 uppercase tracking-widest xs:hidden">B</span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          PAINÉIS DESLIZANTES (de baixo para cima)
      ══════════════════════════════════════════════════ */}

      {openPanel && (
        <div className="absolute inset-0 z-50 flex flex-col justify-end">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenPanel(null)}
          />

          {/* Painel */}
          <div className="relative bg-slate-900 border-t-2 border-slate-700 rounded-t-3xl max-h-[75%] flex flex-col animate-in slide-in-from-bottom-4 duration-300">

            {/* Handle + header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-slate-800 shrink-0">
              <div className="w-10 h-1 bg-slate-700 rounded-full absolute top-2 left-1/2 -translate-x-1/2" />
              <h3 className="text-[12px] font-black uppercase tracking-[0.3em] text-white italic mt-2">
                {openPanel === 'winner' && '🏆 Resultado da Partida'}
                {openPanel === 'lineup' && '👥 Escalação'}
                {openPanel === 'history' && '📋 Histórico de Partidas'}
              </h3>
              <button onClick={() => setOpenPanel(null)} className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white mt-2">
                <X size={16} />
              </button>
            </div>

            {/* ── PAINEL: GANHADOR ── */}
            {openPanel === 'winner' && (
              <div className="flex flex-col gap-4 p-5 overflow-y-auto">
                {/* Placar atual */}
                <div className="flex items-center justify-center gap-6 py-3 bg-slate-800 rounded-2xl border border-slate-700">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1">ALPHA</p>
                    <span className="text-4xl font-heading italic font-black text-white">{game.scoreA}</span>
                  </div>
                  <span className="text-2xl font-heading italic text-slate-600 font-black">×</span>
                  <div className="text-center">
                    <p className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-1">BETA</p>
                    <span className="text-4xl font-heading italic font-black text-white">{game.scoreB}</span>
                  </div>
                </div>

                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Quem venceu esta partida?</p>

                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={() => handleEndMatchAndClose('A')}
                    className="py-4 bg-blue-600 text-white rounded-2xl font-heading italic text-[12px] uppercase tracking-wider font-black shadow-lg active:scale-95 transition-all border-b-4 border-blue-800"
                  >
                    WIN<br />ALPHA
                  </button>
                  <button
                    onClick={() => handleEndMatchAndClose('Empate')}
                    className="py-4 bg-slate-700 text-white rounded-2xl font-heading italic text-[12px] uppercase tracking-wider font-black active:scale-95 transition-all border-2 border-slate-600"
                  >
                    DRAW
                  </button>
                  <button
                    onClick={() => handleEndMatchAndClose('B')}
                    className="py-4 bg-orange-600 text-white rounded-2xl font-heading italic text-[12px] uppercase tracking-wider font-black shadow-lg active:scale-95 transition-all border-b-4 border-orange-800"
                  >
                    WIN<br />BETA
                  </button>
                </div>
              </div>
            )}

            {/* ── PAINEL: ESCALAÇÃO ── */}
            {openPanel === 'lineup' && (
              <div className="grid grid-cols-2 gap-3 p-4 overflow-y-auto">
                {/* Time A */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">EQUIPE ALPHA</span>
                  </div>
                  {(queue?.teamA || []).map((id, i) => (
                    <div key={id} className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl border border-slate-700">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${isGK(id) ? 'bg-orange-600' : 'bg-blue-700'} text-white shrink-0`}>
                        {isGK(id) ? <ShieldCheck size={12} /> : <User size={12} />}
                      </div>
                      <span className="text-[11px] font-black text-white uppercase truncate">{getPlayerName(id)}</span>
                      {isGK(id) && <span className="text-[8px] font-black text-orange-400 bg-orange-900/40 px-1.5 py-0.5 rounded ml-auto shrink-0">GK</span>}
                    </div>
                  ))}
                </div>

                {/* Time B */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-orange-500" />
                    <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest">EQUIPE BETA</span>
                  </div>
                  {(queue?.teamB || []).map((id, i) => (
                    <div key={id} className="flex items-center gap-2 p-2 bg-slate-800 rounded-xl border border-slate-700">
                      <div className={`w-6 h-6 flex items-center justify-center rounded-lg ${isGK(id) ? 'bg-orange-600' : 'bg-orange-700'} text-white shrink-0`}>
                        {isGK(id) ? <ShieldCheck size={12} /> : <User size={12} />}
                      </div>
                      <span className="text-[11px] font-black text-white uppercase truncate">{getPlayerName(id)}</span>
                      {isGK(id) && <span className="text-[8px] font-black text-orange-400 bg-orange-900/40 px-1.5 py-0.5 rounded ml-auto shrink-0">GK</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── PAINEL: HISTÓRICO ── */}
            {openPanel === 'history' && (
              <div className="overflow-y-auto p-4 space-y-3">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : history.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[11px] font-black text-slate-600 uppercase tracking-widest italic">Nenhuma partida registrada ainda</p>
                  </div>
                ) : (
                  history.map((match, idx) => (
                    <div key={match.id || idx} className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
                      {/* Header da partida */}
                      <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                          {/* Placar */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-black uppercase ${match.winner === 'A' ? 'text-blue-400' : 'text-slate-500'}`}>ALPHA</span>
                            <span className="text-lg font-heading italic font-black text-white tabular-nums">{match.scoreA}</span>
                            <span className="text-slate-600 font-black">×</span>
                            <span className="text-lg font-heading italic font-black text-white tabular-nums">{match.scoreB}</span>
                            <span className={`text-[10px] font-black uppercase ${match.winner === 'B' ? 'text-orange-400' : 'text-slate-500'}`}>BETA</span>
                          </div>
                          {/* Badge vencedor */}
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                            match.winner === 'A' ? 'bg-blue-900/60 text-blue-400 border border-blue-800' :
                            match.winner === 'B' ? 'bg-orange-900/60 text-orange-400 border border-orange-800' :
                            'bg-slate-700 text-slate-400 border border-slate-600'
                          }`}>
                            {match.winner === 'A' ? 'ALPHA WIN' : match.winner === 'B' ? 'BETA WIN' : 'DRAW'}
                          </span>
                        </div>
                        {match.createdAt && (
                          <span className="text-[9px] text-slate-600 font-black">
                            {new Date(match.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      {/* Jogadores */}
                      <div className="grid grid-cols-2 gap-0 divide-x divide-slate-700 px-3 py-2">
                        <div className="pr-3 space-y-0.5">
                          {(match.playersA || []).slice(0, 5).map((id, i) => (
                            <p key={i} className="text-[10px] text-slate-400 uppercase truncate font-black">{getPlayerName(id)}</p>
                          ))}
                        </div>
                        <div className="pl-3 space-y-0.5">
                          {(match.playersB || []).slice(0, 5).map((id, i) => (
                            <p key={i} className="text-[10px] text-slate-400 uppercase truncate font-black">{getPlayerName(id)}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
