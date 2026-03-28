import type { NonProfitProfile } from "@/lib/nonprofits";

export interface CampaignScene {
  scene: number;
  visual: string;
  voiceover: string;
  onscreenText: string;
}

export interface CampaignVideoOutput {
  videoTitle: string;
  hookLine: string;
  targetAudience: string;
  concept: string;
  narrationScript: string;
  sceneBreakdown: CampaignScene[];
  onScreenText: string;
  callToAction: string;
  tone: string;
  visualStyle: string;
}

export interface CampaignGenerationRequest {
  nonprofitId: string;
  nonprofitContext: NonProfitProfile;
  userPrompt?: string;
}
