'use client';

import React, { useState, useEffect } from 'react';
import { CommunityEvent, GeoPosition } from '../lib/types';
import { useCommunity } from '../hooks/useCommunity';
import EventCard from './EventCard';
import { geocodeLocation, getNearbyLandmarks, Landmark } from '../utils/geocode';

/**
 * CommunitySummary — Premium exportable summary component.
 * Ported from the Community Overlay logic with tabbed Activity / Host Event.
 * Fully persistent via local storage or HF Space API if integrated.
 */
export default function CommunitySummary({ userPosition }: { userPosition?: GeoPosition | null }) {
  const { events, addEvent, joinEvent, toggleInterested, removeEvent, isLoaded } = useCommunity();
  const [activeTab, setActiveTab] = useState<'activity' | 'host'>('activity');

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<GeoPosition | null>(null);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  // Landmark state
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isLoadingLandmarks, setIsLoadingLandmarks] = useState(false);

  // Fetch landmarks when entering host tab if we have user position
  useEffect(() => {
    if (activeTab === 'host' && userPosition && landmarks.length === 0) {
      setIsLoadingLandmarks(true);
      getNearbyLandmarks(userPosition.lat, userPosition.lng, 10).then((places) => {
        setLandmarks(places || []);
        setIsLoadingLandmarks(false);
      });
    }
  }, [activeTab, userPosition, landmarks.length]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !time || !description) return;

    setIsGeocoding(true);
    setGeocodeError('');

    let coords: GeoPosition | null = selectedCoords;
    if (!coords) coords = await geocodeLocation(location);

    if (!coords && !userPosition) {
      setGeocodeError('Location not found. Please try a different name.');
      setIsGeocoding(false);
      return;
    }

    const formattedTime = time ? new Date(time).toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    }) : time;

    addEvent({
      title,
      location,
      time: formattedTime !== 'Invalid Date' ? formattedTime : time,
      description,
      coordinates: coords ?? (userPosition || { lat: 12.9716, lng: 77.5946 }),
    });

    // Reset Form
    setTitle(''); setLocation(''); setTime(''); setDescription('');
    setSelectedCoords(null); setGeocodeError(''); setIsGeocoding(false);
    setActiveTab('activity');
  };

  return (
    <div className="bg-white rounded-[2.5rem] shadow-sm border border-surface-container overflow-hidden flex flex-col min-h-[500px] animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="p-6 pb-4 bg-surface-container-lowest border-b border-surface-container flex items-center justify-between">
        <div className="flex flex-col">
          <h2 className="text-2xl font-black font-headline text-on-surface tracking-tighter leading-none">Community.</h2>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest mt-1">Global Activity Sync</span>
        </div>
        <div className="bg-surface-container p-1 rounded-2xl flex gap-1">
          <button 
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'activity' ? 'bg-white text-on-surface shadow-sm' : 'text-outline'}`}
          >
            Activity
          </button>
          <button 
            onClick={() => setActiveTab('host')}
            className={`px-4 py-2 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all ${activeTab === 'host' ? 'bg-white text-on-surface shadow-sm' : 'text-outline'}`}
          >
            Host
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 bg-surface-container-lowest/30">
        {activeTab === 'activity' ? (
          <div className="flex flex-col gap-4">
            {!isLoaded ? (
              <div className="flex justify-center p-8">
                <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : events.length === 0 ? (
              <p className="text-center text-outline mt-10 font-bold">No community activity yet.</p>
            ) : (
              events.map((ev) => (
                <EventCard
                  key={ev.id}
                  event={ev}
                  onJoin={joinEvent}
                  onSelect={() => {}} // Summary view only
                  onRemove={ev.joined ? removeEvent : undefined}
                  onToggleInterested={toggleInterested}
                />
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleCreate} className="flex flex-col gap-4 pb-8">
            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">What's happening?</label>
               <input 
                required value={title} onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Free Eye Checkup"
                className="w-full px-4 py-3.5 bg-white border border-surface-container rounded-2xl text-sm font-bold text-on-surface placeholder:font-medium focus:ring-2 focus:ring-primary outline-none"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">Where?</label>
               <input 
                required value={location} onChange={e => setLocation(e.target.value)}
                placeholder="e.g. Ward 4 Center"
                className="w-full px-4 py-3.5 bg-white border border-surface-container rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary outline-none"
               />
               
               {/* Landmark Suggestions */}
               <div className="mt-1">
                <select 
                  disabled={isLoadingLandmarks || !userPosition}
                  onChange={e => {
                    const lm = landmarks.find(l => l.name === e.target.value);
                    if (lm) { setLocation(lm.name); setSelectedCoords({lat: lm.lat, lng: lm.lng}); }
                  }}
                  className="w-full px-4 py-2.5 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest border-none rounded-xl disabled:opacity-50 appearance-none cursor-pointer outline-none"
                  value=""
                >
                  <option value="" disabled>{isLoadingLandmarks ? '⏳ Finding Landmarks...' : '🎯 Suggest Nearby Landmark'}</option>
                  {landmarks.map((l, i) => <option key={i} value={l.name}>{l.name}</option>)}
                </select>
               </div>

               {geocodeError && <p className="text-[10px] text-error font-bold px-1 mt-1">⚠️ {geocodeError}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">When?</label>
               <input 
                required type="datetime-local" value={time} onChange={e => setTime(e.target.value)}
                className="w-full px-4 py-3.5 bg-white border border-surface-container rounded-2xl text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary outline-none"
               />
            </div>

            <div className="flex flex-col gap-1.5">
               <label className="text-[10px] font-bold text-outline uppercase tracking-widest pl-1">Details</label>
               <textarea 
                required value={description} onChange={e => setDescription(e.target.value)}
                placeholder="Describe the activity..." rows={3}
                className="w-full px-4 py-3.5 bg-white border border-surface-container rounded-2xl text-sm font-medium text-on-surface resize-none focus:ring-2 focus:ring-primary outline-none"
               />
            </div>

            <button 
              type="submit" disabled={isGeocoding}
              className="w-full py-4 mt-2 bg-primary text-white font-bold rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
            >
              {isGeocoding ? 'FINDING LOCATION...' : 'PUBLISH EVENT'}
            </button>
          </form>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-6 py-3 bg-surface-container border-t border-surface-container flex justify-center">
        <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live on HF Spaces Storage
        </p>
      </div>
    </div>
  );
}
