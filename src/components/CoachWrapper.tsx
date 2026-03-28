"use client";

import { useState, useRef, useEffect } from "react";
import { useEngagement } from "@/hooks/useEngagement";
import { useSessionStore } from "@/lib/state";
import Link from "next/link";

interface CoachNotification {
  message: string;
  emoji: string;
  type: "warning" | "status";
  link?: string;
  isEscalated?: boolean;
}

export function CoachWrapper({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<CoachNotification | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { tabSwitchCount, emergencyContactEmail, userName, shameMemeDataUrl } = useSessionStore();

  const scheduleNotificationClear = (delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setNotification(null), delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEngagement({
    onTabHidden: (message, emoji, link) => {
      const { tabSwitchCount } = useSessionStore.getState();
      setNotification({ message, emoji, type: "warning", link, isEscalated: tabSwitchCount >= 3 });
      scheduleNotificationClear(15000);
    },
    onTabVisible: () => {
      setNotification(null);
    },
    onExitIntent: (message, link) => {
      const { tabSwitchCount } = useSessionStore.getState();
      setNotification({ message, emoji: "📧", type: "warning", link, isEscalated: tabSwitchCount >= 3 });
      scheduleNotificationClear(20000);
    },
  });

  return (
    <>
      <div className={notification && notification.type === "warning" ? "blur-md pointer-events-none transition-all duration-700" : "transition-all duration-700"}>
        {children}
      </div>
      
      {notification && notification.type === "warning" && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl animate-in fade-in duration-700 px-6">
          
          {notification.isEscalated ? (
            /* ESCALATED: THE LETTER ADDRESSED TO CONTACT */
            <div className="relative w-full max-w-2xl bg-[#f8f5ea] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-t-[12px] border-red-900 p-12 animate-in slide-in-from-bottom-24 rotate-[-1deg] duration-500">
               {/* Stamp/Seal Effect */}
               <div className="absolute top-12 right-12 rotate-[12deg] border-4 border-red-700/40 p-5 rounded-xl text-red-700/40 font-black uppercase text-2xl leading-none">
                Certified<br />Shame
               </div>
               
               <div className="space-y-8">
                  {/* Address Header */}
                  <div className="flex justify-between items-start font-serif">
                    <div className="space-y-4">
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">To: Emergency Contact</div>
                      <div className="text-xl font-bold text-slate-900 underline decoration-red-900/40 underline-offset-4">
                        {emergencyContactEmail || "ANONYMOUS_CONTACT@VOLUNTEER.EDU"}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono tracking-tighter">
                      <p>DOCKET: #HP-449-LOG</p>
                      <p>DATE: {new Date().toLocaleDateString()}</p>
                      <p className="text-red-700 font-bold">STATUS: DISPATCH_PENDING</p>
                    </div>
                  </div>

                  <div className="h-0.5 w-full bg-slate-200" />

                  {/* Body Content */}
                  <div className="font-serif text-slate-800 space-y-6 text-lg leading-relaxed">
                    <p>Subject: **NOTICED BEHAVIORAL DEFICIT** of ${userName || "Subject Zero"}</p>
                    
                    <p className="text-base text-slate-700">The Sentry has generated the following audit report for your review:</p>
                    
                    <div className="bg-white/60 p-8 border border-slate-200 shadow-inner italic text-slate-900 font-medium quote">
                      "{notification.message}"
                    </div>

                    {shameMemeDataUrl && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">📎 Exhibit A — Photographic Evidence</p>
                        <img
                          src={shameMemeDataUrl}
                          alt="Shame meme evidence"
                          className="w-full rounded border border-slate-300 shadow-md grayscale"
                        />
                      </div>
                    )}

                    <p className="text-base">Due to repeated focus failures, we are now compiling the full compliance history for your records. This serves as a formal notification of their lack of commitment.</p>
                  </div>

                  {/* Actions Bar */}
                  <div className="mt-12 pt-8 border-t-2 border-slate-200 flex flex-col gap-4">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => setNotification(null)}
                        className="w-full bg-red-800 text-white py-6 text-center text-sm font-black uppercase tracking-[0.4em] transition hover:bg-red-700 shadow-xl"
                      >
                        REDEEM & HALT DISPATCH
                      </Link>
                    )}
                    <button 
                      onClick={() => setNotification(null)}
                      className="text-[10px] text-slate-400 uppercase tracking-widest hover:text-red-700 transition"
                    >
                      I accept the social fallout of this neglect
                    </button>
                  </div>
               </div>
               
               {/* Paper edge decorations */}
               <div className="absolute bottom-0 left-0 w-full h-1 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.1)_100%)]" />
            </div>
          ) : (
            /* STANDARD WARNING CARD */
            <div className="w-full max-w-lg overflow-hidden rounded-[40px] border border-red-500/30 bg-white p-0 shadow-[0_0_100px_rgba(239,68,68,0.2)] animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-red-50 text-5xl shadow-inner mb-8">
                  {notification.emoji}
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-red-500">
                    Commitment Alert
                  </p>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight">
                    INTENTIONAL NEGLECT
                  </h2>
                  <p className="text-lg leading-8 text-slate-600 font-medium">
                    {notification.message}
                  </p>
                </div>
                <div className="mt-10 flex flex-col gap-4">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      onClick={() => setNotification(null)}
                      className="w-full rounded-3xl bg-red-600 py-6 text-lg font-black uppercase tracking-widest text-white transition-all hover:bg-red-700"
                    >
                      RETURN TO MISSION
                    </Link>
                  )}
                </div>
              </div>
              <div className="h-2 w-full bg-red-100">
                <div className="h-full bg-red-600 animate-progress" style={{ animationDuration: '15s' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
