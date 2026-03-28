import "server-only";

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  CampaignVideoPlan,
  NonprofitContext,
  ScenePlan,
  VideoJobDebugInfo,
  VideoJobInternalStatus,
  VideoProviderResponseSnapshot,
} from "@/lib/campaign";

const VEO_MODEL = process.env.GEMINI_VEO_MODEL ?? "veo-3.1-generate-preview";
const VEO_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const VEO_POLL_INTERVAL_MS = Number(
  process.env.CAMPAIGN_VIDEO_POLL_INTERVAL_MS ?? 10_000,
);
const DEFAULT_SCENE_TIMEOUT_MS = Number(
  process.env.CAMPAIGN_VIDEO_SCENE_TIMEOUT_MS ?? 4 * 60 * 1000,
);
const MAX_CREATE_RETRIES = Number(
  process.env.CAMPAIGN_VIDEO_CREATE_RETRIES ?? 2,
);
const MAX_POLL_RETRIES = Number(
  process.env.CAMPAIGN_VIDEO_POLL_RETRIES ?? 2,
);
const RETRYABLE_HTTP_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

type TerminalVeoStatus = Extract<
  VideoJobInternalStatus,
  "failed_init" | "failed_provider" | "failed_quota" | "timed_out"
>;

type ProviderErrorLike = {
  code?: number | string;
  message?: string;
  status?: string;
};

interface VeoVideoAsset {
  mimeType?: string;
  uri: string;
}

interface VeoOperationResponse {
  done?: boolean;
  error?: ProviderErrorLike;
  name?: string;
  metadata?: {
    state?: string;
    [key: string]: unknown;
  };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{ video?: VeoVideoAsset }>;
      generated_videos?: Array<{ video?: VeoVideoAsset }>;
    };
    generatedVideos?: Array<{ video?: VeoVideoAsset }>;
    generated_videos?: Array<{ video?: VeoVideoAsset }>;
  };
}

interface ProviderRequestResult {
  httpStatus: number;
  payload: VeoOperationResponse | null;
  snapshot: VideoProviderResponseSnapshot;
}

interface CreateOperationResult {
  operationName: string;
  snapshot: VideoProviderResponseSnapshot;
  retryCount: number;
}

interface PollOperationResult {
  operation: VeoOperationResponse;
  snapshot: VideoProviderResponseSnapshot;
  pollAttempts: number;
  retryCount: number;
}

export interface GeneratedSceneClip {
  filePath: string;
  publicUrl: string;
  sceneNumber: number;
  providerOperationId: string;
}

export interface VeoProgressUpdate {
  sceneNumber: number;
  message: string;
  internalStatus?: Extract<
    VideoJobInternalStatus,
    | "create_request_sent"
    | "waiting_for_operation_id"
    | "polling_provider"
    | "provider_completed"
    | "downloading_asset"
  >;
  providerOperationId?: string;
  providerStatus: string;
  pollAttempts?: number;
  sceneProgressPercent?: number;
  rawProviderState?: string;
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
  rawCreateResponse?: VideoProviderResponseSnapshot;
  rawPollResponse?: VideoProviderResponseSnapshot;
}

export interface VeoSanityCheckResult {
  providerName: string;
  model: string;
  createRequestStatusCode?: number;
  operationId?: string;
  providerStatus?: string;
  canPoll: boolean;
  firstPoll?: VideoProviderResponseSnapshot;
  rawCreateResponse?: VideoProviderResponseSnapshot;
  retryCount: number;
}

export class VeoGenerationError extends Error {
  readonly internalStatus: TerminalVeoStatus;
  readonly httpStatus?: number;
  readonly providerOperationId?: string;
  readonly providerStatus?: string;
  readonly providerErrorCode?: string;
  readonly providerErrorStatus?: string;
  readonly retryCount?: number;
  readonly debugPatch?: Partial<VideoJobDebugInfo>;

