/**
 * Regex patterns for parsing Indian bank SMS messages.
 * Designed to detect "Credit" (Income) transactions.
 */

export const SMS_PATTERNS = {
  // Matches "Rs.", "INR", or "₹" followed by a number with potential commas
  AMOUNT: /(?:Rs\.?|INR|₹)\s?(\d+(?:,\d+)*(?:\.\d{1,2})?)/i,
  
  // Keywords indicating a credit (income) operation
  CREDIT_KEYWORDS: /(?:credited|deposited|received|added|processed)\s+(?:with|to|in|by)?/i,
  
  // Negative keywords to ignore (debits, OTPs, true fraud alerts)
  DEBIT_KEYWORDS: /(?:debited|withdrawn|spent|paid|otp|payment\s+declined)/i,
  
  // Potential bank name extraction (often at the start or end of the SMS address)
  BANK_SENDER_HINT: /([A-Z]{2,10})-(?:BANK|BNK|HDFC|ICICI|SBI|AXIS|PAYTM)|(?:HDFC|ICICI|SBI|AXIS|AXB|PNB|KOTAK)/i,

  // Date patterns often found in Indian bank SMS: DD-MM-YY or DD/MM/YY
  DATE: /(\d{2}[-/]\d{2}[-/]\d{2,4})/,
};

/**
 * Standardizes currency strings to a numeric value.
 * Example: "1,000.50" -> 1000.5
 */
export function parseAmount(amountStr: string): number {
  return parseFloat(amountStr.replace(/,/g, ''));
}
