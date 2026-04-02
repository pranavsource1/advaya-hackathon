/**
 * geocode.ts
 * Converts a free-text location string into GPS coordinates using the
 * Nominatim geocoding API (OpenStreetMap, free, no API key required).
 *
 * Rate limit: 1 request/second — suitable for user-initiated event creation.
 * For high-traffic production use, swap the URL for Google Maps Geocoding API.
 */

import { GeoPosition } from '../types';

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

export interface Landmark {
  name: string;
  lat: number;
  lng: number;
  type?: string;
  distance?: number;
}

/**
 * Geocodes a location text string to lat/lng coordinates.
 * @param locationText - e.g. "Central Park, New York" or "Bangalore"
 * @returns GeoPosition { lat, lng } or null if not found / on error
 */
export async function geocodeLocation(locationText: string): Promise<GeoPosition | null> {
  if (!locationText.trim()) return null;

  try {
    const encoded = encodeURIComponent(locationText.trim());
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          // Nominatim requires a valid User-Agent for identification
          'User-Agent': 'GeofenceGuardianApp/1.0',
          'Accept-Language': 'en',
        },
      }
    );

    if (!response.ok) {
      console.warn('[geocode] Nominatim request failed:', response.status);
      return null;
    }

    const data: NominatimResult[] = await response.json();

    if (data.length === 0) {
      console.warn('[geocode] No results for:', locationText);
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('[geocode] Error during geocoding:', error);
    return null;
  }
}

/**
 * Fetches nearby landmarks around the given lat/lng using Overpass API.
 * Uses a search radius of ~5-10km.
 */
export async function getNearbyLandmarks(lat: number, lng: number, radiusKm: number = 10): Promise<Landmark[]> {
  const radiusMeters = radiusKm * 1000;
  const timeout = 10;
  
  // A query to find common community event venues: parks, community centres, schools, plazas, monuments
  const query = `[out:json][timeout:${timeout}];
(
  node["leisure"="park"](around:${radiusMeters},${lat},${lng});
  way["leisure"="park"](around:${radiusMeters},${lat},${lng});
  node["amenity"="community_centre"](around:${radiusMeters},${lat},${lng});
  way["amenity"="community_centre"](around:${radiusMeters},${lat},${lng});
  node["amenity"="school"](around:${radiusMeters},${lat},${lng});
  way["amenity"="school"](around:${radiusMeters},${lat},${lng});
  node["tourism"="museum"](around:${radiusMeters},${lat},${lng});
  node["historic"="monument"](around:${radiusMeters},${lat},${lng});
  node["amenity"="library"](around:${radiusMeters},${lat},${lng});
  way["amenity"="library"](around:${radiusMeters},${lat},${lng});
  node["amenity"="public_building"](around:${radiusMeters},${lat},${lng});
  way["amenity"="public_building"](around:${radiusMeters},${lat},${lng});
  node["place"="square"](around:${radiusMeters},${lat},${lng});
  way["place"="square"](around:${radiusMeters},${lat},${lng});
  node["tourism"="attraction"](around:${radiusMeters},${lat},${lng});
  way["tourism"="attraction"](around:${radiusMeters},${lat},${lng});
  node["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lng});
  way["amenity"="place_of_worship"](around:${radiusMeters},${lat},${lng});
);
out center 15;
`;

  const bgsLandmarks: Landmark[] = [
    { name: "BGS Ground", lat: 12.9050, lng: 77.5015, type: 'park' },
    { name: "Shrunga Giri Shanmukha Temple", lat: 12.9020, lng: 77.5144, type: 'place_of_worship' },
    { name: "Kengeri Lake", lat: 12.9126, lng: 77.4842, type: 'park' },
    { name: "Omkar Hills", lat: 12.8943, lng: 77.5258, type: 'attraction' },
    { name: "Turahalli Forest View", lat: 12.8833, lng: 77.5222, type: 'park' },
    { name: "R.R. Nagar Arch", lat: 12.9230, lng: 77.5160, type: 'square' },
    { name: "Gopalan Arcade", lat: 12.9350, lng: 77.5240, type: 'public_building' },
    { name: "Kengeri Metro Station", lat: 12.9189, lng: 77.4843, type: 'public_building' },
    { name: "Kumbalgodu Public Park", lat: 12.8900, lng: 77.4600, type: 'park' },
    { name: "SJB Institute Campus", lat: 12.9053, lng: 77.4988, type: 'school' }
  ];

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: query,
    });
    
    if (!response.ok) return bgsLandmarks;

    const data = await response.json();
    const landmarks: Landmark[] = [];

    for (const el of data.elements) {
      if (!el.tags || !el.tags.name) continue;
      
      const elLat = el.lat || el.center?.lat;
      const elLng = el.lon || el.center?.lon;
      
      if (elLat && elLng) {
        landmarks.push({
          name: el.tags.name,
          lat: elLat,
          lng: elLng,
          type: el.tags.leisure || el.tags.amenity || el.tags.tourism || el.tags.historic || el.tags.place || 'landmark',
        });
      }
    }
    
    // Combine fetched with hardcoded BGS fallback landmarks
    const combinedLandmarks = [...bgsLandmarks, ...landmarks];

    // Deduplicate by name
    const unique = combinedLandmarks.filter((l, index, self) => 
      index === self.findIndex((t) => t.name === l.name)
    );
    
    // Sort roughly by type or just return top 25
    return unique.slice(0, 25);
  } catch (error) {
    console.error('[geocode] Error fetching landmarks:', error);
    
    // Fallback to BGS landmarks if API fails entirely
    return bgsLandmarks;
  }
}