  constructor({
    message,
    internalStatus,
    httpStatus,
    providerOperationId,
    providerStatus,
    providerErrorCode,
    providerErrorStatus,
    retryCount,
    debugPatch,
  }: {
    message: string;
    internalStatus: TerminalVeoStatus;
    httpStatus?: number;
    providerOperationId?: string;
    providerStatus?: string;
    providerErrorCode?: string;
    providerErrorStatus?: string;
    retryCount?: number;
    debugPatch?: Partial<VideoJobDebugInfo>;
  }) {
    super(message);
    this.name = "VeoGenerationError";
    this.internalStatus = internalStatus;
    this.httpStatus = httpStatus;
    this.providerOperationId = providerOperationId;
    this.providerStatus = providerStatus;
    this.providerErrorCode = providerErrorCode;
    this.providerErrorStatus = providerErrorStatus;
    this.retryCount = retryCount;
    this.debugPatch = debugPatch;
  }
}

export class VideoGenerationTimeoutError extends VeoGenerationError {
  constructor(message: string, debugPatch?: Partial<VideoJobDebugInfo>) {
    super({
      message,
      internalStatus: "timed_out",
      providerStatus: "timed_out",
      debugPatch,
    });
    this.name = "VideoGenerationTimeoutError";
  }
}

export function isVideoGenerationConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export async function generateSceneClip({
  jobId,
  scene,
  plan,
  nonprofitContext,
  optionalPrompt,
  timeoutMs = DEFAULT_SCENE_TIMEOUT_MS,
  onUpdate,
}: {
  jobId: string;
  scene: ScenePlan;
  plan: CampaignVideoPlan;
  nonprofitContext: NonprofitContext;
  optionalPrompt?: string;
  timeoutMs?: number;
  onUpdate?: (update: VeoProgressUpdate) => void;
}): Promise<GeneratedSceneClip> {
  logVeoEvent(jobId, scene.sceneNumber, "provider.request.start", {
    model: VEO_MODEL,
    durationSeconds: normalizeSceneDuration(scene.durationSeconds),
  });

  const createRequestedAt = new Date().toISOString();
  onUpdate?.({
    sceneNumber: scene.sceneNumber,
    message: `Sending scene ${scene.sceneNumber} to ${VEO_MODEL}`,
    internalStatus: "create_request_sent",
    providerStatus: "submitting",
    sceneProgressPercent: 6,
    createRequestedAt,
    nextRetryAt: undefined,
    quotaError: false,
    rawProviderState: "create_request_sent",
  });

  const createResult = await createVeoOperation({
    prompt: buildVeoScenePrompt({
      nonprofitContext,
      plan,
      scene,
      optionalPrompt,
    }),
    durationSeconds: normalizeSceneDuration(scene.durationSeconds),
    logContext: { jobId, sceneNumber: scene.sceneNumber },
    onUpdate,
  });

  onUpdate?.({
    sceneNumber: scene.sceneNumber,
    message: `Provider accepted scene ${scene.sceneNumber} render request`,
    internalStatus: "polling_provider",
    providerOperationId: createResult.operationName,
    providerStatus: createResult.snapshot.providerStatus ?? "queued",
    sceneProgressPercent: 12,
    createRequestedAt,
    createRequestStatusCode: createResult.snapshot.httpStatus,
    createResponseReceivedAt: createResult.snapshot.receivedAt,
    retryCount: createResult.retryCount,
    nextRetryAt: undefined,
    quotaError: false,
    lastHttpStatus: createResult.snapshot.httpStatus,
    rawCreateResponse: createResult.snapshot,
    rawProviderState: createResult.snapshot.providerStatus ?? "queued",
  });
  logVeoEvent(jobId, scene.sceneNumber, "provider.request.accepted", {
    operationName: createResult.operationName,
    createStatus: createResult.snapshot.httpStatus,
  });

  const pollResult = await pollOperationUntilDone({
    jobId,
    sceneNumber: scene.sceneNumber,
    operationName: createResult.operationName,
    timeoutMs,
    startingRetryCount: createResult.retryCount,
    onUpdate,
  });
  const videoAsset = extractVideoAsset(pollResult.operation);
  const outputDirectory = path.join(process.cwd(), "public", "generated", "jobs", jobId);
  const sceneFilename = `scene-${scene.sceneNumber}.mp4`;
  const scenePath = path.join(outputDirectory, sceneFilename);

  onUpdate?.({
    sceneNumber: scene.sceneNumber,
    message: `Downloading generated clip for scene ${scene.sceneNumber}`,
    internalStatus: "downloading_asset",
    providerOperationId: createResult.operationName,
    providerStatus: "downloading",
    pollAttempts: pollResult.pollAttempts,
    sceneProgressPercent: 92,
    createRequestStatusCode: createResult.snapshot.httpStatus,
    lastPollTimestamp: pollResult.snapshot.receivedAt,
    lastPollStatusCode: pollResult.snapshot.httpStatus,
    retryCount: pollResult.retryCount,
    nextRetryAt: undefined,
    quotaError: false,
    lastHttpStatus: pollResult.snapshot.httpStatus,
    rawCreateResponse: createResult.snapshot,
    rawPollResponse: pollResult.snapshot,
    rawProviderState: "downloading_asset",
  });
  logVeoEvent(jobId, scene.sceneNumber, "provider.asset.download.start", {
    operationName: createResult.operationName,
    assetUri: videoAsset.uri,
  });

  await mkdir(outputDirectory, { recursive: true });
  await downloadVideoAsset(videoAsset.uri, scenePath);

  const publicUrl = `/generated/jobs/${jobId}/${sceneFilename}`;
  if (process.env.NODE_ENV !== "production") {
    console.info("[campaign-video] served clip verification", {
      jobId,
      sceneNumber: scene.sceneNumber,
      fileSystemPath: scenePath,
      browserUrlPath: publicUrl,
    });
  }
  onUpdate?.({
    sceneNumber: scene.sceneNumber,
    message: `Scene ${scene.sceneNumber} clip ready`,
    internalStatus: "provider_completed",
    providerOperationId: createResult.operationName,
    providerStatus: "completed",
    pollAttempts: pollResult.pollAttempts,
    sceneProgressPercent: 100,
    createRequestStatusCode: createResult.snapshot.httpStatus,
    lastPollTimestamp: pollResult.snapshot.receivedAt,
    lastPollStatusCode: pollResult.snapshot.httpStatus,
    retryCount: pollResult.retryCount,
    nextRetryAt: undefined,
    quotaError: false,
    lastHttpStatus: pollResult.snapshot.httpStatus,
    rawCreateResponse: createResult.snapshot,
    rawPollResponse: pollResult.snapshot,
    rawProviderState: "completed",
  });
  logVeoEvent(jobId, scene.sceneNumber, "provider.asset.download.complete", {
    operationName: createResult.operationName,
    filePath: scenePath,
    publicUrl,
  });

  return {
    filePath: scenePath,
    publicUrl,
    sceneNumber: scene.sceneNumber,
    providerOperationId: createResult.operationName,
  };
}

