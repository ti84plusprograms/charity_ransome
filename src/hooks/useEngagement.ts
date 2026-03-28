"use client";

import { useEffect, useRef, useCallback } from "react";
import { useSessionStore } from "@/lib/state";
import { getCoachMessage, getTabReturnMessage } from "@/agents/coach";

interface UseEngagementOptions {
  onTabHidden?: (message: string, emoji: string) => void;
  onTabVisible?: (message: string) => void;
}

export function useEngagement(options: UseEngagementOptions = {}) {
  const { incrementTabSwitchCount, tabSwitchCount } = useSessionStore();
  const wasHiddenRef = useRef(false);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      wasHiddenRef.current = true;
      incrementTabSwitchCount();
      const coachMsg = getCoachMessage();
      optionsRef.current.onTabHidden?.(coachMsg.message, coachMsg.emoji);
    } else if (wasHiddenRef.current) {
      const returnMsg = getTabReturnMessage();
      optionsRef.current.onTabVisible?.(returnMsg);
    }
  }, [incrementTabSwitchCount]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return { tabSwitchCount };
}
