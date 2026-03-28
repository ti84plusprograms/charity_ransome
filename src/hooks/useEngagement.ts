"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/lib/state";
import { getCoachMessage, getTabReturnMessage } from "@/agents/coach";

interface UseEngagementOptions {
  onTabHidden?: (message: string, emoji: string, link?: string) => void;
  onTabVisible?: (message: string) => void;
  onExitIntent?: (message: string, link?: string) => void;
}

export function useEngagement(options: UseEngagementOptions = {}) {
  // Use getState() in callbacks to always read the LATEST value, avoiding stale closure bugs
  const store = useSessionStore;
  const { incrementTabSwitchCount } = useSessionStore();
  const wasHiddenRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const fetchAiShame = useCallback(async (event: "exit_intent" | "tab_switch") => {
    const { selectedCharity, visitedCharityIds, tabSwitchCount, emergencyContactEmail, userName } = store.getState();
    try {
      const resp = await fetch("/api/coach/shame", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentCharity: selectedCharity,
          visitedCharityIds,
          event,
          tabSwitchCount,
          emergencyContact: emergencyContactEmail,
          userName,
        })
      });
      const { message } = await resp.json();
      return message as string;
    } catch {
      return null;
    }
  }, [store]);

  const handleVisibilityChange = useCallback(() => {
    const { selectedCharity, tabSwitchCount } = store.getState();
    if (document.hidden) {
      wasHiddenRef.current = true;
      incrementTabSwitchCount();
      const newCount = tabSwitchCount + 1;

      const coachMsg = getCoachMessage(selectedCharity, newCount);
      optionsRef.current.onTabHidden?.(coachMsg.message, coachMsg.emoji, coachMsg.link);

      // Try to upgrade with AI message
      fetchAiShame("tab_switch").then(aiMsg => {
        if (aiMsg) {
          optionsRef.current.onTabHidden?.(aiMsg, coachMsg.emoji, coachMsg.link);
        }
      });
    } else if (wasHiddenRef.current) {
      wasHiddenRef.current = false;
      const returnMsg = getTabReturnMessage(selectedCharity);
      optionsRef.current.onTabVisible?.(returnMsg);
    }
  }, [incrementTabSwitchCount, store, fetchAiShame]);

  const handleMouseOut = useCallback((e: MouseEvent) => {
    if (e.clientY <= 10 && !e.relatedTarget) {
      const { selectedCharity, tabSwitchCount } = store.getState();
      const coachMsg = getCoachMessage(selectedCharity, tabSwitchCount);
      optionsRef.current.onExitIntent?.(coachMsg.message, coachMsg.link);

      fetchAiShame("exit_intent").then(aiMsg => {
        if (aiMsg) {
          optionsRef.current.onExitIntent?.(aiMsg, coachMsg.link);
        }
      });
    }
  }, [store, fetchAiShame]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("mouseout", handleMouseOut);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("mouseout", handleMouseOut);
    };
  }, [handleVisibilityChange, handleMouseOut]);
}