export async function runVeoSanityCheck(): Promise<VeoSanityCheckResult> {
  const createResult = await createVeoOperation({
    prompt:
      "Create one portrait 9:16 nonprofit-safe volunteer recruitment clip with a bright documentary feel and realistic community action.",
    durationSeconds: 8,
    logContext: { jobId: "test-veo", sceneNumber: 1 },
  });

  const firstPoll = await fetchOperationStatus({
    operationName: createResult.operationName,
  });

  return {
    providerName: "Google Veo 3.1",
    model: VEO_MODEL,
    createRequestStatusCode: createResult.snapshot.httpStatus,
    operationId: createResult.operationName,
    providerStatus: firstPoll.snapshot.providerStatus,
    canPoll: true,
    firstPoll: firstPoll.snapshot,
    rawCreateResponse: createResult.snapshot,
    retryCount: createResult.retryCount,
  };
}

async function createVeoOperation({
  prompt,
  durationSeconds,
  logContext,
  onUpdate,
}: {
  prompt: string;
  durationSeconds: number;
  logContext: { jobId: string; sceneNumber: number };
  onUpdate?: (update: VeoProgressUpdate) => void;
}): Promise<CreateOperationResult> {
  let retryCount = 0;
  let lastError: VeoGenerationError | undefined;

  for (let attempt = 0; attempt <= MAX_CREATE_RETRIES; attempt += 1) {
    try {
      // Official Veo REST flow: create a long-running operation first, then poll
      // the returned operation name until the provider marks it done.
      const createResponse = await sendCreateRequest({
        prompt,
        durationSeconds,
      });
      // This `name` field is the provider operation id we persist into job state.
      const operationName = createResponse.payload?.name?.trim();

      if (!operationName) {
        onUpdate?.({
          sceneNumber: logContext.sceneNumber,
          message: "Provider create response returned without an operation id",
          internalStatus: "waiting_for_operation_id",
          providerStatus:
            createResponse.snapshot.providerStatus ?? "missing_operation_id",
          sceneProgressPercent: 10,
          createRequestStatusCode: createResponse.httpStatus,
          createResponseReceivedAt: createResponse.snapshot.receivedAt,
          retryCount,
          lastHttpStatus: createResponse.httpStatus,
          rawCreateResponse: createResponse.snapshot,
          rawProviderState:
            createResponse.snapshot.providerStatus ?? "missing_operation_id",
        });

        throw new VeoGenerationError({
          message:
            "Veo did not return an operation id, so polling cannot begin.",
          internalStatus: "failed_init",
          httpStatus: createResponse.httpStatus,
          providerStatus: createResponse.snapshot.providerStatus,
          retryCount,
          debugPatch: {
            createRequestStatusCode: createResponse.httpStatus,
            createResponseReceivedAt: createResponse.snapshot.receivedAt,
            lastHttpStatus: createResponse.httpStatus,
            rawCreateResponse: createResponse.snapshot,
            terminalFailureReason:
              "Create request succeeded but no operation id was returned.",
          },
        });
      }

      return {
        operationName,
        snapshot: {
          ...createResponse.snapshot,
          operationId: operationName,
        },
        retryCount,
      };
    } catch (error) {
      const normalized = normalizeVeoError(error, {
        fallbackStatus: "failed_provider",
        retryCount,
      });

      if (!shouldRetryVeoError(normalized) || attempt >= MAX_CREATE_RETRIES) {
        throw normalized;
      }

      retryCount += 1;
      const delayMs = getRetryDelayMs(retryCount);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      onUpdate?.({
        sceneNumber: logContext.sceneNumber,
        message: "Transient provider issue during create request — retrying",
        internalStatus: "create_request_sent",
        providerStatus: normalized.providerStatus ?? "retrying_create_request",
        sceneProgressPercent: 8,
        retryCount,
        nextRetryAt,
        quotaError: normalized.internalStatus === "failed_quota",
        lastHttpStatus: normalized.httpStatus,
        lastProviderErrorCode: normalized.providerErrorCode,
        lastProviderErrorStatus: normalized.providerErrorStatus,
        rawCreateResponse: normalized.debugPatch?.rawCreateResponse,
        rawProviderState: normalized.providerStatus ?? "retrying_create_request",
      });

      logVeoEvent(logContext.jobId, logContext.sceneNumber, "provider.request.retry", {
        retryCount,
        nextRetryAt,
        reason: normalized.message,
        httpStatus: normalized.httpStatus,
      });

      await sleep(delayMs);
      lastError = normalized;
    }
  }

  throw (
    lastError ??
    new VeoGenerationError({
      message: "Veo create request failed before an operation id was assigned.",
      internalStatus: "failed_init",
    })
  );
}

