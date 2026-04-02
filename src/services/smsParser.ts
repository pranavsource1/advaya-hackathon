import { FinanceTransaction } from '../types';
import { SMS_PATTERNS } from '../utils/regexPatterns';

export interface ParsedSMS {
  amount: number;
  source: string;
  date: string;
  isCredit: boolean;
}

/**
 * Parsing logic to determine if an SMS message is a relevant income transaction.
 * @param body - Message text
 * @param address - Sender ID/Name
 */
export function parseBankSMS(body: string, address: string): FinanceTransaction | null {
  const cleanBody = body.toLowerCase();
  
  // 1. Initial check: Must contain credit keywords AND not debit keywords
  if (!SMS_PATTERNS.CREDIT_KEYWORDS.test(cleanBody)) return null;
  if (SMS_PATTERNS.DEBIT_KEYWORDS.test(cleanBody)) return null;

  // 2. Extract Amount
  const amountMatch = body.match(SMS_PATTERNS.AMOUNT);
  if (!amountMatch) return null;
  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  if (isNaN(amount) || amount <= 0) return null;

  // 3. Extract Bank Hint (From address or body)
  let bankSource = 'Unknown Bank';
  const bankMatch = address.match(SMS_PATTERNS.BANK_SENDER_HINT) || body.match(SMS_PATTERNS.BANK_SENDER_HINT);
  if (bankMatch) {
    bankSource = bankMatch[1] || bankMatch[0];
  } else if (address.includes('-')) {
     // Indian bank SMS often looks like "VM-HDFCBK"
     bankSource = address.split('-')[1];
  }

  // 4. Extract Date (Optional, fallback to current)
  const dateMatch = body.match(SMS_PATTERNS.DATE);
  let finalDate = new Date().toISOString();
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[1]);
    if (!isNaN(parsedDate.getTime())) {
      finalDate = parsedDate.toISOString();
    }
  }

  // Generate a unique ID based on a hash of the content to prevent duplicates later
  const uniqueId = `sms-${Math.abs(hashString(body + finalDate))}`;

  return {
    id: uniqueId,
    amount,
    type: 'income',
    category: 'Auto-detected',
    note: `SMS from ${bankSource} (${address})`,
    date: finalDate,
  };
}

/** Simple string hash for ID generation */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash;
}
