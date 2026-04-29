import React, { useState } from 'react';
import { ChevronRight, Shield, ShieldCheck, User } from 'lucide-react';
import { Player } from '../../types';

interface TeamCardProps {
  title: string;
  playerIds: string[];
  color: string;
  allPlayers: Player[];
  isMandante?: boolean;
  /** Modo compacto para landscape */
  compact?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ title, playerIds, color, allPlayers, isMandante, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (compact) {
    return (
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="bg-white dark:bg-slate-900 rounded-xl p-3 border-2 border-slate-200 dark:border-slate-700 cursor-pointer transition-all shadow-sm"
      >
        <div className="flex justify-between items-center">
          <div>
            <p className={`text-[9px] font-black uppercase tracking-[0.3em] italic ${isMandante ? 'text-blue-600' : 'text-orange-600'}`}>
              {isMandante ? 'ALPHA' : 'BETA'}
            </p>
            <h3 className="text-sm font-heading italic text-slate-900 dark:text-white leading-none font-black">{title}</h3>
          </div>
          <div className="flex items-center gap-1.5">
            <Shield size={14} className={isMandante ? 'text-blue-600' : 'text-orange-600'} />
            <ChevronRight size={14} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </div>
        </div>
        {isOpen && (
          <div className="mt-2 space-y-1">
            <div className="h-px w-full bg-slate-100 dark:bg-slate-800 mb-2" />
            {playerIds.map((id, i) => {
              const p = allPlayers.find(x => x.id === id);
              return (
                <div key={`${id}-${i}`} className="flex items-center gap-1.5 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className={`w-5 h-5 flex items-center justify-center rounded ${p?.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'} text-white`}>
                    {p?.isGoalkeeper ? <ShieldCheck size={10} /> : <User size={10} />}
                  </div>
                  <span className="font-black text-slate-800 dark:text-white uppercase text-[10px]">{p?.name || 'Vazio'}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className="bg-white dark:bg-slate-900 rounded-2xl p-5 border-2 border-slate-200 dark:border-slate-700 relative overflow-hidden transition-all duration-300 hover:shadow-xl shadow-md cursor-pointer group"
    >
      <div className="flex justify-between items-center">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 italic ${isMandante ? 'text-blue-700 dark:text-blue-400' : 'text-orange-700 dark:text-orange-400'}`}>
            {isMandante ? 'MANDANTE' : 'DESAFIANTE'}
          </p>
          <h3 className="text-base font-heading italic text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Shield size={18} className={isMandante ? 'text-blue-600' : 'text-orange-600'} />
          <ChevronRight size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90 text-blue-600' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="space-y-1 mt-4 animate-in slide-in-from-top-2 duration-300">
          <div className="h-[1px] w-full bg-slate-200 dark:bg-slate-700 mb-3" />
          {playerIds.length === 0 ? (
            <div className="py-4 text-center text-slate-400 italic text-[10px] uppercase font-black tracking-[0.2em]">Escalando...</div>
          ) : (
            playerIds.map((id, i) => {
              const p = allPlayers.find(x => x.id === id);
              return (
                <div key={`${id}-${i}`} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-md ${p?.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900 dark:bg-slate-600'} text-white shadow-sm`}>
                      {p?.isGoalkeeper ? <ShieldCheck size={12} /> : <User size={12} />}
                    </div>
                    <span className="font-black text-slate-800 dark:text-white uppercase text-[11px] tracking-tight">{p?.name || 'Vazio'}</span>
                  </div>
                  {p?.isGoalkeeper && <span className="text-[9px] font-black text-orange-700 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 px-2 py-0.5 rounded border border-orange-200 dark:border-orange-800">GK</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
