import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { startRealTimeSmsListener } from '../services/smsListener';
import { FinanceTransaction } from '@/lib/types';

export function useSMSListener(onDetection: (t: FinanceTransaction) => void) {
  useEffect(() => {
    let handler: { remove: () => void } | null = null;

    const init = async () => {
      // SMS listener only works on Android native — skip silently on web
      if (Capacitor.getPlatform() !== 'android') return;
      try {
        handler = await startRealTimeSmsListener((transaction) => {
          onDetection(transaction);
        });
      } catch (err) {
        console.error('Failed to start real-time SMS listener:', err);
      }
    };

    init();

    return () => {
      if (handler) {
        console.log('Hook: Cleaning up SMS Listener');
        handler.remove();
      }
    };
  }, [onDetection]);
}
