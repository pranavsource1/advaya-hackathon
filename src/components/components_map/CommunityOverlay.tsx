import React, { useState, useEffect } from 'react';
import { CommunityEvent, GeoPosition } from '@/lib/types';
import EventCard from '@/components/components_map/EventCard';
import { geocodeLocation, getNearbyLandmarks, Landmark } from '@/utils/geocode';

interface CommunityOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  userPosition: GeoPosition | null;
  events: CommunityEvent[];
  addEvent: (eventData: Omit<CommunityEvent, 'id' | 'joined'>) => void;
  joinEvent: (id: string) => void;
  toggleInterested: (id: string) => void;
  isLoaded: boolean;
  /** Called with the event the user wants to see on the map */
  onSelectEvent: (event: CommunityEvent) => void;
  /** Remove an event from the list */
  removeEvent: (id: string) => void;
}

export default function CommunityOverlay({
  isOpen,
  onClose,
  userPosition,
  events,
  addEvent,
  joinEvent,
  toggleInterested,
  isLoaded,
  onSelectEvent,
  removeEvent,
}: CommunityOverlayProps) {
  const [activeTab, setActiveTab] = useState<'events' | 'create'>('events');

  // Form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [time, setTime] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<GeoPosition | null>(null);

  // Landmark state
  const [landmarks, setLandmarks] = useState<Landmark[]>([]);
  const [isLoadingLandmarks, setIsLoadingLandmarks] = useState(false);

  // Fetch landmarks when entering create tab if we have user position
  useEffect(() => {
    if (activeTab === 'create' && userPosition && landmarks.length === 0) {
      setTimeout(() => setIsLoadingLandmarks(true), 0);
      getNearbyLandmarks(userPosition.lat, userPosition.lng, 10).then((places) => {
        setLandmarks(places);
        setTimeout(() => setIsLoadingLandmarks(false), 0);
      });
    }
  }, [activeTab, userPosition, landmarks.length]);

  // Geocoding state
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !location || !time || !description) return;

    setIsGeocoding(true);
    setGeocodeError('');

    // Use selectedCoords if available, otherwise geocode the text
    let coords: GeoPosition | null = selectedCoords;
    
    if (!coords) {
      coords = await geocodeLocation(location);
    }

    if (!coords) {
      // Non-blocking: warn the user but still allow submission
      setGeocodeError('Could not find coordinates for this location. Event will not appear on map.');
    }

    const formattedTime = time ? new Date(time).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }) : time;

    addEvent({
      title,
      location,
      time: formattedTime !== 'Invalid Date' ? formattedTime : time,
      description,
      // Use coords if found, else fall back to userPosition, else undefined
      coordinates: coords ?? (userPosition ?? undefined),
    });

    // Reset form and switch to events tab
    setTitle('');
    setLocation('');
    setTime('');
    setDescription('');
    setSelectedCoords(null);
    setGeocodeError('');
    setIsGeocoding(false);
    setActiveTab('events');
  };

  /** Join event and fly map to it */
  const handleJoin = (id: string) => {
    joinEvent(id);
    const ev = events.find((e) => e.id === id);
    if (ev?.coordinates) onSelectEvent(ev);
  };

  /** View on Map: close overlay and fly map to event */
  const handleSelectEvent = (ev: CommunityEvent) => {
    onSelectEvent(ev);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Slide-Up Panel */}
      <div className="relative w-full h-[85vh] bg-gray-50 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-[slideUp_0.4s_ease-out]">

        {/* Header */}
        <div className="flex justify-between items-center p-6 bg-white border-b border-gray-100 shrink-0">
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tighter">Community.</h2>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex bg-white px-4 pt-2 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] shrink-0 gap-2">
          <button
            onClick={() => setActiveTab('events')}
            className={`flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors rounded-t-lg ${
              activeTab === 'events' ? 'border-gray-900 text-gray-900 bg-gray-50' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Local Activity
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 text-sm font-bold border-b-[3px] transition-colors rounded-t-lg ${
              activeTab === 'create' ? 'border-gray-900 text-gray-900 bg-gray-50' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Host Event
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 bg-[#Fafafa]">
          {/* Events Tab */}
          {activeTab === 'events' && (
            <div className="pb-12 flex flex-col gap-4">
              {!isLoaded ? (
                <div className="flex justify-center p-8">
                  <div className="w-8 h-8 border-[3px] border-gray-900 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : events.length === 0 ? (
                <p className="text-center text-gray-400 mt-10 font-medium">No community activity yet.</p>
              ) : (
                events.map((ev) => (
                  <EventCard
                    key={ev.id}
                    event={ev}
                    onJoin={handleJoin}
                    onSelect={handleSelectEvent}
                    onRemove={removeEvent}
                    onToggleInterested={toggleInterested}
                  />
                ))
              )}
            </div>
          )}

          {/* Create Event Tab */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreate} className="flex flex-col gap-5 pb-12">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pl-1">Event Title</label>
                <input
                  required type="text" value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Neighborhood Patrol"
                  className="w-full mt-1.5 px-4 py-3.5 rounded-[1rem] border-none shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] focus:outline-none focus:bg-gray-50 bg-white text-gray-900 font-bold placeholder:font-medium transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Location</label>
                <div className="flex flex-col gap-2 mt-1">
                  <input
                    required type="text" value={location}
                    onChange={(e) => { 
                      setLocation(e.target.value); 
                      setSelectedCoords(null); // Reset explicit coords if user types manually
                      setGeocodeError(''); 
                    }}
                    placeholder="e.g. Central Park"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white text-gray-900 font-medium"
                  />
                  
                  {/* Nearby Landmarks Dropdown Menu */}
                  <div className="mt-1">
                    <select
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') return;
                        const lm = landmarks.find((l) => l.name === val);
                        if (lm) {
                          setLocation(lm.name);
                          setSelectedCoords({ lat: lm.lat, lng: lm.lng });
                          setGeocodeError('');
                        }
                      }}
                      className={`w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-sm font-medium cursor-pointer transition-colors ${
                        isLoadingLandmarks ? 'bg-gray-100 text-gray-400' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                      }`}
                      value=""
                      disabled={isLoadingLandmarks || landmarks.length === 0}
                    >
                      {isLoadingLandmarks ? (
                        <option value="" disabled>⏳ Finding nearby landmarks using GPS...</option>
                      ) : !userPosition ? (
                        <option value="" disabled>📡 GPS location required for suggestions</option>
                      ) : landmarks.length === 0 ? (
                        <option value="" disabled>No nearby landmarks found</option>
                      ) : (
                        <option value="" disabled>🎯 Select a nearby landmark...</option>
                      )}
                      
                      {landmarks.map((lm, idx) => (
                        <option key={idx} value={lm.name}>
                          {lm.name} {
                            lm.type === 'park' ? '🌳' : 
                            lm.type === 'school' ? '🏫' : 
                            lm.type === 'museum' ? '🏛️' : 
                            lm.type === 'library' ? '📚' :
                            lm.type === 'place_of_worship' ? '⛪' :
                            lm.type === 'attraction' ? '✨' :
                            lm.type === 'square' ? '⛲' :
                            '📍'
                          }
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                {geocodeError && (
                  <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                    <span>⚠️</span> {geocodeError}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Time</label>
                <input
                  required type="datetime-local" value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white text-gray-900 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase">Description</label>
                <textarea
                  required value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this event about?"
                  rows={4}
                  className="w-full mt-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 bg-white resize-none text-gray-900 font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={isGeocoding}
                className="w-full py-4 mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-[0_4px_15px_rgba(37,99,235,0.3)] transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGeocoding ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Finding location…
                  </>
                ) : 'Publish Event'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
