'use client';

import React from 'react';
import { MapPin, Calendar, Trash2 } from 'lucide-react';
import { CommunityEvent } from '../lib/types';

interface EventCardProps {
  event: CommunityEvent;
  onJoin: (id: string) => void;
  onSelect?: () => void;
  onRemove?: (id: string) => void;
  onToggleInterested: (id: string) => void;
}

export default function EventCard({
  event,
  onJoin,
  onSelect,
  onRemove,
  onToggleInterested,
}: EventCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`bg-white rounded-[2rem] p-6 shadow-sm border border-surface-container relative overflow-hidden group hover:shadow-md transition-all ${
        onSelect ? 'cursor-pointer active:scale-[0.98]' : ''
      }`}
    >
      <div className="relative z-10 flex flex-col sm:flex-row gap-5">
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-orange-600 text-lg">
                event
              </span>
              <h3 className="text-xl font-headline font-bold text-on-surface">
                {event.title}
              </h3>
            </div>
            {onRemove && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(event.id);
                }}
                className="p-2 text-outline hover:text-error transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
          <p className="text-on-surface-variant text-sm mb-4 leading-relaxed line-clamp-2">
            {event.description}
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold text-outline">
              <MapPin className="w-3.5 h-3.5" /> {event.location}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold text-outline">
              <Calendar className="w-3.5 h-3.5" /> {event.time}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between items-end sm:w-32">
          <div className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-sm mb-4">
            ★ {event.interestedCount || 0} Interested
          </div>

          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJoin(event.id);
              }}
              disabled={event.joined}
              className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm ${
                event.joined
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-orange-600 text-white active:scale-95'
              }`}
            >
              {event.joined ? 'Joined' : 'Join Event'}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleInterested(event.id);
              }}
              className={`w-full py-2 rounded-xl font-bold text-[9px] uppercase tracking-widest border transition-all ${
                event.isInterested
                  ? 'bg-orange-50 border-orange-200 text-orange-600'
                  : 'border-outline-variant text-outline hover:border-orange-500 hover:text-orange-600'
              }`}
            >
              {event.isInterested ? 'Interested ✓' : 'Interested'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