async function pollOperationUntilDone({
  jobId,
  sceneNumber,
  operationName,
  timeoutMs,
  startingRetryCount,
  onUpdate,
}: {
  jobId: string;
  sceneNumber: number;
  operationName: string;
  timeoutMs: number;
  startingRetryCount: number;
  onUpdate?: (update: VeoProgressUpdate) => void;
}): Promise<PollOperationResult> {
  const startedAt = Date.now();
  let pollAttempts = 0;
  let retryCount = startingRetryCount;

  while (Date.now() - startedAt < timeoutMs) {
    pollAttempts += 1;

    try {
      // Poll the operation resource directly. This is the official completion
      // check for Veo long-running video generation.
      const result = await fetchOperationStatus({ operationName });
      const providerState = result.snapshot.providerStatus ?? "processing";
      const elapsedRatio = Math.min(1, (Date.now() - startedAt) / timeoutMs);
      const sceneProgressPercent = result.payload?.done
        ? 90
        : Math.min(85, 14 + Math.round(elapsedRatio * 68));

      onUpdate?.({
        sceneNumber,
        message:
          result.payload?.done
            ? `Provider finished rendering scene ${sceneNumber}`
            : `Polling provider for scene ${sceneNumber} (attempt ${pollAttempts})`,
        internalStatus: result.payload?.done
          ? "provider_completed"
          : "polling_provider",
        providerOperationId: operationName,
        providerStatus: providerState,
        pollAttempts,
        sceneProgressPercent,
        lastPollTimestamp: result.snapshot.receivedAt,
        lastPollStatusCode: result.snapshot.httpStatus,
        retryCount,
        nextRetryAt: undefined,
        quotaError: false,
        lastHttpStatus: result.snapshot.httpStatus,
        lastProviderErrorCode: result.snapshot.error?.code,
        lastProviderErrorStatus: result.snapshot.error?.status,
        rawPollResponse: result.snapshot,
        rawProviderState: providerState,
      });
      logVeoEvent(jobId, sceneNumber, "provider.poll", {
        operationName,
        pollAttempts,
        providerState,
        done: Boolean(result.payload?.done),
      });

      if (result.payload?.error?.message) {
        throw new VeoGenerationError({
          message: result.payload.error.message,
          internalStatus: classifyTerminalStatus(result.snapshot),
          httpStatus: result.snapshot.httpStatus,
          providerOperationId: operationName,
          providerStatus: providerState,
          providerErrorCode: result.snapshot.error?.code,
          providerErrorStatus: result.snapshot.error?.status,
          retryCount,
          debugPatch: {
            providerPollAttempts: pollAttempts,
            lastPollTimestamp: result.snapshot.receivedAt,
            lastPollStatusCode: result.snapshot.httpStatus,
            lastHttpStatus: result.snapshot.httpStatus,
            lastProviderErrorCode: result.snapshot.error?.code,
            lastProviderErrorStatus: result.snapshot.error?.status,
            rawPollResponse: result.snapshot,
            quotaError: classifyTerminalStatus(result.snapshot) === "failed_quota",
          },
        });
      }

      if (result.payload?.done) {
        logVeoEvent(jobId, sceneNumber, "provider.poll.complete", {
          operationName,
          pollAttempts,
        });

        return {
          operation: result.payload,
          snapshot: result.snapshot,
          pollAttempts,
          retryCount,
        };
      }
    } catch (error) {
      const normalized = normalizeVeoError(error, {
        fallbackStatus: "failed_provider",
        operationName,
        retryCount,
      });

      if (!shouldRetryVeoError(normalized)) {
        throw normalized;
      }

      if (Date.now() - startedAt >= timeoutMs || retryCount >= startingRetryCount + MAX_POLL_RETRIES) {
        throw normalized;
      }

      retryCount += 1;
      const delayMs = getRetryDelayMs(retryCount);
      const nextRetryAt = new Date(Date.now() + delayMs).toISOString();

      onUpdate?.({
        sceneNumber,
        message: `Transient provider issue while polling scene ${sceneNumber} — retrying`,
        internalStatus: "polling_provider",
        providerOperationId: operationName,
        providerStatus: normalized.providerStatus ?? "retrying",
        pollAttempts,
        sceneProgressPercent: 20,
        lastPollTimestamp: new Date().toISOString(),
        retryCount,
        nextRetryAt,
        lastHttpStatus: normalized.httpStatus,
        lastProviderErrorCode: normalized.providerErrorCode,
        lastProviderErrorStatus: normalized.providerErrorStatus,
        quotaError: normalized.internalStatus === "failed_quota",
        rawProviderState: normalized.providerStatus ?? "retrying",
      });

      logVeoEvent(jobId, sceneNumber, "provider.poll.retry", {
        operationName,
        pollAttempts,
        retryCount,
        nextRetryAt,
        reason: normalized.message,
      });

      await sleep(delayMs);
    }

    await sleep(VEO_POLL_INTERVAL_MS);
  }

  throw new VideoGenerationTimeoutError(
    "AI video render is taking too long — showing the storyboard fallback for now.",
    {
      providerPollAttempts: pollAttempts,
      lastProviderCheckAt: new Date().toISOString(),
      terminalFailureReason:
        "Provider polling exceeded the scene timeout before completion.",
    },
  );
}

