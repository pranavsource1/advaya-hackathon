'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { FinanceTransaction } from '@/lib/types';
import { smsService } from '@/services/smsService';
import { useSMSListener } from '@/hooks/useSMSListener';

const STORAGE_KEY = 'geofence_guardian_finance';

export default function FinancePage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          return JSON.parse(stored);
        } catch (err) {
          console.error('Failed to parse finance data', err);
        }
      }
    }
    return [];
  });

  // Form State
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  // Scan State
  const [detectedItems, setDetectedItems] = useState<FinanceTransaction[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');

  // Real-time Toast State
  const [activeToast, setActiveToast] = useState<{ amount: number; source: string } | null>(null);

  // Search State
  const [searchTerm, setSearchTerm] = useState('');

  // Save transactions
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  }, [transactions]);

  // Dashboard Calculations
  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const balance = totals.income - totals.expense;

  // 1. Filter Transactions by Search Term
  const filteredTransactions = useMemo(() => {
    if (!searchTerm.trim()) return transactions;
    const term = searchTerm.toLowerCase();
    return transactions.filter(t =>
      t.category.toLowerCase().includes(term) ||
      (t.note && t.note.toLowerCase().includes(term))
    );
  }, [transactions, searchTerm]);

  // 2. Group Transactions by Date
  const groupedTransactions = useMemo(() => {
    const groups: { [key: string]: FinanceTransaction[] } = {};
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    filteredTransactions.forEach(t => {
      const d = new Date(t.date);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

      let label = '';
      if (dayStart === today) label = 'Today';
      else if (dayStart === yesterday) label = 'Yesterday';
      else {
        label = new Intl.DateTimeFormat('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }).format(d);
      }

      if (!groups[label]) groups[label] = [];
      groups[label].push(t);
    });

    return groups;
  }, [filteredTransactions]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    const newTransaction: FinanceTransaction = {
      id: Math.random().toString(36).substring(2, 9),
      amount: numAmount,
      type,
      category,
      note,
      date: new Date().toISOString(),
    };

    setTransactions([newTransaction, ...transactions]);
    setAmount('');
    setCategory('');
    setNote('');
  };

  const removeTransaction = (id: string) => {
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  const handleScanSMS = async () => {
    setIsScanning(true);
    setScanError('');
    try {
      const newItems = await smsService.scanForIncome();
      setDetectedItems(newItems);
      if (newItems.length === 0) {
        setScanError('No new income messages found in the last 50 messages.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setScanError(message || 'Failed to scan SMS. Make sure you are on Android.');
    } finally {
      setIsScanning(false);
    }
  };

  const confirmDetectedItem = (item: FinanceTransaction) => {
    setTransactions([item, ...transactions]);
    setDetectedItems(prev => prev.filter(i => i.id !== item.id));
    smsService.markAsProcessed([item.id.replace('sms-', '')]);
  };

  const dismissDetectedItem = (id: string) => {
    setDetectedItems(prev => prev.filter(i => i.id !== id));
    smsService.markAsProcessed([id.replace('sms-', '')]);
  };

  // Real-time SMS listener
  const handleIncomingTransaction = (transaction: FinanceTransaction) => {
    setTransactions(prev => [transaction, ...prev]);
    setActiveToast({ amount: transaction.amount, source: transaction.category });
    setTimeout(() => setActiveToast(null), 5000);
  };

  useSMSListener(handleIncomingTransaction);

  return (
    <div className="min-h-screen bg-[#Fafafa] flex flex-col px-5 py-8 gap-8 relative pb-40">
      {/* Header */}
      <div className="flex flex-col gap-1 mt-4">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tighter">Finance.</h1>
        <p className="text-gray-400 font-medium text-sm">Monitor your activity</p>
      </div>

      {/* Real-time Notification Toast */}
      {activeToast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] w-[90%] max-w-sm animate-[slideIn_0.3s_ease-out]">
          <div className="bg-white/80 p-4 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-between gap-4 border border-gray-100 backdrop-blur-2xl">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-xl font-bold">₹</span>
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Income Detected!</p>
                <p className="text-xs text-gray-500 font-medium">₹{activeToast.amount.toLocaleString('en-IN')} via SMS</p>
              </div>
            </div>
            <button onClick={() => setActiveToast(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 shrink-0">
        <div className="bg-gray-900 text-white p-7 rounded-[2rem] shadow-[0_15px_40px_-10px_rgba(0,0,0,0.2)] flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-2xl -mr-16 -mt-16 pointer-events-none" />
          <span className="text-sm font-medium text-gray-400">Current Balance</span>
          <span className="text-[2.75rem] font-bold tracking-tighter leading-none mt-1 relative z-10 flex items-baseline">
            <span className="text-2xl mr-1 font-medium text-gray-400">₹</span>
            {Math.abs(balance).toLocaleString('en-IN')}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-400">Income</span>
            <span className="text-xl font-bold text-gray-900 tracking-tight">₹{totals.income.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col gap-2">
            <div className="w-8 h-8 rounded-full bg-red-50 text-red-400 flex items-center justify-center mb-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
              </svg>
            </div>
            <span className="text-xs font-semibold text-gray-400">Expenses</span>
            <span className="text-xl font-bold text-gray-900 tracking-tight">₹{totals.expense.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* SMS Scan Trigger */}
      <div className="flex flex-col gap-3">
        <button
          onClick={handleScanSMS}
          disabled={isScanning}
          className="w-full py-4 bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] text-gray-900 font-bold rounded-[1.25rem] flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          {isScanning ? (
            <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          )}
          {isScanning ? 'Syncing...' : 'Sync via SMS'}
        </button>
        {scanError && <p className="text-xs text-center text-red-500 font-medium">{scanError}</p>}
      </div>

      {/* Detected Items Review Section */}
      {detectedItems.length > 0 && (
        <div className="flex flex-col gap-4 animate-[slideIn_0.3s_ease-out]">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Detected from SMS
            </h2>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
              {detectedItems.length} found
            </span>
          </div>
          <div className="flex flex-col gap-3">
            {detectedItems.map((item) => (
              <div key={item.id} className="bg-green-50/50 border border-green-100 p-4 rounded-2xl flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-gray-900">₹{item.amount.toLocaleString('en-IN')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-tighter text-green-600 bg-white px-2 py-0.5 rounded shadow-sm">
                    Income
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => confirmDetectedItem(item)}
                    className="flex-1 py-2 bg-green-600 text-white text-xs font-bold rounded-lg shadow-sm active:scale-95 transition-transform"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => dismissDetectedItem(item.id)}
                    className="flex-1 py-2 bg-white text-gray-500 text-xs font-bold rounded-lg border border-gray-200 active:scale-95 transition-transform"
                  >
                    Discard
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Transaction Form */}
      <form onSubmit={handleAddTransaction} className="bg-white p-5 rounded-[1.5rem] shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] flex flex-col gap-4">
        <div className="flex bg-gray-50 p-1.5 rounded-[1rem]">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              type === 'expense' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => setType('income')}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all duration-300 ${
              type === 'income' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            Income
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">₹</span>
            <input
              required
              type="number"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full pl-8 pr-4 py-3 bg-gray-50/50 border-none rounded-2xl focus:outline-none focus:bg-gray-100 transition-colors text-gray-900 font-bold placeholder:font-medium text-lg"
            />
          </div>

          <input
            required
            type="text"
            placeholder="Category (e.g. Food, Salary)"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50/50 border-none rounded-2xl focus:outline-none focus:bg-gray-100 transition-colors text-gray-900 font-medium"
          />

          <input
            type="text"
            placeholder="Note (Optional)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="w-full px-4 py-3 bg-gray-50/50 border-none rounded-2xl focus:outline-none focus:bg-gray-100 transition-colors text-gray-900 font-medium"
          />
        </div>

        <button
          type="submit"
          className="w-full py-4 mt-2 bg-gray-900 text-white font-bold rounded-2xl shadow-[0_8px_16px_-8px_rgba(0,0,0,0.3)] active:scale-[0.98] transition-all"
        >
          Add Record
        </button>
      </form>

      {/* Transaction History */}
      <div className="flex flex-col gap-5 flex-1 mt-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-end justify-between">
            <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-none">Activity</h2>
            <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">{transactions.length}</span>
          </div>

          {/* Search Bar */}
          {transactions.length > 0 && (
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-4 w-4 text-gray-400 group-focus-within:text-gray-900 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search category or note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-11 pr-4 py-3.5 bg-white shadow-[0_4px_24px_-8px_rgba(0,0,0,0.04)] rounded-[1.25rem] text-sm placeholder-gray-400 focus:outline-none focus:bg-gray-50 transition-all font-medium text-gray-900 border-none"
              />
            </div>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16 bg-transparent">
            <div className="w-16 h-16 bg-gray-100 rounded-3xl flex items-center justify-center mb-4 text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-600 font-bold tracking-tight text-lg">No activity yet</p>
            <p className="text-sm text-gray-400 mt-1 font-medium">Your entries will appear here</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <p className="text-gray-600 font-bold tracking-tight text-lg">No matches found</p>
            <p className="text-sm text-gray-400 mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="flex flex-col gap-8 pb-10">
            {Object.keys(groupedTransactions).map((date) => (
              <div key={date} className="flex flex-col gap-4">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1">{date}</h3>
                <div className="flex flex-col gap-3">
                  {groupedTransactions[date].map((t) => (
                    <div key={t.id} className="bg-white p-4 rounded-[1.25rem] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.03)] flex items-center justify-between group hover:shadow-[0_8px_24px_-8px_rgba(0,0,0,0.08)] transition-all duration-300">
                      <div className="flex items-center gap-4 cursor-default">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 shrink-0 ${
                          t.type === 'income' ? 'bg-green-50 text-green-500' : 'bg-gray-50 text-gray-400'
                        }`}>
                          {t.type === 'income' ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-bold text-gray-900 tracking-tight text-base mb-0.5">{t.category}</p>
                          {t.note && <p className="text-xs text-gray-400 font-medium truncate max-w-[140px]">{t.note}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right flex flex-col justify-center">
                          <p className={`font-bold text-base tracking-tight ${t.type === 'income' ? 'text-green-500' : 'text-gray-900'}`}>
                            {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-wider">
                            {new Date(t.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => removeTransaction(t.id)}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM NAV BAR */}
      <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-3 bg-white/90 backdrop-blur-xl rounded-t-[2rem] shadow-[0_-8px_32px_rgba(0,0,0,0.06)] border-t border-gray-100">
        <Link href="/" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 px-4 py-2.5 active:scale-95 transition-all outline-none">
          <span className="material-symbols-outlined">medical_services</span>
          <span className="text-[10px] font-medium mt-1">Home</span>
        </Link>
        <Link href="/safety" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 px-4 py-2.5 active:scale-95 transition-all outline-none">
          <span className="material-symbols-outlined">security</span>
          <span className="text-[10px] font-medium mt-1">Safety</span>
        </Link>
        <Link href="/web" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 px-4 py-2.5 active:scale-95 transition-all outline-none">
          <span className="material-symbols-outlined">language</span>
          <span className="text-[10px] font-medium mt-1">Web</span>
        </Link>
        <div className="flex flex-col items-center justify-center bg-gray-100 text-gray-900 rounded-2xl px-5 py-2.5 active:scale-95 transition-all outline-none shadow-sm">
          <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          <span className="text-[10px] font-bold mt-1">Finance</span>
        </div>
        <Link href="/map" className="flex flex-col items-center justify-center text-gray-400 hover:text-gray-900 px-4 py-2.5 active:scale-95 transition-all outline-none">
          <span className="material-symbols-outlined">map</span>
          <span className="text-[10px] font-medium mt-1">Map</span>
        </Link>
      </nav>
    </div>
  );
}
