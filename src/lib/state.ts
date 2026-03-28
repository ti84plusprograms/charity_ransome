import { create } from "zustand";

export interface SessionState {
  ironyScore: number;
  userName: string;
  selectedCharity: {
    id: string;
    name: string;
    city: string;
  } | null;
  heroShotUrl: string | null;
  generatedAdUrl: string | null;
  recommendationLetter: string | null;
  tabSwitchCount: number;
  
  // Actions
  incrementIronyScore: (amount?: number) => void;
  setUserName: (name: string) => void;
  setSelectedCharity: (charity: SessionState["selectedCharity"]) => void;
  setHeroShotUrl: (url: string) => void;
  setGeneratedAdUrl: (url: string) => void;
  setRecommendationLetter: (letter: string) => void;
  incrementTabSwitchCount: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  ironyScore: 0,
  userName: "",
  selectedCharity: null,
  heroShotUrl: null,
  generatedAdUrl: null,
  recommendationLetter: null,
  tabSwitchCount: 0,
  
  incrementIronyScore: (amount = 10) =>
    set((state) => ({ ironyScore: Math.min(100, state.ironyScore + amount) })),
  setUserName: (name) => set({ userName: name }),
  setSelectedCharity: (charity) => set({ selectedCharity: charity }),
  setHeroShotUrl: (url) => set({ heroShotUrl: url }),
  setGeneratedAdUrl: (url) => set({ generatedAdUrl: url }),
  setRecommendationLetter: (letter) => set({ recommendationLetter: letter }),
  incrementTabSwitchCount: () =>
    set((state) => ({
      tabSwitchCount: state.tabSwitchCount + 1,
      ironyScore: Math.min(100, state.ironyScore + 5),
    })),
}));
