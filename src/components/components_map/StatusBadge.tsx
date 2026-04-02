import React from 'react';
import { GeofenceStatus } from '../types';

interface StatusBadgeProps {
  status: GeofenceStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  if (status === 'unknown') return null;

  const isInside = status === 'inside';

  return (
    <div className={`absolute top-6 left-6 z-50 transition-all duration-300 transform ${isInside ? 'scale-100' : 'scale-[1.02]'}`}>
      <div 
        className={`px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-xl font-bold text-xs tracking-tight flex items-center gap-2.5 border
          ${isInside 
            ? 'bg-white/90 text-gray-900 border-white/20' 
            : 'bg-black/90 text-white border-black/20 shadow-[0_8px_40px_rgba(239,68,68,0.3)] animate-pulse'
          }
        `}
      >
        {isInside ? (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]" />
            Protected Zone
          </>
        ) : (
          <>
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse" />
            Area Unsecured
          </>
        )}
      </div>
    </div>
  );
}
