import { create } from "zustand";

export interface SessionState {
  ironyScore: number;
  userName: string;
  userEmail: string;
  emergencyContactEmail: string;
  emergencyContactRelation: string;
  profileVideoUrl: string | null;
  onboardingComplete: boolean;
  selectedCharity: {
    id: string;
    name: string;
    city: string;
  } | null;
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
  setSelectedCharity: (charity: SessionState["selectedCharity"]) => void;
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
  setHeroShotUrl: (url) => set({ heroShotUrl: url }),
  incrementTabSwitchCount: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
      ironyScore: Math.min(100, state.ironyScore + 5),
    })),
}));
