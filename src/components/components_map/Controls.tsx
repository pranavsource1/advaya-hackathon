import React from 'react';

interface ControlsProps {
  onSetSafeZone: () => void;
  radius: number;
  onRadiusChange: (radius: number) => void;
  isTracking: boolean;
  onToggleTracking: () => void;
  canSetSafeZone: boolean;
}

export default function Controls({
  onSetSafeZone,
  radius,
  onRadiusChange,
  isTracking,
  onToggleTracking,
  canSetSafeZone,
}: ControlsProps) {
  return (
    <div className="absolute bottom-28 left-0 right-0 px-5 z-40 max-w-sm mx-auto">
      <div className="bg-white/90 backdrop-blur-3xl rounded-[2rem] p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-white/40">
        
        {/* Set Safe Zone Button */}
        <button
          onClick={onSetSafeZone}
          disabled={!canSetSafeZone}
          className={`w-full py-4 rounded-[1.25rem] font-bold text-[15px] mb-5 transition-all duration-300 active:scale-[0.98] ${
            canSetSafeZone
              ? "bg-gray-900 text-white shadow-[0_8px_20px_rgba(0,0,0,0.2)]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {canSetSafeZone ? 'Set Safe Zone Here' : 'Tap Map to Set Zone'}       
        </button>

        {/* Radius Slider */}
        <div className="mb-5 bg-gray-50/50 p-4 rounded-[1.25rem] border-none">
          <div className="flex justify-between items-center mb-3">
            <label className="text-gray-900 font-bold tracking-tight text-sm">Radius</label>
            <span className="text-gray-900 font-bold bg-white px-3 py-1 rounded-full text-xs shadow-sm border border-gray-100">
              {radius}m
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={radius}
            onChange={(e) => onRadiusChange(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-full appearance-none cursor-pointer accent-gray-900 transition-colors"
          />
        </div>

        {/* Tracking Toggle */}
        <div className="flex justify-center">
          <button
            onClick={onToggleTracking}
            className={`w-full py-3.5 rounded-[1.25rem] text-sm font-bold tracking-tight transition-all duration-300 flex items-center justify-center gap-2.5 ${
              isTracking
                ? "bg-red-50 text-red-500 hover:bg-red-100"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${isTracking ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" : "bg-gray-400"}`} />
            {isTracking ? 'Stop Tracking' : 'Start Live Tracking'}
          </button>
        </div>

      </div>
    </div>
  );
}
