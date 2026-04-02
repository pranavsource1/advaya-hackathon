import React from 'react';
import { CommunityEvent } from '../types';

interface EventCardProps {
  event: CommunityEvent;
  onJoin: (id: string) => void;
  /** Called when "View on Map" is tapped — closes overlay and flies map to event */
  onSelect?: (event: CommunityEvent) => void;
  /** Called to permanently remove this event */
  onRemove?: (id: string) => void;
  /** Called to toggle interested statys */
  onToggleInterested?: (id: string) => void;
}

/** Opens Google Maps navigation to the event's coordinates in a new tab */
function openNavigation(event: CommunityEvent) {
  if (!event.coordinates) return;
  const url = `https://www.google.com/maps/dir/?api=1&destination=${event.coordinates.lat},${event.coordinates.lng}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function EventCard({ event, onJoin, onSelect, onRemove, onToggleInterested }: EventCardProps) {
  const hasCoords = !!event.coordinates;

  return (
    <div className="bg-white rounded-[1.5rem] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-3 group hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.1)] transition-all duration-300 mb-4 border-none">
      {/* Title row with discard button */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 overflow-hidden">
          <h3 className="text-[1.125rem] font-bold text-gray-900 tracking-tight truncate leading-tight mt-1">{event.title}</h3>
          
          <div className="flex flex-col gap-2 mt-3">
            <div className="flex items-center text-xs font-bold text-gray-400 gap-2 w-full">
              <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="truncate">{event.location}</span>
            </div>

            <div className="flex items-center text-xs font-bold text-gray-400 gap-2">
              <svg className="w-4 h-4 shrink-0 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="truncate">{event.time}</span>
            </div>
          </div>
        </div>

        {onRemove && (
          <button
            onClick={() => onRemove(event.id)}
            title="Discard event"
            className="w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all shrink-0 opacity-0 group-hover:opacity-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      <p className="text-gray-600 mt-2 text-sm font-medium leading-relaxed bg-gray-50 p-3 rounded-[1rem] border-none">{event.description}</p>

      {/* Primary action: Join & Interested */}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onJoin(event.id)}
          disabled={event.joined}
          className={`py-3.5 px-4 rounded-[1rem] font-bold text-sm tracking-tight transition-all duration-300 flex-1 border-none outline-none
            ${event.joined
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white shadow-[0_8px_20px_-8px_rgba(0,0,0,0.3)] hover:bg-gray-800 active:scale-[0.98]'
            }
          `}
        >
          {event.joined ? '✓ Joined' : 'Join Event'}
        </button>

        {onToggleInterested && (
          <button
            onClick={() => onToggleInterested(event.id)}
            className={`py-3.5 px-4 rounded-[1rem] font-bold text-sm transition-all duration-300 flex items-center justify-center gap-2 border-[1.5px] border-solid flex-[0.4] outline-none
              ${event.isInterested
                ? 'bg-red-50 border-red-50 text-red-500 shadow-sm'
                : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'
              }
            `}
          >
            <svg 
              className={`w-4 h-4 ${event.isInterested ? 'fill-current' : 'fill-none'}`} 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{event.interestedCount || 0}</span>
          </button>
        )}
      </div>

      {/* Secondary actions row — only shown when coordinates are available */}
      {hasCoords && (
        <div className="flex gap-2 mt-1">
          {/* View on Map: closes overlay, flies map to event */}
          {onSelect && (
            <button
              onClick={() => onSelect(event)}
              className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Locate
            </button>
          )}

          {/* Navigate: opens Google Maps directions */}
          <button
            onClick={() => openNavigation(event)}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold text-gray-900 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Navigate
          </button>
        </div>
      )}
    </div>
  );
}
