/**
 * Calculates the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @param lat1 Latitude of point 1 in decimal degrees
 * @param lon1 Longitude of point 1 in decimal degrees
 * @param lat2 Latitude of point 2 in decimal degrees
 * @param lon2 Longitude of point 2 in decimal degrees
 * @returns Distance in meters
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadian = (angle: number) => (Math.PI / 180) * angle;

  const R = 6371e3; // Earth radius in meters
  const dLat = toRadian(lat2 - lat1);
  const dLon = toRadian(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadian(lat1)) *
      Math.cos(toRadian(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Checks if a given location is within a circular geofence.
 * @param userLat Current user latitude
 * @param userLon Current user longitude
 * @param centerLat Geofence center latitude
 * @param centerLon Geofence center longitude
 * @param radiusMeters Radius of the geofence in meters
 * @returns boolean indicating if the user is strictly inside or on the border
 */
export function isInsideGeofence(
  userLat: number,
  userLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeters: number
): boolean {
  const distance = haversineDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radiusMeters;
}
