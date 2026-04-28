import React, { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Game } from '../types';

interface MatchTimerProps {
  game: Game;
  isAdmin: boolean;
  onUpdate: (updates: Partial<Game>) => void;
}

/**
 * MatchTimer — cronômetro sincronizado entre clientes.
 *
 * Estratégia:
 * - Quando rodando: calcula o tempo restante a partir de `startTime` (timestamp
 *   salvo no Supabase) + `remainingSeconds` no momento em que foi iniciado.
 *   Isso garante que todos os clientes vejam o mesmo valor, independente de
 *   quando abriram a página.
 * - Quando pausado: exibe `remainingSeconds` diretamente.
 */
export const MatchTimer: React.FC<MatchTimerProps> = ({ game, isAdmin, onUpdate }) => {
  const { timerState, settings } = game;

  const calcTimeLeft = (): number => {
    if (!timerState.isRunning || !timerState.startTime) {
      return timerState.remainingSeconds;
    }
    const elapsed = Math.floor((Date.now() - timerState.startTime) / 1000);
    return Math.max(0, timerState.remainingSeconds - elapsed);
  };

  const [timeLeft, setTimeLeft] = useState<number>(calcTimeLeft);

  // Recalcula quando o estado global mudar (ex: outro cliente pausou/resetou)
  useEffect(() => {
    setTimeLeft(calcTimeLeft());
  }, [timerState.isRunning, timerState.startTime, timerState.remainingSeconds]);

  // Tick local — apenas para atualizar o display a cada segundo
  useEffect(() => {
    if (!timerState.isRunning) return;

    const interval = setInterval(() => {
      const remaining = calcTimeLeft();
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        if (isAdmin) {
          onUpdate({
            timerState: {
              isRunning: false,
              startTime: null,
              remainingSeconds: 0,
            },
          });
        }
      }
    }, 500); // 500ms para maior precisão visual

    return () => clearInterval(interval);
  }, [timerState.isRunning, timerState.startTime, timerState.remainingSeconds, isAdmin]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    if (timerState.isRunning) {
      // Pausar: salva o tempo restante atual
      onUpdate({
        timerState: {
          isRunning: false,
          startTime: null,
          remainingSeconds: timeLeft,
        },
      });
    } else {
      // Iniciar: salva o timestamp atual como referência
      onUpdate({
        timerState: {
          isRunning: true,
          startTime: Date.now(),
          remainingSeconds: timeLeft,
        },
      });
    }
  };

  const handleReset = () => {
    const resetSeconds = settings.matchTime * 60;
    onUpdate({
      timerState: {
        isRunning: false,
        startTime: null,
        remainingSeconds: resetSeconds,
      },
    });
  };

  const totalSeconds = settings.matchTime * 60;
  const progress = totalSeconds > 0 ? (timeLeft / totalSeconds) * 100 : 0;
  const isRunning = timerState.isRunning;

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-slate-100 flex flex-col items-center gap-6 relative overflow-hidden group">
      {/* Barra de progresso */}
      <div className="absolute top-0 left-0 w-full h-[6px] bg-slate-100">
        <div
          className="h-full bg-blue-600 transition-all duration-500 ease-linear shadow-[0_0_15px_#2563eb]"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-blue-700 bg-blue-50 px-5 py-1.5 rounded-full border border-blue-100">
        <Timer size={20} strokeWidth={3} />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">TEMPO DE COMBATE</span>
      </div>

      <div
        className={`text-7xl font-heading italic text-slate-900 tabular-nums tracking-tighter leading-none transition-all duration-300 font-black ${
          isRunning ? 'scale-110' : 'scale-100 opacity-40'
        } ${timeLeft <= 30 && isRunning ? 'text-red-600' : ''}`}
      >
        {formatTime(timeLeft)}
      </div>

      {isAdmin && (
        <div className="flex gap-4 mt-4 w-full max-w-[260px] relative z-10">
          <button
            onClick={handleToggle}
            className={`flex-[3] flex items-center justify-center gap-3 py-5 rounded-2xl font-heading italic uppercase tracking-[0.2em] shadow-xl transition-all active:scale-95 text-[14px] font-black border-b-4 ${
              isRunning
                ? 'bg-slate-200 text-slate-700 border-slate-400'
                : 'bg-slate-900 text-white border-slate-950'
            }`}
          >
            {isRunning ? <Pause size={24} strokeWidth={3} /> : <Play size={24} strokeWidth={3} />}
            <span>{isRunning ? 'PAUSAR' : 'INICIAR'}</span>
          </button>
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center p-4 bg-slate-100 border-2 border-slate-200 rounded-2xl text-slate-600 hover:text-slate-900 transition-all active:scale-95 shadow-md"
          >
            <RotateCcw size={24} strokeWidth={3} />
          </button>
        </div>
      )}
    </div>
  );
};
