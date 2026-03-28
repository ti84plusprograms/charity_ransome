import { act } from "react";
import { useSessionStore } from "@/lib/state";

// Reset Zustand store state between tests.
beforeEach(() => {
  useSessionStore.setState({
    ironyScore: 0,
    userName: "",
    selectedCharity: null,
    heroShotUrl: null,
    generatedAdUrl: null,
    recommendationLetter: null,
    tabSwitchCount: 0,
  });
});

describe("useSessionStore", () => {
  describe("setUserName", () => {
    it("stores the provided user name", () => {
      act(() => useSessionStore.getState().setUserName("Alice"));
      expect(useSessionStore.getState().userName).toBe("Alice");
    });
  });

  describe("incrementIronyScore", () => {
    it("increases ironyScore by the default amount (10)", () => {
      act(() => useSessionStore.getState().incrementIronyScore());
      expect(useSessionStore.getState().ironyScore).toBe(10);
    });

    it("increases ironyScore by a custom amount", () => {
      act(() => useSessionStore.getState().incrementIronyScore(25));
      expect(useSessionStore.getState().ironyScore).toBe(25);
    });

    it("caps ironyScore at 100", () => {
      act(() => {
        useSessionStore.getState().incrementIronyScore(60);
        useSessionStore.getState().incrementIronyScore(60);
      });
      expect(useSessionStore.getState().ironyScore).toBe(100);
    });
  });

  describe("incrementTabSwitchCount", () => {
    it("increments tabSwitchCount by 1", () => {
      act(() => useSessionStore.getState().incrementTabSwitchCount());
      expect(useSessionStore.getState().tabSwitchCount).toBe(1);
    });

    it("adds 5 to ironyScore each time", () => {
      act(() => {
        useSessionStore.getState().incrementTabSwitchCount();
        useSessionStore.getState().incrementTabSwitchCount();
      });
      expect(useSessionStore.getState().ironyScore).toBe(10);
    });
  });

  describe("setSelectedCharity", () => {
    it("stores a charity object", () => {
      const charity = { id: "c-1", name: "Test Shelter", city: "Boston" };
      act(() => useSessionStore.getState().setSelectedCharity(charity));
      expect(useSessionStore.getState().selectedCharity).toEqual(charity);
    });

    it("accepts null to deselect", () => {
      act(() => {
        useSessionStore.getState().setSelectedCharity({ id: "c-1", name: "x", city: "y" });
        useSessionStore.getState().setSelectedCharity(null);
      });
      expect(useSessionStore.getState().selectedCharity).toBeNull();
    });
  });

  describe("setRecommendationLetter", () => {
    it("stores the letter text", () => {
      act(() => useSessionStore.getState().setRecommendationLetter("Dear Friend,"));
      expect(useSessionStore.getState().recommendationLetter).toBe("Dear Friend,");
    });
  });
});
