import "server-only";

import type {
  ActiveVideoRenderMode,
  CampaignVideoOutput,
  CampaignVideoPlan,
  NonprofitContext,
  VideoGenerationRequest,
  VideoJobDebugInfo,
  VideoJobInternalStatus,
  VideoJobStatus,
} from "@/lib/campaign";
import {
  buildFallbackCampaignPlan,
  campaignPlanToStoryboard,
  planCampaignVideo,
} from "@/lib/campaign-generator";
import {
  type VeoGenerationError,
  type VeoProgressUpdate,
  generateSceneClip,
  isVideoGenerationConfigured,
  VideoGenerationTimeoutError,
} from "@/lib/veo-video";
import {
  getVideoStitchingCapability,
  stitchSceneClipsToVideo,
} from "@/lib/video-stitcher";

const JOB_TTL_MS = 6 * 60 * 60 * 1000;
const PROVIDER_NAME = "Google Veo 3.1";

type TerminalJobStatus = Extract<
  VideoJobInternalStatus,
  "failed_init" | "failed_provider" | "failed_quota" | "timed_out"
>;

type InternalVideoJob = Omit<VideoJobStatus, "status" | "completed"> & {
  createdAtMs: number;
};

const globalForVideoJobs = globalThis as typeof globalThis & {
  __campaignVideoJobs?: Map<string, InternalVideoJob>;
  __campaignVideoJobRuns?: Map<string, Promise<void>>;
};

// Demo-friendly in-memory job tracking. For multi-instance deployments this
// should move to a durable queue/store so long-running jobs survive restarts.
const videoJobs =
  globalForVideoJobs.__campaignVideoJobs ?? new Map<string, InternalVideoJob>();
const runningJobs =
  globalForVideoJobs.__campaignVideoJobRuns ?? new Map<string, Promise<void>>();

if (!globalForVideoJobs.__campaignVideoJobs) {
  globalForVideoJobs.__campaignVideoJobs = videoJobs;
}

if (!globalForVideoJobs.__campaignVideoJobRuns) {
  globalForVideoJobs.__campaignVideoJobRuns = runningJobs;
}

export function createVideoJob(options?: { requestedMode?: ActiveVideoRenderMode }) {
  cleanupExpiredJobs();

  const requestedMode = options?.requestedMode ?? getDefaultVideoRenderMode();
  const now = new Date();
  const nowIso = now.toISOString();
  const jobId = crypto.randomUUID();
  const job: InternalVideoJob = {
    jobId,
    internalStatus: "initializing",
    progressPercent: 2,
    currentStep: "Initializing AI video render",
    mode: requestedMode,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdAtMs: now.getTime(),
    providerName: PROVIDER_NAME,
    providerStatus: "pending",
    scenesCompleted: 0,
    totalScenes: requestedMode === "single_clip" ? 1 : 4,
    debugInfo: {
      requestedMode,
      effectiveMode: requestedMode,
      fallbackTriggered: false,
      requestedInEnvironment: process.env.NODE_ENV ?? "development",
      lastMeaningfulProgressAt: nowIso,
      latestProviderEvent: "job_created",
    },
  };

  videoJobs.set(jobId, job);
  return toPublicJob(job);
}

export function getVideoJobStatus(jobId: string) {
  cleanupExpiredJobs();

  const job = videoJobs.get(jobId);
  return job ? toPublicJob(job) : null;
}

export function getDefaultVideoRenderMode(): ActiveVideoRenderMode {
  const configuredMode = process.env.CAMPAIGN_VIDEO_MODE;

  if (configuredMode === "single_clip" || configuredMode === "multi_scene") {
    return configuredMode;
  }

  return process.env.NODE_ENV === "development" ? "single_clip" : "multi_scene";
}

