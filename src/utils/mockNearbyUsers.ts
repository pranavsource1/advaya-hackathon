import { GeoPosition, NearbyUser } from '@/lib/types';

// In-memory store for the client session
const activeUsers = new Map<string, { lat: number; lng: number; last_seen: number; avatar_seed: number }>();

function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c; // Distance in km
}

/**
 * Simulates fetching nearby users. 
 * Over time, it injects fake incoming "community" users joining around the radius.
 */
export function getMockNearbyUsers(lat: number, lng: number, radiusKm: number = 10, userId: string): NearbyUser[] {
  const currentTime = Date.now();

  // Register the current user
  if (userId) {
    if (!activeUsers.has(userId)) {
      activeUsers.set(userId, { lat, lng, last_seen: currentTime, avatar_seed: Math.floor(Math.random() * 100) });
    } else {
      const u = activeUsers.get(userId)!;
      u.lat = lat;
      u.lng = lng;
      u.last_seen = currentTime;
    }
  }

  // Inject a simulated new user every few calls if empty to make the demo feel alive
  if (activeUsers.size < 3) {
    const fakeId = `fake_${Math.random().toString(36).substr(2, 5)}`;
    // Generate a coordinate vaguely near the real user (within 2-3km)
    const latOffset = (Math.random() - 0.5) * 0.04;
    const lngOffset = (Math.random() - 0.5) * 0.04;
    activeUsers.set(fakeId, {
      lat: lat + latOffset,
      lng: lng + lngOffset,
      last_seen: currentTime,
      avatar_seed: Math.floor(Math.random() * 100) + 1,
    });
  }

  // Prune inactive
  for (const [uid, data] of Array.from(activeUsers.entries())) {
    if (currentTime - data.last_seen > 300000) { // 5 mins
      activeUsers.delete(uid);
    }
  }

  // Return filtering by distance
  const nearby: NearbyUser[] = [];
  for (const [uid, data] of Array.from(activeUsers.entries())) {
    if (uid === userId) continue; // Skip self

    const dist = haversine(lat, lng, data.lat, data.lng);
    if (dist <= radiusKm) {
      nearby.push({
        id: uid,
        position: { lat: data.lat, lng: data.lng },
        avatarSeed: data.avatar_seed,
        lastSeen: new Date(data.last_seen).toISOString(),
      });
    }
  }

  return nearby;
}