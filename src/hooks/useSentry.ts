import { useEffect } from "react";
import { useSessionStore } from "@/lib/state";

export const useSentry = () => {
  const { incrementTabSwitchCount, userName } = useSessionStore();

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        console.log("Sentry detected tab abandonment.");
        incrementTabSwitchCount();
        
        // Browser notification if permitted
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("🚨 TRUANCY DETECTED", {
            body: `${userName || "User"}, the puppies are still waiting. Don't be a coward.`,
            icon: "/favicon.ico",
          });
        }
      }
    };

    const handleMouseLeave = (e: MouseEvent) => {
      // If the mouse leaves the top of the viewport (heading for tabs/close button)
      if (e.clientY <= 0) {
        console.log("Sentry detected exit intent.");
        // You can trigger a modal or roast here
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [incrementTabSwitchCount, userName]);
};