'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { FinanceTransaction } from '../types';

const STORAGE_KEY = 'geofence_guardian_finance';

/**
 * FinanceSummary — exportable summary card for the Finance page.
 * Reads from the same localStorage key as the full Finance page,
 * so data is always in sync. No props needed.
 */
export default function FinanceSummary() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setTransactions(JSON.parse(stored));
      } catch {
        setTransactions([]);
      }
    }
  }, []);

  const { income, expense } = useMemo(() => {
    return transactions.reduce(
      (acc, t) => {
        if (t.type === 'income') acc.income += t.amount;
        else acc.expense += t.amount;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const balance = income - expense;
  const recent = transactions.slice(0, 3);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
            <span className="text-blue-600 font-black text-sm">₹</span>
          </div>
          <h2 className="text-base font-bold text-gray-800">Finance</h2>
        </div>
        <a
          href="/finance"
          className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
        >
          View All →
        </a>
      </div>

      {/* Balance */}
      <div className="px-5 pb-3">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-0.5">
          Balance
        </p>
        <p
          className={`text-3xl font-black ${
            balance >= 0 ? 'text-blue-600' : 'text-red-500'
          }`}
        >
          ₹{balance.toLocaleString('en-IN')}
        </p>
      </div>

      {/* Income / Expense row */}
      <div className="grid grid-cols-2 gap-px bg-gray-100 border-t border-b border-gray-100">
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest mb-0.5">
            Income
          </p>
          <p className="text-sm font-bold text-gray-800">
            ₹{income.toLocaleString('en-IN')}
          </p>
        </div>
        <div className="bg-white px-5 py-3">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-0.5">
            Expenses
          </p>
          <p className="text-sm font-bold text-gray-800">
            ₹{expense.toLocaleString('en-IN')}
          </p>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="px-5 pt-3 pb-5">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
          Recent
        </p>
        {recent.length === 0 ? (
          <p className="text-xs text-gray-400 py-2 text-center">
            No transactions yet
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      t.type === 'income'
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-500'
                    }`}
                  >
                    {t.type === 'income' ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 12H4" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-800 leading-none">
                      {t.category}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(t.date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-xs font-black ${
                    t.type === 'income' ? 'text-green-600' : 'text-red-500'
                  }`}
                >
                  {t.type === 'income' ? '+' : '-'}₹
                  {t.amount.toLocaleString('en-IN')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
