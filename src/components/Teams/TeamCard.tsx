import React, { useState } from 'react';
import { ChevronRight, Shield, ShieldCheck, User } from 'lucide-react';
import { Player } from '../../types';

interface TeamCardProps {
  title: string;
  playerIds: string[];
  color: string;
  allPlayers: Player[];
  isMandante?: boolean;
}

export const TeamCard: React.FC<TeamCardProps> = ({ title, playerIds, color, allPlayers, isMandante }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      onClick={() => setIsOpen(!isOpen)}
      className={`bg-white rounded-2xl p-5 border-2 border-slate-200 relative overflow-hidden transition-all duration-500 hover:shadow-xl shadow-md cursor-pointer group`}
    >
      <div className="flex justify-between items-center">
        <div>
          <p className={`text-[10px] font-black uppercase tracking-[0.3em] mb-1 italic ${isMandante ? 'text-blue-700' : 'text-orange-700'}`}>
            {isMandante ? 'MANDANTE' : 'DESAFIANTE'}
          </p>
          <h3 className="text-base font-heading italic text-slate-900 leading-none tracking-tight transition-colors group-hover:text-blue-600">{title}</h3>
        </div>
        <div className="flex items-center gap-3">
          <Shield size={18} className={isMandante ? 'text-blue-600' : 'text-orange-600'} />
          <ChevronRight size={18} className={`text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-90 text-blue-600' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="space-y-1 mt-4 animate-in slide-in-from-top-2 duration-300">
          <div className="h-[1px] w-full bg-slate-200 mb-3"></div>
          {playerIds.length === 0 ? (
            <div className="py-4 text-center text-slate-400 italic text-[10px] uppercase font-black tracking-[0.2em]">Escalando...</div>
          ) : (
            playerIds.map((id, i) => {
              const p = allPlayers.find(x => x.id === id);
              return (
                <div key={`${id}-${i}`} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className={`w-6 h-6 flex items-center justify-center rounded-md ${p?.isGoalkeeper ? 'bg-orange-600' : 'bg-slate-900'} text-white shadow-sm`}>
                      {p?.isGoalkeeper ? <ShieldCheck size={12} /> : <User size={12} />}
                    </div>
                    <span className="font-black text-slate-800 uppercase text-[11px] tracking-tight">{p?.name || 'Vazio'}</span>
                  </div>
                  {p?.isGoalkeeper && <span className="text-[9px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded border border-orange-200">GK</span>}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