export function kickoffVideoGenerationJob(
  jobId: string,
  request: VideoGenerationRequest,
) {
  if (runningJobs.has(jobId)) {
    return;
  }

  const runner = (async () => {
    try {
      await runVideoGenerationJob(jobId, request);
    } catch (error) {
      console.error("[campaign-video] unexpected job failure", error);
      const existingJob = getExistingJob(jobId);

      if (existingJob && existingJob.mode !== "fallback") {
        setTerminalFallbackJob({
          jobId,
          internalStatus: "failed_provider",
          nonprofitContext: request.nonprofitContext,
          optionalPrompt: request.optionalPrompt,
          fallbackStoryboard: existingJob.fallbackStoryboard,
          errorMessage:
            error instanceof Error ? error.message : "Unexpected video job crash.",
          providerStatus: "failed",
          debugInfoPatch: {
            terminalFailureReason:
              error instanceof Error
                ? error.message
                : "Unexpected video job crash.",
          },
        });
      }
    } finally {
      runningJobs.delete(jobId);
    }
  })();

  runningJobs.set(jobId, runner);
}

export async function runVideoGenerationJob(
  jobId: string,
  request: VideoGenerationRequest,
) {
  const existingJob = videoJobs.get(jobId);

  if (!existingJob) {
    return;
  }

  const requestedMode = request.preferredMode ?? getDefaultVideoRenderMode();
  const ffmpegCapability = await getVideoStitchingCapability();
  const effectiveMode =
    requestedMode === "multi_scene" && !ffmpegCapability.available
      ? "single_clip"
      : requestedMode;
  const stitchingRequired = effectiveMode === "multi_scene";
  let fallbackStoryboard: CampaignVideoOutput | undefined;

  try {
    updateJob(jobId, {
      internalStatus: "planning",
      progressPercent: 12,
      currentStep:
        requestedMode === "multi_scene" && !ffmpegCapability.available
          ? "ffmpeg unavailable locally — switching to single-clip proof-of-life mode"
          : "Planning campaign",
      mode: effectiveMode,
      providerStatus: "planning",
      scenesCompleted: 0,
      totalScenes: stitchingRequired ? 4 : 1,
      debugInfo: mergeDebugInfo(existingJob.debugInfo, {
        requestedMode,
        effectiveMode,
        stitchingRequired,
        ffmpegAvailable: ffmpegCapability.available,
        ffmpegReason: ffmpegCapability.available
          ? undefined
          : ffmpegCapability.reason,
        latestProviderEvent: "planning_started",
      }),
    });

    const plan = await planCampaignVideo({
      nonprofitId: request.nonprofitId,
      nonprofitContext: request.nonprofitContext,
      userPrompt: request.optionalPrompt,
    });

    fallbackStoryboard = campaignPlanToStoryboard(
      plan,
      request.nonprofitContext,
      request.optionalPrompt,
    );

    updateJob(jobId, {
      internalStatus: "planning",
      progressPercent: 24,
      currentStep:
        effectiveMode === "single_clip"
          ? "Campaign plan ready — preparing proof-of-life clip"
          : "Campaign plan ready — preparing multi-scene render",
      mode: effectiveMode,
      providerStatus: "planned",
      totalScenes: effectiveMode === "single_clip" ? 1 : plan.scenes.length,
      plan,
      fallbackStoryboard,
      debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
        latestProviderEvent: "plan_ready",
        lastMeaningfulProgressAt: new Date().toISOString(),
      }),
    });

    if (!isVideoGenerationConfigured()) {
      setTerminalFallbackJob({
        jobId,
        internalStatus: "failed_init",
        nonprofitContext: request.nonprofitContext,
        optionalPrompt: request.optionalPrompt,
        fallbackStoryboard,
        errorMessage:
          "GEMINI_API_KEY is not configured, so the studio is showing the storyboard fallback.",
        providerStatus: "config_missing",
        debugInfoPatch: {
          terminalFailureReason: "GEMINI_API_KEY is missing.",
        },
      });
      return;
    }

    if (effectiveMode === "single_clip") {
      await runSingleClipPreview({
        jobId,
        plan,
        nonprofitContext: request.nonprofitContext,
        optionalPrompt: request.optionalPrompt,
        fallbackStoryboard,
        requestedMode,
        ffmpegCapability,
      });
      return;
    }

    await runMultiSceneRender({
      jobId,
      plan,
      nonprofitContext: request.nonprofitContext,
      optionalPrompt: request.optionalPrompt,
      fallbackStoryboard,
      requestedMode,
      ffmpegCapability,
    });
  } catch (error) {
    const normalized = normalizeTerminalError(error);

    setTerminalFallbackJob({
      jobId,
      internalStatus: normalized.internalStatus,
      nonprofitContext: request.nonprofitContext,
      optionalPrompt: request.optionalPrompt,
      fallbackStoryboard,
      errorMessage: normalized.errorMessage,
      providerStatus: normalized.providerStatus,
      providerOperationId: normalized.providerOperationId,
      debugInfoPatch: normalized.debugInfoPatch,
    });
  }
}

