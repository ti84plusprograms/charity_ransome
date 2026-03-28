import { act } from "react";
import { useSessionStore } from "@/lib/state";

// Reset Zustand store state between tests.
beforeEach(() => {
  useSessionStore.setState({
    ironyScore: 0,
    userName: "",
    userEmail: "",
    emergencyContactEmail: "",
    emergencyContactRelation: "",
    profileVideoUrl: null,
    onboardingComplete: false,
    selectedCharity: null,
    discoveredCharities: [],
    visitedCharityIds: [],
    isSearching: false,
    heroShotUrl: null,
    shameMemeDataUrl: null,
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
      const charity = {
        id: "c-1",
        name: "Test Shelter",
        address: "123 Main St",
        city: "Boston",
        state: "MA",
        zip: "02110",
        category: "Community Service",
        rating: 4.9,
        reviewCount: 10,
        compliancePriority: 90,
        openRoles: 3,
        mission: "Helping people",
        description: "Test description",
        whatTheyDo: "Test what they do",
        whyThisMattersNow: "Test why it matters",
        currentNeeds: ["Volunteers"],
        latestReviewer: "Desk",
        latestNote: "Need coverage",
        accentFrom: "#000000",
        accentTo: "#ffffff",
      };
      act(() => useSessionStore.getState().setSelectedCharity(charity));
      expect(useSessionStore.getState().selectedCharity).toEqual(charity);
    });

    it("accepts null to deselect", () => {
      act(() => {
        // @ts-expect-error partial mock for testing
        useSessionStore.getState().setSelectedCharity({ id: "c-1", name: "x", city: "y" });
        useSessionStore.getState().setSelectedCharity(null);
      });
      expect(useSessionStore.getState().selectedCharity).toBeNull();
    });
  });

  describe("setOnboardingProfile", () => {
    it("stores onboarding profile fields and marks onboarding complete", () => {
      act(() =>
        useSessionStore.getState().setOnboardingProfile({
          userName: "Alice",
          userEmail: "alice@example.com",
          emergencyContactEmail: "bob@example.com",
          emergencyContactRelation: "Friend",
          profileVideoUrl: "blob:video-url",
        }),
      );

      const state = useSessionStore.getState();
      expect(state.userName).toBe("Alice");
      expect(state.userEmail).toBe("alice@example.com");
      expect(state.emergencyContactEmail).toBe("bob@example.com");
      expect(state.emergencyContactRelation).toBe("Friend");
      expect(state.profileVideoUrl).toBe("blob:video-url");
      expect(state.onboardingComplete).toBe(true);
    });
  });
});
