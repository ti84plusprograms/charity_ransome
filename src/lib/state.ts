import { create } from "zustand";
import type { NonProfitProfile } from "@/lib/nonprofits";

export interface SessionState {
  ironyScore: number;
  userName: string;
  userEmail: string;
  emergencyContactEmail: string;
  emergencyContactRelation: string;
  profileVideoUrl: string | null;
  onboardingComplete: boolean;
  selectedCharity: NonProfitProfile | null;
  discoveredCharities: NonProfitProfile[];
  visitedCharityIds: string[];
  isSearching: boolean;
  heroShotUrl: string | null;
  shameMemeDataUrl: string | null;
  tabSwitchCount: number;

  // Actions
  incrementIronyScore: (amount?: number) => void;
  setUserName: (name: string) => void;
  setOnboardingProfile: (profile: {
    userName: string;
    userEmail: string;
    emergencyContactEmail: string;
    emergencyContactRelation: string;
    profileVideoUrl: string;
  }) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setSelectedCharity: (charity: NonProfitProfile | null) => void;
  addVisitedCharity: (id: string) => void;
  setDiscoveredCharities: (charities: NonProfitProfile[]) => void;
  setIsSearching: (status: boolean) => void;
  setHeroShotUrl: (url: string) => void;
  setShameMemeDataUrl: (url: string | null) => void;
  incrementTabSwitchCount: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
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

  incrementIronyScore: (amount = 10) =>
    set((state) => ({ ironyScore: Math.min(100, state.ironyScore + amount) })),
  setUserName: (name) => set({ userName: name }),
  setOnboardingProfile: (profile) =>
    set({
      userName: profile.userName,
      userEmail: profile.userEmail,
      emergencyContactEmail: profile.emergencyContactEmail,
      emergencyContactRelation: profile.emergencyContactRelation,
      profileVideoUrl: profile.profileVideoUrl,
      onboardingComplete: true,
    }),
  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
  setSelectedCharity: (charity) => {
    set({ selectedCharity: charity });
    if (charity) {
      set((state) => ({
        visitedCharityIds: Array.from(new Set([...state.visitedCharityIds, charity.id]))
      }));
    }
  },
  addVisitedCharity: (id) => set((state) => ({
    visitedCharityIds: Array.from(new Set([...state.visitedCharityIds, id]))
  })),
  setDiscoveredCharities: (charities) => set({ discoveredCharities: charities }),
  setIsSearching: (status) => set({ isSearching: status }),
  setHeroShotUrl: (url) => set({ heroShotUrl: url }),
  setShameMemeDataUrl: (url) => set({ shameMemeDataUrl: url }),
  incrementTabSwitchCount: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
      ironyScore: Math.min(100, state.ironyScore + 5),
    })),
}));
