import { create } from "zustand";

export interface NonProfit {
  id: string;
  name: string;
  address: string;
  city: string;
  rating?: number;
  phoneNumber?: string;
  website?: string;
  description?: string;
  urgencyScore?: number;
}

export interface SessionState {
  ironyScore: number;
  userName: string;
  userEmail: string;
  emergencyContactEmail: string;
  emergencyContactRelation: string;
  profileVideoUrl: string | null;
  onboardingComplete: boolean;
  selectedCharity: NonProfit | null;
  discoveredCharities: NonProfit[];
  isSearching: boolean;
  heroShotUrl: string | null;
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
  setSelectedCharity: (charity: NonProfit | null) => void;
  setDiscoveredCharities: (charities: NonProfit[]) => void;
  setIsSearching: (status: boolean) => void;
  setHeroShotUrl: (url: string) => void;
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
  isSearching: false,
  heroShotUrl: null,
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
  setSelectedCharity: (charity) => set({ selectedCharity: charity }),
  setDiscoveredCharities: (charities) => set({ discoveredCharities: charities }),
  setIsSearching: (status) => set({ isSearching: status }),
  setHeroShotUrl: (url) => set({ heroShotUrl: url }),
  incrementTabSwitchCount: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
      ironyScore: Math.min(100, state.ironyScore + 5),
    })),
}));