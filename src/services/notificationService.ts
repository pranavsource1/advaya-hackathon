import { LocalNotifications } from '@capacitor/local-notifications';

class NotificationService {
  private lastAlertTime: number = 0;
  private readonly DEBOUNCE_MS = 30000; // 30 seconds

  /**
   * Request permissions to show local notifications
   */
  async requestPermissions(): Promise<boolean> {
    try {
      const { display } = await LocalNotifications.requestPermissions();
      return display === 'granted';
    } catch (error: unknown) {
      const err = error as { message?: string };
      if (err?.message?.includes('Not implemented')) {
        return true; // Allow flow to continue on web
      }
      console.error('Error requesting notification permissions:', error);
      return false;
    }
  }

  /**
   * Schedule an alert for exiting the geofence
   * Uses debouncing to prevent spamming notifications
   */
  async sendGeofenceAlert(): Promise<void> {
    const now = Date.now();
    if (now - this.lastAlertTime < this.DEBOUNCE_MS) {
      return; // Skip if we recently alerted
    }

    try {
      const isGranted = await this.requestPermissions();
      if (!isGranted) return;

      await LocalNotifications.schedule({
        notifications: [
          {
            title: '🚨 Alert!',
            body: 'You have exited the safe zone',
            id: new Date().getTime(),
            schedule: { at: new Date(Date.now() + 1000) },
            actionTypeId: '',
            extra: null,
            channelId: 'geofence_alerts'
          },
        ],
      });

      this.lastAlertTime = now;
    } catch (error) {
      console.error('Error scheduling notification:', error);
    }
  }
}

export const notificationService = new NotificationService();
