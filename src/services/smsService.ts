import { Capacitor } from '@capacitor/core';
import { MessageReader } from '@solimanware/capacitor-sms-reader';
import { parseBankSMS } from './smsParser';
import { FinanceTransaction } from '../types';

const PROCESSED_SMS_KEY = 'geofence_guardian_processed_sms';

export const smsService = {
  /**
   * Request SMS permission and fetch credits.
   * Returns a list of new, unconfirmed income transactions.
   */
  async scanForIncome(): Promise<FinanceTransaction[]> {
    if (Capacitor.getPlatform() !== 'android') {
      console.warn('SMS scanning is only supported on Android.');
      return [];
    }

    try {
      // 1. Check and request permission
      const status = await MessageReader.checkPermissions();
      if (status.messages !== 'granted') {
        const req = await MessageReader.requestPermissions();
        if (req.messages !== 'granted') {
          throw new Error('SMS permission denied by user.');
        }
      }

      // 2. Fetch messages (limit to 50 for performance)
      const { messages } = await MessageReader.getMessages({ 
        limit: 50
      });

      if (!messages || messages.length === 0) return [];

      // 3. Get already processed SMS IDs to avoid duplicates
      const processedIds = this.getProcessedIds();
      
      const detectedIncome: FinanceTransaction[] = [];

      // 4. Parse and filter
      for (const msg of messages) {
        if (processedIds.has(msg.id)) continue;

        // MessageReader uses 'sender' instead of 'address'
        const transaction = parseBankSMS(msg.body, msg.sender);
        if (transaction) {
          detectedIncome.push(transaction);
        }
      }

      return detectedIncome;
    } catch (error) {
      console.error('Scan SMS Error:', error);
      throw error;
    }
  },

  /** Mark these SMS as processed so they don't show up in next scans */
  markAsProcessed(ids: string[]) {
    const current = Array.from(this.getProcessedIds());
    const updated = [...new Set([...current, ...ids])];
    localStorage.setItem(PROCESSED_SMS_KEY, JSON.stringify(updated));
  },

  getProcessedIds(): Set<string> {
    const stored = localStorage.getItem(PROCESSED_SMS_KEY);
    if (!stored) return new Set();
    try {
      return new Set(JSON.parse(stored));
    } catch {
      return new Set();
    }
  }
};