async function runSingleClipPreview({
  jobId,
  plan,
  nonprofitContext,
  optionalPrompt,
  fallbackStoryboard,
  requestedMode,
  ffmpegCapability,
}: {
  jobId: string;
  plan: CampaignVideoPlan;
  nonprofitContext: NonprofitContext;
  optionalPrompt?: string;
  fallbackStoryboard?: CampaignVideoOutput;
  requestedMode: ActiveVideoRenderMode;
  ffmpegCapability: Awaited<ReturnType<typeof getVideoStitchingCapability>>;
}) {
  const scene = plan.scenes[0];

  if (!scene) {
    throw new Error("Campaign plan did not include a scene to preview.");
  }

  updateJob(jobId, {
    internalStatus: "create_request_sent",
    progressPercent: 30,
    currentStep: "Sending scene 1 to Google Veo 3.1",
    mode: "single_clip",
    providerStatus: "submitting",
    scenesCompleted: 0,
    totalScenes: 1,
    plan,
    fallbackStoryboard,
    debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
      requestedMode,
      effectiveMode: "single_clip",
      stitchingRequired: false,
      ffmpegAvailable: ffmpegCapability.available,
      ffmpegReason: ffmpegCapability.available ? undefined : ffmpegCapability.reason,
      currentSceneNumber: scene.sceneNumber,
      latestProviderEvent: "single_clip_started",
      lastMeaningfulProgressAt: new Date().toISOString(),
    }),
  });

  const clip = await generateSceneClip({
    jobId,
    scene,
    plan,
    nonprofitContext,
    optionalPrompt,
    onUpdate: (update) => {
      applyProviderUpdate({
        jobId,
        update,
        mode: "single_clip",
        totalScenes: 1,
        sceneIndex: 0,
        planSceneCount: plan.scenes.length,
      });
    },
  });

  finalizeSuccessfulRender({
    jobId,
    mode: "single_clip",
    plan,
    fallbackStoryboard,
    finalVideoUrl: clip.publicUrl,
    rawClipUrls: [clip.publicUrl],
    providerOperationId: clip.providerOperationId,
    currentStep: "Single clip proof-of-life complete",
    scenesCompleted: 1,
    totalScenes: 1,
  });
}

