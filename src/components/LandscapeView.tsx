import React from 'react';
import { Game, Player, QueueState } from '../types';
import { MatchTimer } from './MatchTimer';
import { TeamCard } from './Teams/TeamCard';

interface LandscapeViewProps {
  game: Game;
  queue: QueueState | null;
  players: Player[];
  isAdmin: boolean;
  onUpdate: (updates: Partial<Game>) => void;
  onScore: (team: 'A' | 'B', delta: number) => void;
  onEndMatch: (winner: 'A' | 'B' | 'Empate') => void;
}

/**
 * Layout otimizado para celular em modo paisagem (landscape).
 * Divide a tela em duas colunas:
 * - Esquerda: cronômetro + times
 * - Direita: placar + botões de resultado
 */
export const LandscapeView: React.FC<LandscapeViewProps> = ({
  game, queue, players, isAdmin, onUpdate, onScore, onEndMatch
}) => {
  return (
    <div className="flex h-full gap-3 p-3">

      {/* ── COLUNA ESQUERDA: Timer + Times ── */}
      <div className="flex flex-col gap-2 flex-1 min-w-0">
        <MatchTimer game={game} isAdmin={isAdmin} onUpdate={onUpdate} compact />

        <div className="grid grid-cols-2 gap-2 flex-1">
          <TeamCard
            title="ALPHA"
            playerIds={queue?.teamA || []}
            color="border-blue-600"
            allPlayers={players}
            isMandante
            compact
          />
          <TeamCard
            title="BETA"
            playerIds={queue?.teamB || []}
            color="border-orange-600"
            allPlayers={players}
            compact
          />
        </div>
      </div>

      {/* ── COLUNA DIREITA: Placar + Resultado ── */}
      <div className="flex flex-col gap-2 w-[160px] shrink-0">
        {/* Placar */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-100 dark:border-slate-800 shadow-lg flex-1 flex items-center justify-center gap-3 px-3">
          {/* Time A */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest">ALPHA</span>
            <span className="text-4xl font-heading italic font-black text-slate-900 dark:text-white tabular-nums">{game.scoreA}</span>
            {isAdmin && (
              <div className="flex gap-1">
                <button onClick={() => onScore('A', -1)} className="w-7 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-white font-black text-sm border border-slate-200 dark:border-slate-700 active:scale-90">-</button>
                <button onClick={() => onScore('A', 1)} className="w-8 h-6 bg-blue-600 rounded-lg text-white font-black text-sm active:scale-90 shadow-md">+</button>
              </div>
            )}
          </div>

          <span className="text-xl font-heading italic text-slate-300 dark:text-slate-600 font-black">X</span>

          {/* Time B */}
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">BETA</span>
            <span className="text-4xl font-heading italic font-black text-slate-900 dark:text-white tabular-nums">{game.scoreB}</span>
            {isAdmin && (
              <div className="flex gap-1">
                <button onClick={() => onScore('B', -1)} className="w-7 h-6 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-white font-black text-sm border border-slate-200 dark:border-slate-700 active:scale-90">-</button>
                <button onClick={() => onScore('B', 1)} className="w-8 h-6 bg-orange-600 rounded-lg text-white font-black text-sm active:scale-90 shadow-md">+</button>
              </div>
            )}
          </div>
        </div>

        {/* Botões de resultado */}
        {isAdmin && (
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => onEndMatch('A')}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-heading italic text-[11px] uppercase tracking-wider font-black shadow-lg active:scale-95 transition-all border-b-4 border-blue-800"
            >
              WIN ALPHA
            </button>
            <button
              onClick={() => onEndMatch('Empate')}
              className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-white rounded-xl font-heading italic text-[11px] uppercase tracking-wider font-black active:scale-95 transition-all border-2 border-slate-300 dark:border-slate-600"
            >
              DRAW
            </button>
            <button
              onClick={() => onEndMatch('B')}
              className="w-full py-3 bg-orange-600 text-white rounded-xl font-heading italic text-[11px] uppercase tracking-wider font-black shadow-lg active:scale-95 transition-all border-b-4 border-orange-800"
            >
              WIN BETA
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