async function sendCreateRequest({
  prompt,
  durationSeconds,
}: {
  prompt: string;
  durationSeconds: number;
}): Promise<ProviderRequestResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new VeoGenerationError({
      message: "GEMINI_API_KEY is not configured for Veo video generation.",
      internalStatus: "failed_init",
      debugPatch: {
        terminalFailureReason: "GEMINI_API_KEY is missing.",
      },
    });
  }

  const response = await fetch(`${VEO_BASE_URL}/models/${VEO_MODEL}:predictLongRunning`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds,
        resolution: "720p",
        personGeneration: "allow_all",
      },
    }),
    cache: "no-store",
  });

  const payload = await parseProviderResponse(response);
  const snapshot = toProviderSnapshot({
    payload,
    httpStatus: response.status,
    receivedAt: new Date().toISOString(),
  });

  if (!response.ok) {
    throw buildProviderHttpError({
      message: "Veo create request failed.",
      snapshot,
      fallbackStatus: classifyTerminalStatus(snapshot),
      source: "create",
    });
  }

  return {
    httpStatus: response.status,
    payload,
    snapshot,
  };
}

async function fetchOperationStatus({
  operationName,
}: {
  operationName: string;
}): Promise<ProviderRequestResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new VeoGenerationError({
      message: "GEMINI_API_KEY is not configured for Veo polling.",
      internalStatus: "failed_init",
      providerOperationId: operationName,
      debugPatch: {
        terminalFailureReason: "Polling could not start because GEMINI_API_KEY is missing.",
      },
    });
  }

  const response = await fetch(`${VEO_BASE_URL}/${operationName}`, {
    headers: {
      "x-goog-api-key": apiKey,
    },
    cache: "no-store",
  });

  const payload = await parseProviderResponse(response);
  const snapshot = toProviderSnapshot({
    payload,
    httpStatus: response.status,
    receivedAt: new Date().toISOString(),
  });
  const fallbackStatus = classifyTerminalStatus({
    ...snapshot,
    operationId: snapshot.operationId ?? operationName,
  });

  if (!response.ok) {
    throw buildProviderHttpError({
      message: "Veo status check failed.",
      snapshot,
      fallbackStatus,
      providerOperationId: operationName,
      source: "poll",
    });
  }

  return {
    httpStatus: response.status,
    payload,
    snapshot,
  };
}