async function runMultiSceneRender({
  jobId,
  plan,
  nonprofitContext,
  optionalPrompt,
  fallbackStoryboard,
  requestedMode,
  ffmpegCapability,
}: {
  jobId: string;
  plan: CampaignVideoPlan;
  nonprofitContext: NonprofitContext;
  optionalPrompt?: string;
  fallbackStoryboard?: CampaignVideoOutput;
  requestedMode: ActiveVideoRenderMode;
  ffmpegCapability: Awaited<ReturnType<typeof getVideoStitchingCapability>>;
}) {
  const clipPaths: string[] = [];
  const clipUrls: string[] = [];

  for (const [index, scene] of plan.scenes.entries()) {
    updateJob(jobId, {
      internalStatus: "create_request_sent",
      progressPercent: 28 + Math.round((index / plan.scenes.length) * 50),
      currentStep: `Sending scene ${index + 1} of ${plan.scenes.length} to Google Veo 3.1`,
      mode: "multi_scene",
      providerStatus: "submitting",
      scenesCompleted: index,
      totalScenes: plan.scenes.length,
      plan,
      fallbackStoryboard,
      rawClipUrls: clipUrls,
      debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
        requestedMode,
        effectiveMode: "multi_scene",
        stitchingRequired: true,
        ffmpegAvailable: ffmpegCapability.available,
        ffmpegReason: ffmpegCapability.available ? undefined : ffmpegCapability.reason,
        currentSceneNumber: scene.sceneNumber,
        latestProviderEvent: `scene_${scene.sceneNumber}_started`,
      }),
    });

    const clip = await generateSceneClip({
      jobId,
      scene,
      plan,
      nonprofitContext,
      optionalPrompt,
      onUpdate: (update) => {
        applyProviderUpdate({
          jobId,
          update,
          mode: "multi_scene",
          totalScenes: plan.scenes.length,
          sceneIndex: index,
          planSceneCount: plan.scenes.length,
        });
      },
    });

    clipPaths.push(clip.filePath);
    clipUrls.push(clip.publicUrl);

    updateJob(jobId, {
      internalStatus: "provider_completed",
      progressPercent: 28 + Math.round(((index + 1) / plan.scenes.length) * 50),
      currentStep:
        index + 1 === plan.scenes.length
          ? "Scene renders complete"
          : `Scene ${index + 1} complete`,
      mode: "multi_scene",
      providerStatus: "completed",
      providerOperationId: clip.providerOperationId,
      scenesCompleted: index + 1,
      totalScenes: plan.scenes.length,
      rawClipUrls: [...clipUrls],
      debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
        currentSceneNumber: scene.sceneNumber,
        latestProviderEvent: `scene_${scene.sceneNumber}_completed`,
        lastMeaningfulProgressAt: new Date().toISOString(),
      }),
    });
  }

  updateJob(jobId, {
    internalStatus: "stitching",
    progressPercent: 88,
    currentStep: "Stitching final video",
    mode: "multi_scene",
    providerStatus: "stitching",
    scenesCompleted: plan.scenes.length,
    totalScenes: plan.scenes.length,
    rawClipUrls: clipUrls,
    debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
      latestProviderEvent: "stitching_started",
      lastMeaningfulProgressAt: new Date().toISOString(),
    }),
  });

  const stitchedVideo = await stitchSceneClipsToVideo({
    jobId,
    clipPaths,
  });

  finalizeSuccessfulRender({
    jobId,
    mode: "multi_scene",
    plan,
    fallbackStoryboard,
    finalVideoUrl: stitchedVideo.publicUrl,
    rawClipUrls: clipUrls,
    currentStep: "Full multi-scene render complete",
    scenesCompleted: plan.scenes.length,
    totalScenes: plan.scenes.length,
  });
}

function applyProviderUpdate({
  jobId,
  update,
  mode,
  totalScenes,
  sceneIndex,
  planSceneCount,
}: {
  jobId: string;
  update: VeoProgressUpdate;
  mode: ActiveVideoRenderMode;
  totalScenes: number;
  sceneIndex: number;
  planSceneCount: number;
}) {
  const currentJob = getExistingJob(jobId);

  if (!currentJob) {
    return;
  }

  const absoluteProgress =
    mode === "single_clip"
      ? 30 + Math.round(((update.sceneProgressPercent ?? 0) / 100) * 58)
      : 28 +
        Math.round(
          ((sceneIndex + (update.sceneProgressPercent ?? 0) / 100) / planSceneCount) * 54,
        );

  updateJob(jobId, {
    internalStatus: update.internalStatus ?? currentJob.internalStatus,
    progressPercent: clampProgress(absoluteProgress),
    currentStep: update.message,
    mode,
    providerOperationId: update.providerOperationId ?? currentJob.providerOperationId,
    providerStatus: update.providerStatus,
    scenesCompleted: mode === "single_clip" ? 0 : sceneIndex,
    totalScenes,
    debugInfo: mergeDebugInfo(currentJob.debugInfo, {
      currentSceneNumber: update.sceneNumber,
      providerPollAttempts: update.pollAttempts,
      createRequestedAt: update.createRequestedAt,
      createRequestStatusCode: update.createRequestStatusCode,
      createResponseReceivedAt: update.createResponseReceivedAt,
      lastProviderCheckAt: update.lastPollTimestamp ?? new Date().toISOString(),
      lastPollTimestamp: update.lastPollTimestamp,
      lastPollStatusCode: update.lastPollStatusCode,
      retryCount: update.retryCount,
      nextRetryAt: update.nextRetryAt,
      quotaError: update.quotaError,
      lastHttpStatus: update.lastHttpStatus,
      lastProviderErrorCode: update.lastProviderErrorCode,
      lastProviderErrorStatus: update.lastProviderErrorStatus,
      latestProviderEvent: update.message,
      rawProviderState: update.rawProviderState,
      rawCreateResponse: update.rawCreateResponse,
      rawPollResponse: update.rawPollResponse,
      lastMeaningfulProgressAt:
        (update.sceneProgressPercent ?? 0) > 0
          ? new Date().toISOString()
          : currentJob.debugInfo?.lastMeaningfulProgressAt,
    }),
  });
}

