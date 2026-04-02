import { isInsideGeofence, haversineDistance } from './geofence';

describe('Geofence Feature (Safe Zone Alert)', () => {
  it('should calculate distance correctly between two points', () => {
    // 1 degree difference is roughly 111km
    const distanceMeters = haversineDistance(0, 0, 1, 0); 
    expect(distanceMeters).toBeGreaterThan(111000);
    expect(distanceMeters).toBeLessThan(112000);
  });

  it('should return true (safe) when the user is within the geofence radius', () => {
    // Same coordinate (0m distance) with a 100m radius safe zone
    const isSafe = isInsideGeofence(12.34, 56.78, 12.34, 56.78, 100);
    expect(isSafe).toBe(true);
  });

  it('should trigger alert behavior (return false) if the person goes OUT of the safe zone', () => {
    // Distant coordinate, well beyond 100m radius
    const isSafe = isInsideGeofence(13.00, 56.78, 12.34, 56.78, 100);
    expect(isSafe).toBe(false); 
  });
});