async function downloadVideoAsset(uri: string, destinationPath: string) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new VeoGenerationError({
      message: "GEMINI_API_KEY is not configured for downloading Veo assets.",
      internalStatus: "failed_init",
      debugPatch: {
        terminalFailureReason: "Generated clip could not be downloaded without GEMINI_API_KEY.",
      },
    });
  }

  const response = await fetch(uri, {
    headers: {
      "x-goog-api-key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new VeoGenerationError({
      message: `Failed to download generated clip: ${response.status} ${response.statusText}`,
      internalStatus: "failed_provider",
      httpStatus: response.status,
      debugPatch: {
        lastHttpStatus: response.status,
        terminalFailureReason: "Generated asset download failed.",
      },
    });
  }

  const videoBuffer = Buffer.from(await response.arrayBuffer());
  await writeFile(destinationPath, videoBuffer);
}

function extractVideoAsset(operation: VeoOperationResponse) {
  // Once the provider marks the operation done, the downloadable asset lives
  // under the generated video response payload.
  const generatedSample =
    operation.response?.generateVideoResponse?.generatedSamples?.[0] ??
    operation.response?.generateVideoResponse?.generated_videos?.[0] ??
    operation.response?.generatedVideos?.[0] ??
    operation.response?.generated_videos?.[0];
  const videoAsset = generatedSample?.video;

  if (!videoAsset?.uri) {
    throw new VeoGenerationError({
      message: "Veo finished without returning a downloadable video asset.",
      internalStatus: "failed_provider",
      providerStatus: "completed_without_asset",
      debugPatch: {
        terminalFailureReason:
          "Provider reported completion but did not return a downloadable asset.",
      },
    });
  }

  return videoAsset;
}