function finalizeSuccessfulRender({
  jobId,
  mode,
  plan,
  fallbackStoryboard,
  finalVideoUrl,
  rawClipUrls,
  providerOperationId,
  currentStep,
  scenesCompleted,
  totalScenes,
}: {
  jobId: string;
  mode: ActiveVideoRenderMode;
  plan: CampaignVideoPlan;
  fallbackStoryboard?: CampaignVideoOutput;
  finalVideoUrl: string;
  rawClipUrls: string[];
  providerOperationId?: string;
  currentStep: string;
  scenesCompleted: number;
  totalScenes: number;
}) {
  updateJob(jobId, {
    internalStatus: "completed",
    progressPercent: 100,
    currentStep,
    mode,
    providerOperationId,
    providerStatus: "completed",
    scenesCompleted,
    totalScenes,
    finalVideoUrl,
    rawClipUrls,
    plan,
    fallbackStoryboard,
    errorMessage: undefined,
    debugInfo: mergeDebugInfo(getExistingJob(jobId)?.debugInfo, {
      fallbackTriggered: false,
      latestProviderEvent: "render_completed",
      nextRetryAt: undefined,
      terminalFailureReason: undefined,
      lastMeaningfulProgressAt: new Date().toISOString(),
    }),
  });
}

function setTerminalFallbackJob({
  jobId,
  internalStatus,
  nonprofitContext,
  optionalPrompt,
  fallbackStoryboard,
  errorMessage,
  providerStatus,
  providerOperationId,
  debugInfoPatch,
}: {
  jobId: string;
  internalStatus: TerminalJobStatus;
  nonprofitContext: NonprofitContext;
  optionalPrompt?: string;
  fallbackStoryboard?: CampaignVideoOutput;
  errorMessage?: string;
  providerStatus?: string;
  providerOperationId?: string;
  debugInfoPatch?: Partial<VideoJobDebugInfo>;
}) {
  const currentJob = getExistingJob(jobId);

  if (!currentJob) {
    return;
  }

  const storyboard =
    fallbackStoryboard ??
    campaignPlanToStoryboard(
      buildFallbackCampaignPlan(nonprofitContext, optionalPrompt),
      nonprofitContext,
      optionalPrompt,
    );

  updateJob(jobId, {
    internalStatus,
    progressPercent: 100,
    currentStep: getFallbackStep(internalStatus),
    mode: "fallback",
    providerOperationId: providerOperationId ?? currentJob.providerOperationId,
    providerStatus: providerStatus ?? mapProviderStatusForFailure(internalStatus),
    scenesCompleted: currentJob.scenesCompleted,
    totalScenes: currentJob.totalScenes,
    finalVideoUrl: undefined,
    fallbackStoryboard: storyboard,
    errorMessage,
    debugInfo: mergeDebugInfo(currentJob.debugInfo, {
      fallbackTriggered: true,
      fallbackReason: errorMessage,
      quotaError:
        debugInfoPatch?.quotaError ?? internalStatus === "failed_quota",
      terminalFailureReason:
        debugInfoPatch?.terminalFailureReason ?? errorMessage,
      nextRetryAt: undefined,
      latestProviderEvent: "fallback_rendered",
      lastMeaningfulProgressAt: new Date().toISOString(),
      ...debugInfoPatch,
    }),
  });
}

function updateJob(jobId: string, patch: Partial<InternalVideoJob>) {
  const currentJob = videoJobs.get(jobId);

  if (!currentJob) {
    return;
  }

  videoJobs.set(jobId, {
    ...currentJob,
    ...patch,
    updatedAt: new Date().toISOString(),
  });
}

function getExistingJob(jobId: string) {
  return videoJobs.get(jobId);
}

function mergeDebugInfo(
  current: VideoJobDebugInfo | undefined,
  patch: Partial<VideoJobDebugInfo>,
): VideoJobDebugInfo {
  return {
    requestedMode: patch.requestedMode ?? current?.requestedMode ?? "single_clip",
    fallbackTriggered:
      patch.fallbackTriggered ?? current?.fallbackTriggered ?? false,
    ...current,
    ...patch,
  };
}

