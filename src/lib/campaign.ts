import {
  buildNonProfitAddress,
  getUrgencyLabel,
  type NonProfitProfile,
} from "@/lib/nonprofits";

export interface NonprofitContext {
  id: string;
  name: string;
  category: string;
  mission: string;
  description: string;
  whatTheyDo: string;
  whyThisMattersNow: string;
  urgency: string;
  urgencyScore: number;
  currentNeeds: string[];
  city: string;
  address: string;
  website?: string;
  rating: number;
  reviews: number;
  volunteerSlots: number;
  complianceScore: number;
  latestNote: string;
  phoneNumber?: string;
  editorialSummary?: string;
  openingHours?: string[];
  mapsUrl?: string;
}

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

export interface ScenePlan {
  sceneNumber: number;
  durationSeconds: number;
  purpose: string;
  voiceover: string;
  onscreenText: string;
  visualPrompt: string;
  transitionNote: string;
}

export interface CampaignVideoPlan {
  campaignTitle: string;
  tone: string;
  targetAudience: string;
  callToAction: string;
  totalDurationSeconds: number;
  visualStyle?: string;
  scenes: ScenePlan[];
}

export type ActiveVideoRenderMode = "single_clip" | "multi_scene";
export type VideoRenderMode = ActiveVideoRenderMode | "fallback";

export type VideoJobInternalStatus =
  | "initializing"
  | "planning"
  | "create_request_sent"
  | "waiting_for_operation_id"
  | "polling_provider"
  | "provider_completed"
  | "downloading_asset"
  | "stitching"
  | "completed"
  | "failed_init"
  | "failed_provider"
  | "failed_quota"
  | "timed_out";

export interface VideoProviderResponseSnapshot {
  receivedAt?: string;
  httpStatus?: number;
  operationId?: string;
  providerStatus?: string;
  done?: boolean;
  responseVideoCount?: number;
  error?: {
    code?: string;
    status?: string;
    message?: string;
  };
}

export interface VideoJobDebugInfo {
  requestedMode: ActiveVideoRenderMode;
  effectiveMode?: ActiveVideoRenderMode;
  fallbackTriggered: boolean;
  stitchingRequired?: boolean;
  ffmpegAvailable?: boolean;
  ffmpegReason?: string;
  currentSceneNumber?: number;
  providerPollAttempts?: number;
  lastMeaningfulProgressAt?: string;
  lastProviderCheckAt?: string;
  latestProviderEvent?: string;
  rawProviderState?: string;
  fallbackReason?: string;
  requestedInEnvironment?: string;
  createRequestedAt?: string;
  createRequestStatusCode?: number;
  createResponseReceivedAt?: string;
  lastPollTimestamp?: string;
  lastPollStatusCode?: number;
  retryCount?: number;
  nextRetryAt?: string;
  quotaError?: boolean;
  lastHttpStatus?: number;
  lastProviderErrorCode?: string;
  lastProviderErrorStatus?: string;
  terminalFailureReason?: string;
  rawCreateResponse?: VideoProviderResponseSnapshot;
  rawPollResponse?: VideoProviderResponseSnapshot;
}

export interface VideoJobStatus {
  jobId: string;
  status: VideoJobInternalStatus | "fallback";
  completed: boolean;
  internalStatus: VideoJobInternalStatus;
  progressPercent: number;
  currentStep: string;
  mode: VideoRenderMode;
  createdAt: string;
  updatedAt: string;
  providerName: string;
  providerOperationId?: string;
  providerStatus?: string;
  scenesCompleted: number;
  totalScenes: number;
  finalVideoUrl?: string;
  rawClipUrls?: string[];
  fallbackStoryboard?: CampaignVideoOutput;
  errorMessage?: string;
  debugInfo?: VideoJobDebugInfo;
  plan?: CampaignVideoPlan;
}

export interface CampaignGenerationRequest {
  nonprofitId: string;
  nonprofitContext: NonprofitContext;
  userPrompt?: string;
}

export interface VideoGenerationRequest {
  nonprofitId: string;
  nonprofitContext: NonprofitContext;
  optionalPrompt?: string;
  preferredMode?: ActiveVideoRenderMode;
}

export function buildNonprofitContext(nonProfit: NonProfitProfile): NonprofitContext {
  return {
    id: nonProfit.id,
    name: nonProfit.name,
    category: nonProfit.category,
    mission: nonProfit.mission,
    description: nonProfit.description,
    whatTheyDo: nonProfit.whatTheyDo,
    whyThisMattersNow: nonProfit.whyThisMattersNow,
    urgency: getUrgencyLabel(nonProfit.compliancePriority),
    urgencyScore: nonProfit.compliancePriority,
    currentNeeds: nonProfit.currentNeeds,
    city: nonProfit.city,
    address: buildNonProfitAddress(nonProfit),
    website: nonProfit.website,
    rating: nonProfit.rating,
    reviews: nonProfit.reviewCount,
    volunteerSlots: nonProfit.openRoles,
    complianceScore: nonProfit.compliancePriority,
    latestNote: nonProfit.latestNote,
    phoneNumber: nonProfit.phoneNumber,
    editorialSummary: nonProfit.editorialSummary,
    openingHours: nonProfit.openingHours,
    mapsUrl: nonProfit.mapsUrl,
  };
}