function buildVeoScenePrompt({
  nonprofitContext,
  plan,
  scene,
  optionalPrompt,
}: {
  nonprofitContext: NonprofitContext;
  plan: CampaignVideoPlan;
  scene: ScenePlan;
  optionalPrompt?: string;
}) {
  return [
    "Create a cinematic portrait 9:16 volunteer recruitment video clip for a nonprofit campaign.",
    "The clip should feel like a polished YouTube Short or Instagram Reel segment.",
    "Do not burn text, subtitles, logos, or watermarks into the output.",
    "Use realistic community-friendly nonprofit imagery and keep the style consistent with the rest of the campaign.",
    `Campaign title: ${plan.campaignTitle}.`,
    `Nonprofit: ${nonprofitContext.name} in ${nonprofitContext.city}.`,
    `Cause area: ${nonprofitContext.category}.`,
    `Mission: ${nonprofitContext.mission}.`,
    `Urgency: ${nonprofitContext.urgency} (${nonprofitContext.urgencyScore}/100).`,
    `Current needs: ${nonprofitContext.currentNeeds.join("; ")}.`,
    `Target audience: ${plan.targetAudience}.`,
    `Tone: ${plan.tone}.`,
    `Style anchor: ${plan.visualStyle ?? "Clean modern nonprofit storytelling with warm documentary energy."}.`,
    optionalPrompt
      ? `User direction: ${optionalPrompt}.`
      : "No extra user direction was provided. Lean fully on the nonprofit context.",
    `Scene ${scene.sceneNumber} purpose: ${scene.purpose}.`,
    `Scene duration: ${normalizeSceneDuration(scene.durationSeconds)} seconds.`,
    `Voiceover intent: ${scene.voiceover}.`,
    `On-screen text intent: ${scene.onscreenText}.`,
    `Primary visual prompt: ${scene.visualPrompt}.`,
    `Transition note: ${scene.transitionNote}.`,
  ].join("\n");
}

async function parseProviderResponse(response: Response) {
  const rawText = await response.text();

  if (!rawText.trim()) {
    return null;
  }

  const parsed = safeJsonParse(rawText);
  return parsed && typeof parsed === "object" ? (parsed as VeoOperationResponse) : null;
}

function toProviderSnapshot({
  payload,
  httpStatus,
  receivedAt,
}: {
  payload: VeoOperationResponse | null;
  httpStatus: number;
  receivedAt: string;
}): VideoProviderResponseSnapshot {
  return {
    receivedAt,
    httpStatus,
    operationId: payload?.name?.trim() || undefined,
    providerStatus: getProviderState(payload),
    done: payload?.done,
    responseVideoCount: getGeneratedVideoCount(payload),
    error: payload?.error
      ? {
          code:
            payload.error.code === undefined ? undefined : String(payload.error.code),
          status: payload.error.status,
          message: payload.error.message,
        }
      : undefined,
  };
}

function getGeneratedVideoCount(payload: VeoOperationResponse | null) {
  if (!payload?.response) {
    return undefined;
  }

  return (
    payload.response.generateVideoResponse?.generatedSamples?.length ??
    payload.response.generateVideoResponse?.generated_videos?.length ??
    payload.response.generatedVideos?.length ??
    payload.response.generated_videos?.length
  );
}

function getProviderState(operation: VeoOperationResponse | null) {
  const metadataState = operation?.metadata?.state;

  if (typeof metadataState === "string" && metadataState.trim()) {
    return metadataState;
  }

  if (operation?.error?.status) {
    return operation.error.status;
  }

  if (operation?.error?.message) {
    return "failed";
  }

  if (operation?.done) {
    return "completed";
  }

  return operation?.name ? "queued" : "unknown";
}

