import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Game } from '../types';

interface MatchTimerProps {
  game: Game;
  isAdmin: boolean;
  onUpdate: (updates: Partial<Game>) => void;
  /** Modo compacto para landscape — exibe timer + controles lado a lado */
  compact?: boolean;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({ game, isAdmin, onUpdate, compact = false }) => {
  const { timerState, settings } = game;

  const calcTimeLeft = (): number => {
    if (!timerState.isRunning || !timerState.startTime) {
      return timerState.remainingSeconds;
    }
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
        if (isAdmin) {
          onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: 0 } });
        }
      }
    }, 500);
    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.startTime, timerState.remainingSeconds, isAdmin]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleToggle = () => {
    if (timerState.isRunning) {
      onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: timeLeft } });
    } else {
      onUpdate({ timerState: { isRunning: true, startTime: Date.now(), remainingSeconds: timeLeft } });
    }
  };

  const handleReset = () => {
    onUpdate({ timerState: { isRunning: false, startTime: null, remainingSeconds: settings.matchTime * 60 } });
  };

  const totalSeconds = settings.matchTime * 60;
  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  const isRunning = timerState.isRunning;
  const isLow = timeLeft <= 30 && isRunning;

  // ── Modo compacto (landscape) ─────────────────────────
  if (compact) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-lg relative overflow-hidden flex items-center gap-4 px-5 py-3">
        {/* Barra de progresso */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-slate-100 dark:bg-slate-800">
          <div className="h-full bg-blue-600 transition-all duration-500 shadow-[0_0_10px_#2563eb]" style={{ width: `${progress}%` }} />
        </div>

        {/* Tempo */}
        <div className={`text-4xl font-heading italic tabular-nums tracking-tighter font-black transition-all ${
          isLow ? 'text-red-500' : isRunning ? 'text-slate-900 dark:text-white scale-105' : 'text-slate-400 dark:text-slate-600'
        }`}>
          {formatTime(timeLeft)}
        </div>

        {/* Controles */}
        {isAdmin && (
          <div className="flex gap-2 ml-auto">
            <button
              onClick={handleToggle}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-heading italic uppercase text-[12px] font-black tracking-wider transition-all active:scale-95 border-b-4 shadow-md ${
                isRunning
                  ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white border-slate-400 dark:border-slate-600'
                  : 'bg-slate-900 dark:bg-blue-600 text-white border-slate-950 dark:border-blue-800'
              }`}
            >
              {isRunning ? <Pause size={16} strokeWidth={3} /> : <Play size={16} strokeWidth={3} />}
              {isRunning ? 'PAUSAR' : 'INICIAR'}
            </button>
            <button
              onClick={handleReset}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95"
            >
              <RotateCcw size={18} strokeWidth={3} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Modo normal (portrait) ────────────────────────────
  return (
    <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-xl border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center gap-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-[6px] bg-slate-100 dark:bg-slate-800">
        <div className="h-full bg-blue-600 transition-all duration-500 ease-linear shadow-[0_0_15px_#2563eb]" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex items-center gap-3 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-5 py-1.5 rounded-full border border-blue-100 dark:border-blue-800">
        <Timer size={20} strokeWidth={3} />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">TEMPO DE COMBATE</span>
      </div>

      <div className={`text-7xl font-heading italic tabular-nums tracking-tighter leading-none transition-all duration-300 font-black ${
        isRunning ? 'scale-110' : 'scale-100 opacity-40'
      } ${isLow ? 'text-red-500' : 'text-slate-900 dark:text-white'}`}>
        {formatTime(timeLeft)}
      </div>

      {isAdmin && (
        <div className="flex gap-4 mt-4 w-full max-w-[260px]">
          <button
            onClick={handleToggle}
            className={`flex-[3] flex items-center justify-center gap-3 py-5 rounded-2xl font-heading italic uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 text-[14px] font-black border-b-4 ${
              isRunning
                ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-white border-slate-400 dark:border-slate-600'
                : 'bg-slate-900 dark:bg-blue-600 text-white border-slate-950 dark:border-blue-800'
            }`}
          >
            {isRunning ? <Pause size={24} strokeWidth={3} /> : <Play size={24} strokeWidth={3} />}
            <span>{isRunning ? 'PAUSAR' : 'INICIAR'}</span>
          </button>
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center p-4 bg-slate-100 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all active:scale-95 shadow-md"
          >
            <RotateCcw size={24} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
};