function toPublicJob(job: InternalVideoJob): VideoJobStatus {
  return {
    jobId: job.jobId,
    status: job.mode === "fallback" ? "fallback" : job.internalStatus,
    completed: job.internalStatus === "completed",
    internalStatus: job.internalStatus,
    progressPercent: job.progressPercent,
    currentStep: job.currentStep,
    mode: job.mode,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    providerName: job.providerName,
    providerOperationId: job.providerOperationId,
    providerStatus: job.providerStatus,
    scenesCompleted: job.scenesCompleted,
    totalScenes: job.totalScenes,
    finalVideoUrl: job.finalVideoUrl,
    rawClipUrls: job.rawClipUrls,
    fallbackStoryboard: job.fallbackStoryboard,
    errorMessage: job.errorMessage,
    debugInfo: job.debugInfo,
    plan: job.plan,
  };
}

function cleanupExpiredJobs() {
  const now = Date.now();

  for (const [jobId, job] of videoJobs.entries()) {
    if (now - job.createdAtMs > JOB_TTL_MS) {
      videoJobs.delete(jobId);
      runningJobs.delete(jobId);
    }
  }
}

function clampProgress(progressPercent: number) {
  return Math.max(1, Math.min(99, progressPercent));
}

function getFallbackStep(internalStatus: TerminalJobStatus) {
  switch (internalStatus) {
    case "failed_quota":
      return "Provider quota/capacity exhausted — showing storyboard fallback.";
    case "failed_init":
      return "Video render could not initialize — showing storyboard fallback.";
    case "timed_out":
      return "AI video render is taking too long — showing the storyboard fallback for now.";
    case "failed_provider":
    default:
      return "Video render failed at the provider — showing storyboard fallback.";
  }
}

function mapProviderStatusForFailure(internalStatus: TerminalJobStatus) {
  switch (internalStatus) {
    case "failed_quota":
      return "resource_exhausted";
    case "failed_init":
      return "failed_init";
    case "timed_out":
      return "timed_out";
    case "failed_provider":
    default:
      return "failed";
  }
}

function normalizeTerminalError(error: unknown) {
  if (error instanceof VideoGenerationTimeoutError) {
    return {
      internalStatus: "timed_out" as const,
      errorMessage: error.message,
      providerStatus: error.providerStatus ?? mapProviderStatusForFailure("timed_out"),
      providerOperationId: error.providerOperationId,
      debugInfoPatch: {
        ...error.debugPatch,
        retryCount: error.retryCount,
        lastHttpStatus: error.httpStatus,
        lastProviderErrorCode: error.providerErrorCode,
        lastProviderErrorStatus: error.providerErrorStatus,
      },
    };
  }

  if (isVeoGenerationError(error)) {
    return {
      internalStatus: error.internalStatus,
      errorMessage: error.message,
      providerStatus:
        error.providerStatus ?? mapProviderStatusForFailure(error.internalStatus),
      providerOperationId: error.providerOperationId,
      debugInfoPatch: {
        ...error.debugPatch,
        retryCount: error.retryCount,
        lastHttpStatus: error.httpStatus,
        lastProviderErrorCode: error.providerErrorCode,
        lastProviderErrorStatus: error.providerErrorStatus,
      },
    };
  }

  if (error instanceof Error) {
    return {
      internalStatus: "failed_provider" as const,
      errorMessage: error.message,
      providerStatus: mapProviderStatusForFailure("failed_provider"),
      providerOperationId: undefined,
      debugInfoPatch: {
        terminalFailureReason: error.message,
      },
    };
  }

  return {
    internalStatus: "failed_provider" as const,
    errorMessage: "Unexpected video render failure.",
    providerStatus: mapProviderStatusForFailure("failed_provider"),
    providerOperationId: undefined,
    debugInfoPatch: {
      terminalFailureReason: "Unexpected non-Error thrown during video generation.",
    },
  };
}

function isVeoGenerationError(error: unknown): error is VeoGenerationError {
  return (
    error instanceof Error &&
    "internalStatus" in error &&
    typeof (error as { internalStatus?: unknown }).internalStatus === "string"
  );
}
