import { parseBankSMS } from './smsParser';

describe('smsParser - Indian Bank SMS Detection', () => {
  
  describe('Positive Credit Cases (Income)', () => {
    test('HDFC Credit SMS', () => {
      const body = 'Alert: Your A/c XXXXXX1234 is credited with Rs. 5,000.00 on 01-Jan-24 by INF/Salary. Info: HDFCBANK';
      const address = 'VM-HDFCBK';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(5000);
      expect(result?.type).toBe('income');
      expect(result?.note).toContain('HDFCBK');
    });

    test('SBI Credit SMS (₹ Symbol)', () => {
      const body = 'Your A/c X7392 is credited with ₹12,500.00 on 15/03/24 by RTGS. Available Bal: ₹45,000.00 - SBI';
      const address = 'AX-SBIN';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(12500);
      expect(result?.note).toContain('SBIN');
    });

    test('ICICI Credit SMS (INR and Commas)', () => {
      const body = 'Dear Customer, your Acct XX842 is processed with credit of INR 1,50,000.50 on 28-Feb. Ref No: 12345. ICICI Bank';
      const address = 'MD-ICICIB';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(150000.5);
    });

    test('Axis Bank Credit SMS', () => {
      const body = 'Axis Bank: Account XX999 credited with Rs 2,000 on 2024-04-01. Total Bal: Rs 15,000.';
      const address = 'AXISBK';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(2000);
    });

    test('Added keyword (Paytm/Wallets)', () => {
      const body = 'Rs. 500 added with to your Paytm Wallet. New balance is Rs. 1,200.';
      const address = 'PAYTM';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.amount).toBe(500);
    });
  });

  describe('Negative Cases (Ignore)', () => {
    test('Debit SMS (Should return null)', () => {
      const body = 'Your A/c X1234 is debited with Rs. 1,000 for ATM WDL. Balance: Rs. 5,000.';
      const address = 'HDFCBK';
      const result = parseBankSMS(body, address);
      
      expect(result).toBeNull();
    });

    test('OTP SMS (Should return null)', () => {
      const body = '123456 is your OTP to process credit card payment of Rs. 2,000. Do not share.';
      const address = 'BANKOT';
      const result = parseBankSMS(body, address);
      
      expect(result).toBeNull();
    });

    test('Generic Alert (Should return null)', () => {
      const body = 'Dear Customer, update your KYC for account XX1234. Ignore if done.';
      const address = 'SBIN';
      const result = parseBankSMS(body, address);
      
      expect(result).toBeNull();
    });

    test('Spam/Generic Text', () => {
      const body = 'Get a personal loan of Rs. 5,00,000 instantly! Apply now at bit.ly/easy-loan.';
      const address = 'LOAN-AD';
      const result = parseBankSMS(body, address);
      
      expect(result).toBeNull();
    });
  });

  describe('Technical Logic (ID & Date)', () => {
    test('Consistent Unique ID generation', () => {
      const body = 'Your A/c X1 is credited with Rs. 100 on 01/01/24';
      const address = 'TESTBK';
      const result1 = parseBankSMS(body, address);
      const result2 = parseBankSMS(body, address);
      
      expect(result1?.id).toBe(result2?.id);
    });

    test('Date extraction fallback', () => {
      const body = 'Your A/c X1 is credited with Rs. 100. (No date provided)';
      const address = 'TESTBK';
      const result = parseBankSMS(body, address);
      
      expect(result).not.toBeNull();
      expect(result?.date).toBeDefined();
      // Should not throw even with no date in string
    });
  });
});
