
import React, { useState, useEffect, useRef } from 'react';
import { Timer, Play, Pause, RotateCcw } from 'lucide-react';
import { Game } from '../types';

interface MatchTimerProps {
  game: Game;
  isAdmin: boolean;
  onUpdate: (updates: Partial<Game>) => void;
}

export const MatchTimer: React.FC<MatchTimerProps> = ({ game, isAdmin, onUpdate }) => {
  const [timeLeft, setTimeLeft] = useState(game.timerState.remainingSeconds);
  const isRunning = game.timerState.isRunning;
  
  // Sincroniza timeLeft quando o estado global mudar drasticamente ou o jogo for resetado
  useEffect(() => {
    setTimeLeft(game.timerState.remainingSeconds);
  }, [game.timerState.remainingSeconds]);

  useEffect(() => {
    let interval: any;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            if (isAdmin) {
              onUpdate({ 
                timerState: { ...game.timerState, isRunning: false, remainingSeconds: 0 } 
              });
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, isAdmin]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleToggle = () => {
    const nextRunning = !isRunning;
    onUpdate({ 
      timerState: { 
        ...game.timerState, 
        isRunning: nextRunning, 
        remainingSeconds: timeLeft 
      } 
    });
  };

  const handleReset = () => {
    const resetSeconds = game.settings.matchTime * 60;
    onUpdate({ 
      timerState: { 
        isRunning: false, 
        startTime: null, 
        remainingSeconds: resetSeconds 
      } 
    });
  };

  const totalSeconds = game.settings.matchTime * 60;
  const progress = (timeLeft / totalSeconds) * 100;

  return (
    <div className="bg-white rounded-[2rem] p-8 shadow-xl border-2 border-slate-100 flex flex-col items-center gap-6 relative overflow-hidden group">
      <div className="absolute top-0 left-0 w-full h-[6px] bg-slate-100">
        <div 
          className="h-full bg-blue-600 transition-all duration-1000 ease-linear shadow-[0_0_15px_#2563eb]"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="flex items-center gap-3 text-blue-700 bg-blue-50 px-5 py-1.5 rounded-full border border-blue-100">
        <Timer size={20} strokeWidth={3} />
        <span className="text-[11px] font-black uppercase tracking-[0.4em] italic">TEMPO DE COMBATE</span>
      </div>
      
      <div className={`text-7xl font-heading italic text-slate-900 tabular-nums tracking-tighter leading-none transition-all duration-700 font-black ${isRunning ? 'scale-110' : 'scale-100 opacity-40'}`}>
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
