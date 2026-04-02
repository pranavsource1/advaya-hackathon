'use client';

import React from 'react';
import { CommunityEvent } from '../types';
import { useCommunity } from '../hooks/useCommunity';

/**
 * CommunitySummary — exportable summary card for the Community page.
 * Uses the same useCommunity hook (localStorage-backed) as the full overlay,
 * so joining/interested counts stay in sync. No props needed.
 */
export default function CommunitySummary() {
  const { events, joinEvent, toggleInterested, isLoaded } = useCommunity();

  const joinedCount = events.filter((e) => e.joined).length;
  const upcomingEvents = events.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-50 flex items-center justify-center">
            <svg
              className="w-4 h-4 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <h2 className="text-base font-bold text-gray-800">Community</h2>
        </div>
        <a
          href="/map"
          className="text-xs font-bold text-purple-600 hover:text-purple-700 transition-colors"
        >
          View All →
        </a>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-px bg-gray-100 border-t border-b border-gray-100">
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-0.5">
            Total Events
          </p>
          <p className="text-2xl font-black text-gray-800">{events.length}</p>
        </div>
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-0.5">
            Joined
          </p>
          <p className="text-2xl font-black text-gray-800">{joinedCount}</p>
        </div>
      </div>

      {/* Upcoming events list */}
      <div className="px-5 pt-3 pb-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Upcoming
        </p>

        {!isLoaded ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : upcomingEvents.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            No events yet — create one on the map!
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {upcomingEvents.map((event: CommunityEvent) => (
              <div
                key={event.id}
                className="flex items-start justify-between gap-3"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-gray-800 truncate leading-none">
                    {event.title}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {event.location}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {event.time}
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  {/* Join / Joined button */}
                  <button
                    onClick={() => joinEvent(event.id)}
                    disabled={event.joined}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                      event.joined
                        ? 'bg-green-50 text-green-600 cursor-default'
                        : 'bg-purple-600 text-white hover:bg-purple-700 active:scale-95'
                    }`}
                  >
                    {event.joined ? '✓ Joined' : 'Join'}
                  </button>

                  {/* Interested toggle */}
                  <button
                    onClick={() => toggleInterested(event.id)}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                      event.isInterested
                        ? 'border-amber-300 bg-amber-50 text-amber-600'
                        : 'border-gray-200 text-gray-400 hover:border-amber-300 hover:text-amber-500'
                    }`}
                  >
                    ★ {event.interestedCount ?? 0}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
