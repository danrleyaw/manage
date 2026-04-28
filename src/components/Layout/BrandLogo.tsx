import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ size = 110, className = "" }) => (
  <div className={`flex flex-col items-center select-none ${className}`}>
    <div className="relative group">
      <div className="absolute inset-0 bg-blue-500 blur-[80px] opacity-20 transition-opacity group-hover:opacity-30"></div>
      <div className="relative z-10 flex flex-col items-center">
        <span className="font-heading italic font-black text-slate-900 leading-none tracking-[-0.08em]" style={{ fontSize: `${size * 0.7}px` }}>FUT</span>
        <div className="flex items-center gap-2 mt-[-4%]">
          <div className="h-[3px] w-10 bg-blue-600"></div>
          <span className="font-heading italic font-black text-blue-600 uppercase tracking-tighter" style={{ fontSize: `${size * 0.3}px` }}>MANAGER</span>
          <div className="h-[3px] w-10 bg-blue-600"></div>
        </div>
      </div>
    </div>
  </div>
);
