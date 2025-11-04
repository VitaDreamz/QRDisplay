'use client';

import { useState } from 'react';

export function SupportBubble() {
  const [showMenu, setShowMenu] = useState(false);
  
  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Support menu */}
      {showMenu && (
        <div className="absolute bottom-full right-0 mb-3 bg-white rounded-lg shadow-xl border border-gray-200 w-64 overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white">
            <div className="font-semibold">Need Help?</div>
            <div className="text-xs opacity-90">We're here to support you</div>
          </div>
          
          <div className="divide-y">
            <button
              onClick={() => {
                // Open Tidio chat if available
                if (typeof window !== 'undefined' && (window as any).tidioChatApi) {
                  (window as any).tidioChatApi.open();
                } else {
                  alert('Live chat will be available soon!');
                }
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3"
            >
              <span className="text-2xl">💬</span>
              <div>
                <div className="font-medium text-sm">Live Chat</div>
                <div className="text-xs text-gray-500">Chat with support now</div>
              </div>
            </button>
            
            <a
              href="tel:+18005551234"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 block"
              onClick={() => setShowMenu(false)}
            >
              <span className="text-2xl">📞</span>
              <div>
                <div className="font-medium text-sm">Call Us</div>
                <div className="text-xs text-gray-500">(800) 555-1234</div>
              </div>
            </a>
            
            <a
              href="sms:+18005551234?body=Hi! I need help setting up my QRDisplay"
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 block"
              onClick={() => setShowMenu(false)}
            >
              <span className="text-2xl">📱</span>
              <div>
                <div className="font-medium text-sm">Text Us</div>
                <div className="text-xs text-gray-500">We'll respond quickly</div>
              </div>
            </a>
          </div>
        </div>
      )}
      
      {/* Chat bubble button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="w-14 h-14 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-2xl hover:scale-110"
        aria-label="Support chat"
      >
        💬
      </button>
    </div>
  );
}
