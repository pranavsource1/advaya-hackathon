import { registerPlugin } from '@capacitor/core';
import { parseBankSMS } from './smsParser';
import { FinanceTransaction } from '../types';

export interface SmsListenerPlugin {
  addListener(
    eventName: 'smsReceived',
    listenerFunc: (data: { body: string; sender: string; timestamp: number }) => void
  ): Promise<{ remove: () => void }>;
}

// Register our custom native plugin
const SmsListener = registerPlugin<SmsListenerPlugin>('SmsListener');

type OnIncomeDetected = (transaction: FinanceTransaction) => void;

/**
 * Initializes the real-time SMS listener.
 * This should be called once in the app layout or a high-level hook.
 */
export async function startRealTimeSmsListener(onIncomeDetected: OnIncomeDetected) {
  console.log('Starting Real-Time SMS Listener...');
  
  const handler = await SmsListener.addListener('smsReceived', (data) => {
    console.log('New SMS received via native bridge:', data.sender);
    
    // Parse the incoming message
    const transaction = parseBankSMS(data.body, data.sender);
    
    if (transaction) {
      console.log('Bank Income Detected!', transaction.amount);
      onIncomeDetected(transaction);
    }
  });

  return handler;
}
