import { Geolocation, PositionOptions } from '@capacitor/geolocation';

export type LocationCallback = (position: { lat: number; lng: number } | null, error?: unknown) => void;

class LocationService {
  private watchId: string | null = null;

  /**
   * Request precise location permissions
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const permissions = await Geolocation.requestPermissions();
      return permissions.location === 'granted';
    } catch (error: unknown) {
      const err = error as { message?: string };
      // Check if it's the "Not implemented on web" error
      if (err?.message?.includes('Not implemented')) {
        return true; // Assume true on web to let browser handle native prompt
      }
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }

  /**
   * Get current device position
   */
  async getCurrentPosition(): Promise<{ lat: number; lng: number } | null> {
    try {
      const isGranted = await this.requestPermissions();
      if (!isGranted) throw new Error('Location permission not granted');

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
      });

      return {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  /**
   * start tracking continuous device location
   */
  async watchPosition(callback: LocationCallback): Promise<void> {
    try {
      const isGranted = await this.requestPermissions();
      if (!isGranted) throw new Error('Location permission not granted');

      const options: PositionOptions = {
        enableHighAccuracy: true,
        // Wait at least 3 seconds before reporting next location (roughly)
        // Note: Capacitor's implementation may not always strictly adhere to timeout but we request it.
        timeout: 10000,
        maximumAge: 0,
      };

      this.watchId = await Geolocation.watchPosition(options, (position, err) => {
        if (err) {
          console.error('Error watching position:', err);
          callback(null, err);
          return;
        }

        if (position) {
          callback({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        }
      });
    } catch (error) {
      console.error('Failed to start watchPosition:', error);
      callback(null, error);
    }
  }

  /**
   * Stop tracking device location
   */
  async clearWatch(): Promise<void> {
    if (this.watchId !== null) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
        this.watchId = null;
      } catch (error) {
        console.error('Error clearing watch:', error);
      }
    }
  }
}

export const locationService = new LocationService();
