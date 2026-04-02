'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { GeoPosition, SafeZone, GeofenceStatus, TrackingState, CommunityEvent, NearbyUser } from '@/lib/types';
import { locationService } from '@/services/locationService';
import { notificationService } from '@/services/notificationService';
import { isInsideGeofence } from '@/utils/geofence';
import Controls from '@/components/components_map/Controls';
import StatusBadge from '@/components/components_map/StatusBadge';
import AlertBanner from '@/components/components_map/AlertBanner';
import CommunityOverlay from '@/components/components_map/CommunityOverlay';
import { useCommunity } from '@/hooks/useCommunity';

// Leaflet uses 'window' which causes SSR issues, so we dynamic import MapView
const DynamicMapView = dynamic(() => import('@/components/components_map/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading Map...</p>
      </div>
    </div>
  ),
});

export default function MapPage() {
  const [userPosition, setUserPosition] = useState<GeoPosition | null>(null);
  const [safeZone, setSafeZone] = useState<SafeZone | null>(null);
  const [status, setStatus] = useState<GeofenceStatus>('unknown');
  const [trackingState, setTrackingState] = useState<TrackingState>('idle');

  // UI State
  const [radius, setRadius] = useState<number>(100);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [isCommunityOpen, setIsCommunityOpen] = useState<boolean>(false);
  const [focusedEvent, setFocusedEvent] = useState<CommunityEvent | null>(null);
  const focusResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Lifted Community State
  const { events, addEvent, joinEvent, toggleInterested, removeEvent, isLoaded } = useCommunity();

  // Nearby Users State (Snapchat Map style)
  const [nearbyUsers, setNearbyUsers] = useState<NearbyUser[]>([]);
  const [isRefreshingUsers, setIsRefreshingUsers] = useState<boolean>(false);

  const handleRefreshMap = useCallback(async () => {
    if (!userPosition) return;
    setIsRefreshingUsers(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 800));

      const mockNearbyCount = Math.floor(Math.random() * 4) + 3;
      const localUsers: NearbyUser[] = Array.from({ length: mockNearbyCount }).map((_, i) => {
        const latOffset = (Math.random() - 0.5) * 0.03;
        const lngOffset = (Math.random() - 0.5) * 0.03;
        return {
          id: `user-${Date.now()}-${i}`,
          position: {
            lat: userPosition.lat + latOffset,
            lng: userPosition.lng + lngOffset
          },
          avatarSeed: Math.floor(Math.random() * 10),
          lastSeen: new Date().toISOString()
        };
      });
      setNearbyUsers(localUsers);
    } catch (error) {
      console.error('Failed to fetch nearby users', error);
    } finally {
      setIsRefreshingUsers(false);
    }
  }, [userPosition]);

  const handleSelectEvent = useCallback((ev: CommunityEvent) => {
    setFocusedEvent(ev);
    if (focusResetRef.current) clearTimeout(focusResetRef.current);
    focusResetRef.current = setTimeout(() => setFocusedEvent(null), 2500);
  }, []);

  // Initialize GPS on mount
  useEffect(() => {
    async function initLocation() {
      const position = await locationService.getCurrentPosition();
      if (position) {
        setUserPosition(position);
      }
    }
    initLocation();

    return () => {
      locationService.clearWatch();
    };
  }, []);

  const handleSetSafeZone = useCallback(() => {
    if (!userPosition) return;
    setSafeZone({ center: userPosition, radius });
    setStatus('inside');
  }, [userPosition, radius]);

  const handleRadiusChange = useCallback((newRadius: number) => {
    setRadius(newRadius);
    if (safeZone) {
      setSafeZone({ ...safeZone, radius: newRadius });
    }
  }, [safeZone]);

  // Evaluate Geofence whenever position or safe zone changes
  useEffect(() => {
    if (!safeZone || !userPosition) {
      if (status !== 'unknown') {
        setTimeout(() => setStatus('unknown'), 0);
      }
      return;
    }

    const inside = isInsideGeofence(
      userPosition.lat,
      userPosition.lng,
      safeZone.center.lat,
      safeZone.center.lng,
      safeZone.radius
    );

    const newStatus: GeofenceStatus = inside ? 'inside' : 'outside';

    if (status === 'inside' && newStatus === 'outside') {
      notificationService.sendGeofenceAlert();
      setTimeout(() => setShowAlert(true), 0);
    }

    if (status !== newStatus) {
      setTimeout(() => setStatus(newStatus), 0);
    }
  }, [userPosition, safeZone, status]);

  // Auto-refresh nearby users on first GPS lock
  useEffect(() => {
    if (userPosition && nearbyUsers.length === 0) {
      handleRefreshMap();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPosition]);

  const toggleTracking = useCallback(() => {
    if (trackingState === 'tracking') {
      locationService.clearWatch();
      setTrackingState('idle');
    } else {
      setTrackingState('tracking');
      locationService.watchPosition((pos, err) => {
        if (err || !pos) {
          setTrackingState('error');
          return;
        }
        setUserPosition(pos);
      });
    }
  }, [trackingState]);

  return (
    <main className="relative w-full min-h-screen overflow-hidden bg-gray-50 flex flex-col">
      <StatusBadge status={status} />

      {/* Floating Header Actions (Top Right) */}
      <div className="absolute top-6 right-6 z-40 flex flex-col gap-3 items-end">
        <button
          onClick={handleRefreshMap}
          disabled={isRefreshingUsers || !userPosition}
          className="bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 text-gray-900 font-bold text-xs tracking-tight flex items-center justify-center gap-2 hover:bg-white transition-all active:scale-[0.98] disabled:opacity-50 min-w-[120px]"
        >
          <svg className={`w-4 h-4 text-gray-900 ${isRefreshingUsers ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {isRefreshingUsers ? 'Scanning...' : 'Refresh'}
        </button>

        <button
          onClick={() => setIsCommunityOpen(true)}
          className="bg-white/90 backdrop-blur-xl px-5 py-2.5 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/20 text-gray-900 font-bold text-xs tracking-tight flex items-center gap-2 hover:bg-white transition-all active:scale-[0.98]"
        >
          <svg className="w-5 h-5 text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Community
        </button>
      </div>

      <AlertBanner isVisible={showAlert} onDismiss={() => setShowAlert(false)} />

      <DynamicMapView
        userPosition={userPosition}
        safeZone={safeZone}
        events={events}
        focusedEvent={focusedEvent}
        nearbyUsers={nearbyUsers}
      />

      <Controls
        onSetSafeZone={handleSetSafeZone}
        canSetSafeZone={!!userPosition}
        radius={radius}
        onRadiusChange={handleRadiusChange}
        isTracking={trackingState === 'tracking'}
        onToggleTracking={toggleTracking}
      />

      <CommunityOverlay
        isOpen={isCommunityOpen}
        onClose={() => setIsCommunityOpen(false)}
        userPosition={userPosition}
        events={events}
        addEvent={addEvent}
        joinEvent={joinEvent}
        toggleInterested={toggleInterested}
        removeEvent={removeEvent}
        isLoaded={isLoaded}
        onSelectEvent={handleSelectEvent}
      />
    </main>
  );
}
