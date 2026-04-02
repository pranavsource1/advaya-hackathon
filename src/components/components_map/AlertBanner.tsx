import React, { useEffect, useState } from 'react';

interface AlertBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export default function AlertBanner({ isVisible, onDismiss }: AlertBannerProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, onDismiss]);

  if (!isVisible && !show) return null;

  return (
    <div className="fixed inset-x-0 top-0 z-[100] px-4 pt-16 pointer-events-none flex justify-center">
      <div 
        className={`w-full max-w-sm rounded-2xl shadow-2xl p-4 flex items-center gap-4 bg-gradient-to-r from-red-600 to-red-500 text-white pointer-events-auto
          transition-all duration-500 ease-out transform
          ${show ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
      >
        <div className="flex-shrink-0 bg-white/20 p-2 rounded-full">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        
        <div className="flex-1">
          <h3 className="font-bold text-lg">Alert!</h3>
          <p className="text-red-50 text-sm">You have exited the safe zone.</p>
        </div>
        
        <button 
          onClick={() => setShow(false)}
          className="p-2 rounded-full hover:bg-white/10 transition-colors focus:ring-2 focus:ring-white/50 w-10 h-10 flex items-center justify-center"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

