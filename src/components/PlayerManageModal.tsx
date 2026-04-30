import React, { useState } from 'react';
import { X, Shield, User, ArrowLeftRight, Trash2, ShieldCheck } from 'lucide-react';
import { Player } from '../types';

interface PlayerManageModalProps {
  player: Player;
  team: 'A' | 'B';
  allPlayers: Player[]; // todos os jogadores da arena (para substituição)
  onClose: () => void;
  onToggleGK: (p: Player) => void;
  onSubstitute: (outPlayer: Player, inPlayer: Player) => void;
  onRemove: (p: Player) => void;
}

export const PlayerManageModal: React.FC<PlayerManageModalProps> = ({
  player, team, allPlayers, onClose, onToggleGK, onSubstitute, onRemove
}) => {
  const [showSubList, setShowSubList] = useState(false);

  // Jogadores disponíveis para substituição (confirmados mas não nos times ativos)
  const available = allPlayers.filter(p =>
    p.isConfirmed &&
    p.id !== player.id
  );

  const handleToggleGK = () => {
    onToggleGK(player);
    onClose();
  };

  const handleSubstitute = (inPlayer: Player) => {
    onSubstitute(player, inPlayer);
    onClose();
  };

  const handleRemove = () => {
    onRemove(player);
    onClose();
  };

  const teamColor = team === 'A' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400';
  const teamBg = team === 'A' ? 'bg-blue-600' : 'bg-orange-600';

  return (
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border-2 border-slate-100 dark:border-slate-800 animate-in slide-in-from-bottom-6 duration-300 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${teamBg} flex items-center justify-center text-white`}>
              {player.isGoalkeeper ? <ShieldCheck size={18} /> : <User size={18} />}
            </div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${teamColor}`}>
                EQUIPE {team === 'A' ? 'ALPHA' : 'BETA'}
              </p>
              <h3 className="text-base font-heading italic font-black text-slate-900 dark:text-white uppercase tracking-tight">
                {player.name}
              </h3>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Ações */}
        {!showSubList ? (
          <div className="p-5 space-y-3">
            {/* Trocar posição */}
            <button
              onClick={handleToggleGK}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 group-hover:scale-110 transition-transform">
                <Shield size={18} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase">
                  {player.isGoalkeeper ? 'Mudar para Linha' : 'Mudar para Goleiro'}
                </p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  Posição atual: {player.isGoalkeeper ? 'GOLEIRO' : 'LINHA'}
                </p>
              </div>
            </button>

            {/* Substituir */}
            <button
              onClick={() => setShowSubList(true)}
              className="w-full flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <ArrowLeftRight size={18} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black text-slate-900 dark:text-white uppercase">Substituir Jogador</p>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">
                  {available.length} disponível(is)
                </p>
              </div>
            </button>

            {/* Remover */}
            <button
              onClick={handleRemove}
              className="w-full flex items-center gap-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border-2 border-red-100 dark:border-red-900 hover:border-red-400 dark:hover:border-red-600 transition-all active:scale-[0.98] group"
            >
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center text-red-600 dark:text-red-400 group-hover:scale-110 transition-transform">
                <Trash2 size={18} />
              </div>
              <div className="text-left">
                <p className="text-[13px] font-black text-red-700 dark:text-red-400 uppercase">Remover do Time</p>
                <p className="text-[10px] text-red-400 font-black uppercase tracking-wider">Remove da partida atual</p>
              </div>
            </button>
          </div>
        ) : (
          /* Lista de substituição */
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setShowSubList(false)} className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X size={14} />
              </button>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Escolha quem entra no lugar de <span className="text-slate-900 dark:text-white">{player.name}</span>
              </p>
            </div>

            {available.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">
                  Nenhum jogador disponível
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {available.map(p => (
                  <button
                    key={p.id}
                    onClick={() => handleSubstitute(p)}
                    className="w-full flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-600 transition-all active:scale-[0.98]"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white ${p.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'}`}>
                      {p.isGoalkeeper ? <ShieldCheck size={14} /> : <User size={14} />}
                    </div>
                    <span className="font-heading italic text-slate-900 dark:text-white uppercase text-[13px] font-black">{p.name}</span>
                    {p.isGoalkeeper && (
                      <span className="ml-auto text-[9px] font-black text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded-full">GK</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
