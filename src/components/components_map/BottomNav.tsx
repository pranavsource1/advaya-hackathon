'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    {
      label: 'Map',
      path: '/map',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
      ),
    },
    {
      label: 'Finance',
      path: '/finance',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-white/90 backdrop-blur-2xl border border-white/40 flex justify-around items-center px-6 py-3 rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] w-[90%] max-w-sm">
      {navItems.map((item) => {
        const isActive = pathname?.startsWith(item.path);
        return (
          <Link
            key={item.path}
            href={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-300 ${
              isActive ? 'text-gray-900 scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <div className={`p-2 rounded-full transition-all duration-300 ${isActive ? 'bg-gray-100 shadow-sm' : 'bg-transparent'}`}>
              {item.icon}
            </div>
            <span className={`text-[10px] font-bold ${isActive ? 'opacity-100 text-gray-900' : 'opacity-0 h-0 overflow-hidden'}`}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
