"use client";

import { useState, useRef, useEffect } from "react";
import { useEngagement } from "@/hooks/useEngagement";
import { useSessionStore } from "@/lib/state";
import { featuredNonProfits } from "@/lib/nonprofits";
import Link from "next/link";

interface CoachNotification {
  message: string;
  emoji: string;
  type: "warning" | "status";
  link?: string;
  isEscalated?: boolean;
}

type DispatchStatus = "idle" | "drafting" | "sending" | "confirmed" | "error";

export function CoachWrapper({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<CoachNotification | null>(null);
  const [dispatchStatus, setDispatchStatus] = useState<DispatchStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { 
    emergencyContactEmail, 
    emergencyContactRelation,
    userName, 
    shameMemeDataUrl, 
    selectedCharity, 
    visitedCharityIds,
    ironyScore 
  } = useSessionStore();

  const scheduleNotificationClear = (delay: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setNotification(null), delay);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleAcceptFallout = async () => {
    if (dispatchStatus !== "idle") return;
    
    setDispatchStatus("drafting");

    const contact = { 
      name: "Emergency Contact", 
      email: emergencyContactEmail || "delivered@resend.dev", 
      relation: emergencyContactRelation || "emergency contact" 
    };

    // Correctly map IDs to Names for the AI
    const visitedNames = visitedCharityIds.map(id => {
      const found = featuredNonProfits.find(p => p.id === id);
      return found ? found.name : id;
    });
    
    try {
      const draftRes = await fetch("/api/shoutout/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "email",
          userName: userName || "Subject Zero",
          charityName: selectedCharity?.name || "a local given charity",
          contact,
          visitedCharityNames: visitedNames,
          ironyScore
        })
      });

      if (!draftRes.ok) throw new Error("Drafting failed");
      const { message } = await draftRes.json();
      
      setDispatchStatus("sending");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Animation buffer

      const sendRes = await fetch("/api/shoutout/send", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           contactEmail: emergencyContactEmail || "delivered@resend.dev",
           emailBody: message,
           memeImage: shameMemeDataUrl
         })
      });
      
      const result = await sendRes.json();
      if (result.success) {
        setDispatchStatus("confirmed");
        setTimeout(() => {
          setDispatchStatus("idle");
          setNotification(null);
        }, 3000);
      } else {
        setDispatchStatus("error");
        setTimeout(() => setDispatchStatus("idle"), 3000);
      }
    } catch (e) {
      console.error("Dispatch failure", e);
      setDispatchStatus("error");
      setTimeout(() => setDispatchStatus("idle"), 3000);
    }
  };

  useEngagement({
    onTabHidden: (message, emoji, link) => {
      const { tabSwitchCount } = useSessionStore.getState();
      setNotification({ message, emoji, type: "warning", link, isEscalated: tabSwitchCount >= 3 });
      scheduleNotificationClear(15000);
    },
    onTabVisible: () => {
      if (dispatchStatus === "idle") setNotification(null);
    },
    onExitIntent: (message, link) => {
      const { tabSwitchCount } = useSessionStore.getState();
      setNotification({ message, emoji: "📧", type: "warning", link, isEscalated: tabSwitchCount >= 3 });
      scheduleNotificationClear(20000);
    },
  });

  return (
    <>
      <div className={notification && notification.type === "warning" ? "blur-xl grayscale pointer-events-none transition-all duration-1000" : "transition-all duration-700"}>
        {children}
      </div>
      
      {notification && notification.type === "warning" && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl px-6">
          
          {notification.isEscalated ? (
            <div className="relative w-full max-w-2xl bg-[#f8f5ea] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.8)] border-t-[12px] border-red-900 p-12 transition-all duration-500 overflow-hidden">
               
               {/* Sending Animation Layer */}
               {dispatchStatus !== "idle" && (
                 <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-teal-400 font-mono p-12 text-center animate-in fade-in duration-300">
                    <div className="w-full max-w-md space-y-6">
                      <div className="text-4xl animate-pulse font-black tracking-tighter mb-4">
                        {dispatchStatus === "drafting" && "GENERATING DOSSIER..."}
                        {dispatchStatus === "sending" && "DISPATCHING PAYLOAD..."}
                        {dispatchStatus === "confirmed" && "DISPATCH CONFIRMED"}
                        {dispatchStatus === "error" && "UPLINK ERROR"}
                      </div>
                      
                      <div className="h-2 w-full bg-teal-900/30 rounded-full overflow-hidden">
                        <div className={`h-full bg-teal-400 transition-all duration-1000 ${
                          dispatchStatus === "drafting" ? "w-1/3" : 
                          dispatchStatus === "sending" ? "w-2/3" : 
                          dispatchStatus === "confirmed" ? "w-full" : "w-0"
                        }`} />
                      </div>

                      <div className="text-left text-xs space-y-2 opacity-60">
                        <p>{`> [SENTRY] SUBJECT: ${userName || "Unknown"}`}</p>
                        <p>{`> [SENTRY] TARGET: ${emergencyContactEmail || "Verifying..."}`}</p>
                        <p>{`> [SENTRY] EVIDENCE_SCAN: MEME_PAYLOAD_ATTACHED`}</p>
                        <p className="animate-pulse">{`> [SENTRY] ${dispatchStatus.toUpperCase()} PROTOCOL...`}</p>
                      </div>

                      {dispatchStatus === "confirmed" && (
                        <div className="pt-6 text-white text-lg font-bold">
                          The social fallout is imminent.
                        </div>
                      )}
                    </div>
                 </div>
               )}

               {/* Stamp/Seal Effect */}
               <div className="absolute top-12 right-12 rotate-[12deg] border-4 border-red-700/40 p-5 rounded-xl text-red-700/40 font-black uppercase text-2xl leading-none select-none">
                Certified<br />Shame
               </div>
               
               <div className="space-y-8">
                  <div className="flex justify-between items-start font-serif">
                    <div className="space-y-4">
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">To: Emergency Contact</div>
                      <div className="text-xl font-bold text-slate-900 underline decoration-red-900/40 underline-offset-4">
                        {emergencyContactEmail || "UNVERIFIED_ACCOUNTABILITY_NODE"}
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono tracking-tighter">
                      <p>DOCKET: #HP-{Math.floor(Math.random() * 999)}-LOG</p>
                      <p>DATE: {new Date().toLocaleDateString()}</p>
                      <p className="text-red-700 font-bold">STATUS: DISPATCH_PENDING</p>
                    </div>
                  </div>

                  <div className="h-0.5 w-full bg-slate-200" />

                  <div className="font-serif text-slate-800 space-y-6 text-lg leading-relaxed">
                    <p>Subject: **URGENT COMPLIANCE BREACH** - {userName || "Subject Zero"}</p>
                    
                    <div className="bg-white/60 p-8 border border-slate-200 shadow-inner italic text-slate-900 font-medium quote leading-relaxed">
                      &quot;{notification.message}&quot;
                    </div>

                    {shameMemeDataUrl && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">📎 Exhibit A — Photographic Evidence</p>
                        <img
                          src={shameMemeDataUrl}
                          alt="Shame meme evidence"
                          className="w-full rounded border border-slate-300 shadow-md grayscale contrast-125"
                        />
                      </div>
                    )}

                    <p className="text-base">We are required to inform you that your contact has chosen to abandon their humanitarian duty. This record is being prepared for permanent dispatch.</p>
                  </div>

                  <div className="mt-12 pt-8 border-t-2 border-slate-200 flex flex-col gap-4">
                    {notification.link && (
                      <Link
                        href={notification.link}
                        onClick={() => setNotification(null)}
                        className="w-full bg-red-900 text-white py-6 text-center text-sm font-black uppercase tracking-[0.4em] transition hover:bg-red-800 shadow-xl"
                      >
                        REDEEM & HALT DISPATCH
                      </Link>
                    )}
                    <button 
                      onClick={handleAcceptFallout}
                      className="group flex items-center justify-center gap-2 py-4 text-[10px] text-slate-400 uppercase tracking-widest hover:text-red-700 transition"
                    >
                      <span className="w-8 h-[1px] bg-slate-200 group-hover:bg-red-700" />
                      I accept the social fallout of this neglect
                      <span className="w-8 h-[1px] bg-slate-200 group-hover:bg-red-700" />
                    </button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="w-full max-w-lg overflow-hidden rounded-[40px] border border-red-500/30 bg-white p-0 shadow-[0_0_100px_rgba(239,68,68,0.3)] animate-in zoom-in-95 duration-300">
              <div className="p-10 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[32px] bg-red-50 text-5xl shadow-inner mb-8">
                  {notification.emoji}
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-black uppercase tracking-[0.4em] text-red-500">
                    Sentry Warning
                  </p>
                  <h2 className="text-4xl font-black text-slate-900 tracking-tight leading-none">
                    COMMITMENT<br />DEFICIT
                  </h2>
                  <p className="text-lg leading-relaxed text-slate-600 font-medium">
                    {notification.message}
                  </p>
                </div>
                <div className="mt-10 flex flex-col gap-4">
                  {notification.link && (
                    <Link
                      href={notification.link}
                      onClick={() => setNotification(null)}
                      className="w-full rounded-3xl bg-red-600 py-6 text-lg font-black uppercase tracking-widest text-white transition-all hover:bg-red-700 hover:ring-8 hover:ring-red-100"
                    >
                      RETURN TO MISSION
                    </Link>
                  )}
                </div>
              </div>
              <div className="h-2 w-full bg-red-100">
                <div className="h-full bg-red-600 animate-progress" style={{ animationDuration: '15s', width: '100%' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
