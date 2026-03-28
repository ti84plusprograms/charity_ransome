"use client";

import { useState, useEffect } from "react";
import { useEngagement } from "@/hooks/useEngagement";

export function ExitIntentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEngagement({
    onExitIntent: (msg) => {
      setMessage(msg);
      setIsOpen(true);
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-slate-900 border-2 border-red-500 rounded-3xl p-8 max-w-md w-full shadow-[0_0_50px_rgba(239,68,68,0.3)] text-center space-y-6">
        <div className="text-6xl animate-bounce">🚨</div>
        <h2 className="text-3xl font-black text-white">TRUANCY DETECTED!</h2>
        <p className="text-xl text-gray-300 leading-relaxed">
          {message || "The puppies are still waiting. Don't be a coward."}
        </p>
        <div className="pt-4 space-y-3">
          <button
            onClick={() => setIsOpen(false)}
            className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-xl text-lg transition-all transform hover:scale-105 active:scale-95"
          >
            I&apos;LL STAY AND HELP! 😇
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              // In a real trap, we'd maybe prevent closure, but let's be nice for now
            }}
            className="text-gray-500 hover:text-red-400 text-sm font-bold transition-colors"
          >
            I prefer to be a disappointment
          </button>
        </div>
      </div>
    </div>
  );
}
