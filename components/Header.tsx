
import React from 'react';
import { Trophy } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="bg-blue-600 p-4 shadow-md sticky top-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="text-white" size={24} />
          <h1 className="text-xl font-black text-white tracking-tighter uppercase">FUT MANAGER</h1>
        </div>
        <div className="text-[10px] bg-white/20 px-2 py-1 rounded text-white font-black uppercase tracking-widest">
          PRO EDITION
        </div>
      </div>
    </header>
  );
};
