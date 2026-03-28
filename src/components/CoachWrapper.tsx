"use client";

import { useState, useRef, useEffect } from "react";
import { useEngagement } from "@/hooks/useEngagement";

interface CoachNotification {
  message: string;
  emoji: string;
  type: "warning" | "welcome";
}

export function CoachWrapper({ children }: { children: React.ReactNode }) {
  const [notification, setNotification] = useState<CoachNotification | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    onTabHidden: (message, emoji) => {
      setNotification({ message, emoji, type: "warning" });
      scheduleNotificationClear(5000);
    },
    onTabVisible: (message) => {
      setNotification({ message, emoji: "👋", type: "welcome" });
      scheduleNotificationClear(3000);
    },
  });

  return (
    <>
      {children}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm p-4 rounded-xl shadow-2xl border transition-all duration-300 ${
            notification.type === "warning"
              ? "bg-orange-900 border-orange-500 text-orange-100"
              : "bg-green-900 border-green-500 text-green-100"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{notification.emoji}</span>
            <div>
              <p className="font-bold text-sm">
                {notification.type === "warning" ? "Hey! The Coach noticed..." : "Welcome Back!"}
              </p>
              <p className="text-sm mt-1">{notification.message}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