function classifyTerminalStatus(snapshot: VideoProviderResponseSnapshot): TerminalVeoStatus {
  const errorMessage = snapshot.error?.message?.toLowerCase() ?? "";
  const errorStatus = snapshot.error?.status?.toLowerCase() ?? "";
  const errorCode = snapshot.error?.code?.toLowerCase() ?? "";

  if (
    snapshot.httpStatus === 429 &&
    (errorMessage.includes("resource_exhausted") ||
      errorMessage.includes("quota") ||
      errorMessage.includes("capacity") ||
      errorStatus.includes("resource_exhausted") ||
      errorCode.includes("resource_exhausted"))
  ) {
    return "failed_quota";
  }

  if (!snapshot.operationId && snapshot.httpStatus && snapshot.httpStatus < 500) {
    return "failed_init";
  }

  return "failed_provider";
}

function buildProviderHttpError({
  message,
  snapshot,
  fallbackStatus,
  providerOperationId,
  source,
}: {
  message: string;
  snapshot: VideoProviderResponseSnapshot;
  fallbackStatus: TerminalVeoStatus;
  providerOperationId?: string;
  source: "create" | "poll";
}) {
  const safeProviderMessage = snapshot.error?.message?.trim();

  return new VeoGenerationError({
    message:
      fallbackStatus === "failed_quota"
        ? safeProviderMessage
          ? `Provider quota/capacity exhausted. ${safeProviderMessage}`
          : "Provider quota/capacity exhausted."
        : `${message} ${formatProviderError(snapshot)}`.trim(),
    internalStatus: fallbackStatus,
    httpStatus: snapshot.httpStatus,
    providerOperationId: providerOperationId ?? snapshot.operationId,
    providerStatus: snapshot.providerStatus,
    providerErrorCode: snapshot.error?.code,
    providerErrorStatus: snapshot.error?.status,
    debugPatch: {
      quotaError: fallbackStatus === "failed_quota",
      lastHttpStatus: snapshot.httpStatus,
      lastProviderErrorCode: snapshot.error?.code,
      lastProviderErrorStatus: snapshot.error?.status,
      terminalFailureReason:
        fallbackStatus === "failed_quota"
          ? safeProviderMessage ?? "Provider quota/capacity exhausted."
          : safeProviderMessage ?? message,
      rawCreateResponse: source === "create" ? snapshot : undefined,
      rawPollResponse: source === "poll" ? snapshot : undefined,
    },
  });
}

function normalizeVeoError(
  error: unknown,
  {
    fallbackStatus,
    operationName,
    retryCount,
  }: {
    fallbackStatus: TerminalVeoStatus;
    operationName?: string;
    retryCount?: number;
  },
) {
  if (error instanceof VeoGenerationError) {
    return error;
  }

  if (error instanceof Error) {
    return new VeoGenerationError({
      message: error.message,
      internalStatus: fallbackStatus,
      providerOperationId: operationName,
      retryCount,
      debugPatch: {
        terminalFailureReason: error.message,
      },
    });
  }

  return new VeoGenerationError({
    message: "Unexpected Veo provider failure.",
    internalStatus: fallbackStatus,
    providerOperationId: operationName,
    retryCount,
    debugPatch: {
      terminalFailureReason: "Unexpected non-Error thrown from provider integration.",
    },
  });
}

function shouldRetryVeoError(error: VeoGenerationError) {
  if (error.internalStatus === "failed_quota") {
    return false;
  }

  if (error.httpStatus === undefined) {
    return true;
  }

  return RETRYABLE_HTTP_STATUSES.has(error.httpStatus);
}

function formatProviderError(snapshot: VideoProviderResponseSnapshot) {
  const parts = [
    snapshot.httpStatus ? `HTTP ${snapshot.httpStatus}` : undefined,
    snapshot.error?.status,
    snapshot.error?.code,
    snapshot.error?.message,
  ].filter(Boolean);

  return parts.join(" • ");
}

function getRetryDelayMs(retryCount: number) {
  const baseDelay = 2_000;
  return Math.min(15_000, baseDelay * 2 ** Math.max(0, retryCount - 1));
}

function normalizeSceneDuration(durationSeconds: number) {
  if (durationSeconds >= 8) return 8;
  if (durationSeconds >= 6) return 6;
  return 4;
}

function logVeoEvent(
  jobId: string,
  sceneNumber: number,
  event: string,
  details: Record<string, unknown>,
) {
  console.info(`[campaign-video][${jobId}][scene-${sceneNumber}] ${event}`, details);
}

function safeJsonParse(raw: string) {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
