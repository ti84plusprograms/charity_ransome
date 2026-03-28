"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  buildNonprofitContext,
  type CampaignVideoOutput,
  type NonprofitContext,
  type VideoJobInternalStatus,
  type VideoJobStatus,
} from "@/lib/campaign";
import { getUrgencyLabel, type NonProfitProfile } from "@/lib/nonprofits";
import { useSessionStore } from "@/lib/state";
import { generateShameMeme } from "@/agents/editor";

const ACTIVE_JOB_STATUSES = new Set<VideoJobInternalStatus>([
  "initializing",
  "planning",
  "create_request_sent",
  "waiting_for_operation_id",
  "polling_provider",
  "provider_completed",
  "downloading_asset",
  "stitching",
]);

const IS_DEVELOPMENT = process.env.NODE_ENV !== "production";

export function CampaignStudioClient({
  initialNonProfit,
  latestGeneratedClipUrl,
}: {
  initialNonProfit: NonProfitProfile;
  latestGeneratedClipUrl?: string | null;
}) {
  const { 
    onboardingComplete, 
    setSelectedCharity,
    profileVideoUrl,
    setShameMemeDataUrl
  } = useSessionStore();
  const nonprofitContext = useMemo(
    () => buildNonprofitContext(initialNonProfit),
    [initialNonProfit],
  );
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<CampaignVideoOutput | null>(null);
  const [job, setJob] = useState<VideoJobStatus | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const isUnmountedRef = useRef(false);
  const pollTokenRef = useRef(0);

  useEffect(() => {
    setSelectedCharity(initialNonProfit);
  }, [initialNonProfit, setSelectedCharity]);

  useEffect(() => {
    return () => {
      isUnmountedRef.current = true;
      pollTokenRef.current += 1;
    };
  }, []);

  const contextBullets = useMemo(
    () => [
      `${nonprofitContext.volunteerSlots} active volunteer slots in ${nonprofitContext.city}`,
      `Priority level: ${nonprofitContext.urgency} (${nonprofitContext.urgencyScore}/100)`,
      `${nonprofitContext.currentNeeds.slice(0, 2).join(" and ")}`,
      nonprofitContext.website
        ? `Public site ready at ${nonprofitContext.website}`
        : "Public volunteer site not yet surfaced",
    ],
    [nonprofitContext],
  );

  const isGenerating = job
    ? ACTIVE_JOB_STATUSES.has(job.internalStatus) && !job.finalVideoUrl
    : status === "loading";
  const fallbackMode = job?.mode === "fallback";
  const hasCompletedVideo = Boolean(job?.completed && job?.finalVideoUrl);
  const effectiveOutput = output ?? job?.fallbackStoryboard ?? null;
  const servedVideoUrl = job?.finalVideoUrl ?? null;
  const uiRenderMode = hasCompletedVideo
    ? "completed-video"
    : fallbackMode
      ? "fallback-storyboard"
      : isGenerating
        ? "loading"
        : "idle";
  const campaignTitle = job?.plan?.campaignTitle ?? effectiveOutput?.videoTitle;
  const campaignCta = job?.plan?.callToAction ?? effectiveOutput?.callToAction;
  const currentModeLabel =
    job?.mode === "single_clip"
      ? "Single clip proof-of-life mode"
      : job?.mode === "multi_scene"
        ? "Full multi-scene render mode"
        : "Storyboard fallback mode";
  const stitchingMessage = job?.debugInfo?.stitchingRequired
    ? "Stitching required after all clips render"
    : "No stitching required in this mode";
  const previewScene = job?.plan?.scenes[0];
  const clipFileName = servedVideoUrl?.split("/").pop() ?? null;
  const clipDurationLabel = previewScene?.durationSeconds
    ? `Approx. ${previewScene.durationSeconds}s clip`
    : null;

  const syncJobState = (nextJob: VideoJobStatus) => {
    if (isUnmountedRef.current) {
      return;
    }

    setJob(nextJob);

    if (nextJob.completed && !nextJob.finalVideoUrl) {
      setStatus("error");
      setError("Completed job has no browser video URL.");
      return;
    }

    if (nextJob.completed && nextJob.finalVideoUrl) {
      setStatus("done");
      setError(null);
      return;
    }

    if (
      nextJob.fallbackStoryboard &&
      (nextJob.internalStatus === "completed" || nextJob.mode === "fallback")
    ) {
      setOutput(nextJob.fallbackStoryboard);
    }

    if (ACTIVE_JOB_STATUSES.has(nextJob.internalStatus)) {
      setStatus("loading");
      setError(null);
      return;
    }

    if (nextJob.internalStatus === "completed") {
      setStatus("done");
      setError(null);
      return;
    }

    if (nextJob.mode === "fallback" && nextJob.fallbackStoryboard) {
      setStatus("done");
      setError(nextJob.errorMessage ?? null);
      return;
    }

    setStatus("error");
    setError(nextJob.errorMessage ?? "Campaign render failed.");
  };

  useEffect(() => {
    if (!output || !profileVideoUrl) return;

    async function generateMeme() {
      try {
        const response = await fetch(profileVideoUrl as string);
        const blob = await response.blob();
        const roast = output!.hookLine || "STILL NOT VOLUNTEERING";
        const dataUrl = await generateShameMeme(blob, roast);
        setShameMemeDataUrl(dataUrl);
      } catch (err) {
        console.error("Meme generation failed", err);
      }
    }

    void generateMeme();
  }, [output, profileVideoUrl, setShameMemeDataUrl]);

  const pollJobUntilSettled = async (jobId: string, pollToken: number) => {
    while (!isUnmountedRef.current && pollTokenRef.current === pollToken) {
      const response = await fetch(`/api/video/status/${jobId}`, {
        cache: "no-store",
      });

      if (isUnmountedRef.current || pollTokenRef.current !== pollToken) {
        return;
      }

      if (!response.ok) {
        throw new Error("Could not read video render status.");
      }

      const nextJob = (await response.json()) as VideoJobStatus;

      if (isUnmountedRef.current || pollTokenRef.current !== pollToken) {
        return;
      }

      syncJobState(nextJob);

      if (
        (nextJob.completed && nextJob.finalVideoUrl) ||
        (nextJob.completed && !nextJob.finalVideoUrl) ||
        nextJob.mode === "fallback" ||
        !ACTIVE_JOB_STATUSES.has(nextJob.internalStatus)
      ) {
        return;
      }

      await sleep(2500);
    }
  };

  const handleGenerate = async () => {
    const nextPollToken = pollTokenRef.current + 1;
    const nowIso = new Date().toISOString();
    const localMode = IS_DEVELOPMENT ? "single_clip" : "multi_scene";
    pollTokenRef.current = nextPollToken;

    setStatus("loading");
    setError(null);
    setOutput(null);
    setJob({
      jobId: "pending",
      status: "initializing",
      completed: false,
      internalStatus: "initializing",
      progressPercent: 2,
      currentStep: "Initializing AI video render",
      mode: localMode,
      createdAt: nowIso,
      updatedAt: nowIso,
      providerName: "Google Veo 3.1",
      providerStatus: "pending",
      scenesCompleted: 0,
      totalScenes: localMode === "single_clip" ? 1 : 4,
      debugInfo: {
        requestedMode: localMode,
        effectiveMode: localMode,
        fallbackTriggered: false,
        stitchingRequired: localMode === "multi_scene",
        latestProviderEvent: "job_created",
        requestedInEnvironment: IS_DEVELOPMENT ? "development" : "production",
      },
    });

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonprofitId: nonprofitContext.id,
          nonprofitContext,
          optionalPrompt: prompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Video render could not be started.");
      }

      const data = (await response.json()) as {
        jobId: string;
        requestedMode?: "single_clip" | "multi_scene";
      };
      setJob((currentJob) =>
        currentJob
          ? {
              ...currentJob,
              jobId: data.jobId,
              mode: data.requestedMode ?? currentJob.mode,
              totalScenes: data.requestedMode === "multi_scene" ? 4 : 1,
              debugInfo: currentJob.debugInfo
                ? {
                    ...currentJob.debugInfo,
                    requestedMode:
                      data.requestedMode ?? currentJob.debugInfo.requestedMode,
                    effectiveMode:
                      data.requestedMode ?? currentJob.debugInfo.effectiveMode,
                  }
                : currentJob.debugInfo,
            }
          : currentJob,
      );
      await pollJobUntilSettled(data.jobId, nextPollToken);
    } catch (renderError) {
      const fallbackOutput = await loadStoryboardFallback(
        nonprofitContext.id,
        nonprofitContext,
        prompt,
      );

      if (fallbackOutput) {
        syncJobState({
          jobId: "fallback-local",
          status: "fallback",
          completed: false,
          internalStatus: "failed_init",
          progressPercent: 100,
          currentStep:
            "Video render unavailable — showing storyboard fallback.",
          mode: "fallback",
          createdAt: nowIso,
          updatedAt: new Date().toISOString(),
          providerName: "Google Veo 3.1",
          providerStatus: "failed_init",
          scenesCompleted: 0,
          totalScenes: 0,
          fallbackStoryboard: fallbackOutput,
          errorMessage:
            renderError instanceof Error
              ? renderError.message
              : "Video render could not be started.",
          debugInfo: {
            requestedMode: localMode,
            effectiveMode: localMode,
            fallbackTriggered: true,
            stitchingRequired: localMode === "multi_scene",
            fallbackReason:
              renderError instanceof Error
                ? renderError.message
                : "Video render could not be started.",
            terminalFailureReason:
              renderError instanceof Error
                ? renderError.message
                : "Video render could not be started.",
            latestProviderEvent: "local_fallback_rendered",
            requestedInEnvironment: IS_DEVELOPMENT ? "development" : "production",
          },
        });
        return;
      }

      setJob(null);
      setStatus("error");
      setError(
        "Video render could not be started and the storyboard fallback could not be loaded.",
      );
    }
  };

  const handleCopyCta = async () => {
    if (!campaignCta) return;

    try {
      await navigator.clipboard.writeText(campaignCta);
      setError(null);
    } catch {
      setError("Copy failed in this browser, but the CTA is still visible below.");
    }
  };

  const handleDownloadScript = () => {
    if (!effectiveOutput) return;

    const content = [
      effectiveOutput.videoTitle,
      "",
      `Hook: ${effectiveOutput.hookLine}`,
      `Tone: ${effectiveOutput.tone}`,
      `Audience: ${effectiveOutput.targetAudience}`,
      "",
      "Narration",
      effectiveOutput.narrationScript,
      "",
      "Call To Action",
      effectiveOutput.callToAction,
      "",
      "Scene Breakdown",
      ...effectiveOutput.sceneBreakdown.map(
        (scene) =>
          `Scene ${scene.scene}\nVisual: ${scene.visual}\nVoiceover: ${scene.voiceover}\nOn-screen: ${scene.onscreenText}\n`,
      ),
    ].join("\n");

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${initialNonProfit.id}-campaign-script.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleUseLatestGeneratedClip = async () => {
    if (!latestGeneratedClipUrl) {
      setStatus("error");
      setError("No generated clip found under public/generated/jobs.");
      return;
    }

    const nextPollToken = pollTokenRef.current + 1;
    pollTokenRef.current = nextPollToken;

    const nowIso = new Date().toISOString();

    syncJobState({
      jobId: "dev-existing-clip",
      status: "completed",
      completed: true,
      internalStatus: "completed",
      progressPercent: 100,
      currentStep: "Loaded an existing generated clip for local testing.",
      mode: "single_clip",
      createdAt: nowIso,
      updatedAt: nowIso,
      providerName: "Google Veo 3.1",
      providerStatus: "completed",
      providerOperationId: "dev-existing-clip",
      scenesCompleted: 1,
      totalScenes: 1,
      finalVideoUrl: latestGeneratedClipUrl,
      rawClipUrls: [latestGeneratedClipUrl],
      fallbackStoryboard: output ?? undefined,
      debugInfo: {
        requestedMode: "single_clip",
        effectiveMode: "single_clip",
        fallbackTriggered: false,
        stitchingRequired: false,
        ffmpegAvailable: true,
        latestProviderEvent: "existing_clip_loaded",
        terminalFailureReason: undefined,
        requestedInEnvironment: "development",
      },
    });

    if (!output) {
      const fallbackOutput = await loadStoryboardFallback(
        nonprofitContext.id,
        nonprofitContext,
        prompt,
      );

      if (
        fallbackOutput &&
        !isUnmountedRef.current &&
        pollTokenRef.current === nextPollToken
      ) {
        setOutput(fallbackOutput);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(57,183,176,0.18),transparent_30%),linear-gradient(180deg,#0d6f77_0px,#0d6f77_235px,#edf7f5_235px,#f8fcfb_100%)]">
      <header className="border-b border-white/15 bg-[#0d6f77]/95 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-2xl">
              V
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-teal-100/80">
                Hostile Philanthropy
              </p>
              <h1 className="text-3xl font-black tracking-tight">Campaign Studio</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/nonprofits/${initialNonProfit.id}`}
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Mission Brief
            </Link>
            <Link
              href="/onboarding"
              className="rounded-2xl border border-[#f6d470] bg-[#f6d470] px-5 py-3 text-sm font-bold text-[#11454f] transition hover:bg-[#ffe08e]"
            >
              {onboardingComplete ? "Profile Ready" : "Login"}
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-14 lg:px-8 lg:pt-20">
        <div className="mx-auto max-w-6xl space-y-6">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <Link
              href={`/nonprofits/${initialNonProfit.id}`}
              className="rounded-full border border-[#0d6f77]/15 bg-white/80 px-4 py-2 font-semibold text-[#0d6f77] shadow-[0_12px_30px_rgba(17,69,79,0.08)] transition hover:bg-white"
            >
              ← Back to mission brief
            </Link>
            <div className="rounded-full border border-[#0d6f77]/10 bg-white/70 px-4 py-2 font-semibold text-slate-700 shadow-[0_12px_30px_rgba(17,69,79,0.06)]">
              Campaign context loaded
            </div>
            {isGenerating && (
              <div className="rounded-full border border-[#0d6f77]/15 bg-[#0d6f77] px-4 py-2 font-semibold text-white shadow-[0_12px_30px_rgba(17,69,79,0.16)]">
                AI video render in progress
              </div>
            )}
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <aside className="space-y-6">
              <section className="rounded-[34px] border border-white/70 bg-white p-6 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                  Nonprofit context
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-[#0b6570]">
                  {nonprofitContext.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {nonprofitContext.address}
                </p>
                <p className="mt-5 text-base leading-8 text-slate-700">
                  {nonprofitContext.mission}
                </p>

                <div className="mt-6 rounded-[28px] bg-[#f7faf9] p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                    What the AI already knows
                  </p>
                  <ul className="mt-4 space-y-3 text-sm leading-7 text-slate-600">
                    {contextBullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-3">
                        <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-[#0d6f77]" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              <section className="rounded-[34px] bg-[#0d6f77] p-6 text-white shadow-[0_24px_55px_rgba(17,69,79,0.18)]">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-100/75">
                  Quick stats
                </p>
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <StudioStat
                    label="Urgency"
                    value={getUrgencyLabel(initialNonProfit.compliancePriority)}
                  />
                  <StudioStat label="Open Slots" value={String(initialNonProfit.openRoles)} />
                  <StudioStat label="Rating" value={initialNonProfit.rating.toFixed(1)} />
                  <StudioStat
                    label="Reviews"
                    value={String(initialNonProfit.reviewCount)}
                  />
                </div>
              </section>
            </aside>

            <div className="space-y-6">
              <section className="rounded-[34px] border border-white/70 bg-white p-6 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                      Creative direction
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-[#0b6570]">
                      Give the campaign a direction (optional)
                    </h3>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {IS_DEVELOPMENT && latestGeneratedClipUrl ? (
                      <button
                        type="button"
                        onClick={handleUseLatestGeneratedClip}
                        disabled={isGenerating}
                        className="inline-flex items-center justify-center rounded-2xl border border-[#0d6f77]/15 bg-white px-5 py-4 text-sm font-semibold text-[#0d6f77] transition hover:bg-[#f7faf9] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Use latest generated clip
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={handleGenerate}
                      disabled={isGenerating}
                      className="inline-flex items-center justify-center rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Generate 30sec video
                    </button>
                  </div>
                </div>

                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={6}
                  placeholder={
                    "Make it emotional and community-focused\nTarget college volunteers\nCreate a fast-paced social media style pitch"
                  }
                  className="mt-5 w-full rounded-[28px] border border-slate-200 bg-[#f7faf9] px-5 py-4 text-sm leading-7 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0d6f77] focus:ring-4 focus:ring-[#0d6f77]/12"
                />

                {job && (
                  <div className="mt-5 rounded-[28px] bg-[#f7faf9] p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                          {isGenerating
                            ? "AI video render in progress"
                            : "Video render status"}
                        </p>
                        <p className="mt-2 text-base font-semibold text-slate-900">
                          {job.currentStep}
                        </p>
                      </div>
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                        {Math.round(job.progressPercent)}%
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <StatusPill label={currentModeLabel} />
                      <StatusPill label={stitchingMessage} />
                      {job.providerStatus ? (
                        <StatusPill label={`${job.providerName} • ${job.providerStatus}`} />
                      ) : null}
                    </div>

                    <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0d6f77] to-[#37b7b0] transition-all duration-300"
                        style={{ width: `${job.progressPercent}%` }}
                      />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                      <span>{job.currentStep}</span>
                      <span>
                        Scene progress {job.scenesCompleted}/{job.totalScenes}
                      </span>
                    </div>

                    {IS_DEVELOPMENT && (
                      <details className="mt-4 rounded-[24px] border border-slate-200 bg-white px-4 py-4 text-sm text-slate-700">
                        <summary className="cursor-pointer font-semibold text-[#0b6570]">
                          Development debug status
                        </summary>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DebugRow label="Mode" value={job.mode} />
                          <DebugRow label="UI render mode" value={uiRenderMode} />
                          <DebugRow label="Internal status" value={job.internalStatus} />
                          <DebugRow label="Status field" value={job.status} />
                          <DebugRow
                            label="Completed flag"
                            value={job.completed ? "Yes" : "No"}
                          />
                          <DebugRow label="Provider" value={job.providerName} />
                          <DebugRow label="Provider status" value={job.providerStatus} />
                          <DebugRow
                            label="Operation id"
                            value={job.providerOperationId ?? "Not assigned yet"}
                          />
                          <DebugRow
                            label="Create status code"
                            value={
                              job.debugInfo?.createRequestStatusCode
                                ? String(job.debugInfo.createRequestStatusCode)
                                : "Not returned yet"
                            }
                          />
                          <DebugRow
                            label="Final video URL"
                            value={job.finalVideoUrl ?? "Not available yet"}
                          />
                          <DebugRow
                            label="Scene counts"
                            value={`${job.scenesCompleted}/${job.totalScenes}`}
                          />
                          <DebugRow
                            label="Poll count"
                            value={String(job.debugInfo?.providerPollAttempts ?? 0)}
                          />
                          <DebugRow
                            label="Last poll"
                            value={
                              job.debugInfo?.lastPollTimestamp
                                ? formatTimestamp(job.debugInfo.lastPollTimestamp)
                                : "Not polled yet"
                            }
                          />
                          <DebugRow
                            label="Retry count"
                            value={String(job.debugInfo?.retryCount ?? 0)}
                          />
                          <DebugRow
                            label="Last HTTP status"
                            value={
                              job.debugInfo?.lastHttpStatus
                                ? String(job.debugInfo.lastHttpStatus)
                                : "Not returned yet"
                            }
                          />
                          <DebugRow
                            label="Provider error code"
                            value={
                              job.debugInfo?.lastProviderErrorCode ??
                              job.debugInfo?.lastProviderErrorStatus ??
                              "None"
                            }
                          />
                          <DebugRow
                            label="Next retry"
                            value={
                              job.debugInfo?.nextRetryAt
                                ? formatTimestamp(job.debugInfo.nextRetryAt)
                                : "None scheduled"
                            }
                          />
                          <DebugRow
                            label="Last updated"
                            value={formatTimestamp(job.updatedAt)}
                          />
                          <DebugRow
                            label="Fallback triggered"
                            value={job.debugInfo?.fallbackTriggered ? "Yes" : "No"}
                          />
                          <DebugRow
                            label="Quota exhausted"
                            value={job.debugInfo?.quotaError ? "Yes" : "No"}
                          />
                          <DebugRow
                            label="ffmpeg"
                            value={
                              job.debugInfo?.ffmpegAvailable === undefined
                                ? "Not checked yet"
                                : job.debugInfo.ffmpegAvailable
                                  ? "Available"
                                  : `Unavailable${job.debugInfo.ffmpegReason ? ` — ${job.debugInfo.ffmpegReason}` : ""}`
                            }
                          />
                          <DebugRow
                            label="Terminal failure"
                            value={job.debugInfo?.terminalFailureReason ?? "None"}
                          />
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-2">
                          <DebugJsonBlock
                            label="Create response"
                            value={job.debugInfo?.rawCreateResponse}
                          />
                          <DebugJsonBlock
                            label="Last poll response"
                            value={job.debugInfo?.rawPollResponse}
                          />
                        </div>
                        {job.rawClipUrls?.length ? (
                          <div className="mt-4 space-y-2">
                            <p className="font-semibold text-slate-900">Raw clip URLs</p>
                            <div className="flex flex-col gap-2">
                              {job.rawClipUrls.map((clipUrl) => (
                                <a
                                  key={clipUrl}
                                  href={clipUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#0d6f77] underline decoration-[#0d6f77]/35 underline-offset-4"
                                >
                                  {clipUrl}
                                </a>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        {job.finalVideoUrl ? (
                          <div className="mt-4">
                            <a
                              href={job.finalVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex rounded-2xl border border-slate-200 bg-[#f7faf9] px-4 py-3 text-sm font-semibold text-[#0d6f77] transition hover:bg-white"
                            >
                              Open served clip
                            </a>
                          </div>
                        ) : null}
                        {job.errorMessage ? (
                          <p className="mt-4 rounded-2xl bg-amber-50 px-3 py-3 text-amber-800">
                            {job.errorMessage}
                          </p>
                        ) : null}
                      </details>
                    )}
                  </div>
                )}

                {error && !fallbackMode && (
                  <div className="mt-5 rounded-[24px] border border-red-200 bg-red-50 px-4 py-4 text-sm font-medium text-red-700">
                    {error}
                  </div>
                )}
              </section>

              <section className="rounded-[34px] border border-white/70 bg-white p-6 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                      Video output
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-[#0b6570]">
                      Rendered video and campaign plan
                    </h3>
                  </div>

                  {(effectiveOutput || servedVideoUrl) && (
                    <div className="flex flex-wrap gap-3">
                      {campaignCta && (
                        <button
                          type="button"
                          onClick={handleCopyCta}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Copy CTA
                        </button>
                      )}
                      {effectiveOutput && (
                        <button
                          type="button"
                          onClick={handleDownloadScript}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          Download script
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="rounded-2xl border border-[#0d6f77]/15 bg-[#0d6f77] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6570] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>

                {!servedVideoUrl && !effectiveOutput && isGenerating ? (
                  <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[#0d6f77]/20 bg-[#f7faf9] px-8 text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#37b7b0]/25 border-t-[#0d6f77]" />
                    <p className="mt-5 text-sm font-semibold text-slate-700">
                      Building your campaign preview...
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                      {job?.mode === "single_clip"
                        ? "The studio is planning a reel and asking the provider for one real proof-of-life clip."
                        : "The studio is planning scenes, rendering portrait clips, and preparing a final stitched video."}
                    </p>
                  </div>
                ) : null}

                {!servedVideoUrl && !effectiveOutput && !isGenerating ? (
                  <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-[30px] border border-dashed border-[#0d6f77]/20 bg-[#f7faf9] px-8 text-center text-sm leading-7 text-slate-500">
                    Your generated 30-second campaign output will appear here.
                  </div>
                ) : null}

                {fallbackMode && (
                  <div className="mt-5 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-medium text-amber-800">
                    {job?.currentStep ?? "Video render unavailable — showing storyboard fallback."}
                    {job?.errorMessage ? ` ${job.errorMessage}` : ""}
                  </div>
                )}

                {servedVideoUrl && (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-[30px] border border-[#0d6f77]/12 bg-[#f7faf9] p-6 shadow-[0_12px_30px_rgba(17,69,79,0.05)]">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                        Generated asset
                      </p>
                      <h4 className="mt-3 text-2xl font-black text-[#0b6570]">
                        AI-generated campaign clip ready
                      </h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600">
                        The campaign studio finished rendering a real vertical clip and saved it as
                        a reusable asset for this nonprofit.
                      </p>

                      <div className="mt-5 grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
                        <div className="rounded-[24px] bg-white px-5 py-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d6f77]/65">
                            Served asset path
                          </p>
                          <p className="mt-3 break-all text-sm text-slate-700">
                            {servedVideoUrl}
                          </p>
                          {clipFileName ? (
                            <p className="mt-3 text-sm font-semibold text-slate-900">
                              File: {clipFileName}
                            </p>
                          ) : null}
                          {clipDurationLabel ? (
                            <p className="mt-2 text-sm text-slate-600">{clipDurationLabel}</p>
                          ) : null}
                        </div>

                        <div className="rounded-[24px] bg-white px-5 py-5">
                          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d6f77]/65">
                            Ready to use
                          </p>
                          <div className="mt-4 flex flex-col gap-3">
                            <a
                              href={servedVideoUrl}
                              download
                              className="inline-flex items-center justify-center rounded-2xl bg-[#0d6f77] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#0b6570]"
                            >
                              Download video
                            </a>
                            <a
                              href={servedVideoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            >
                              Open video
                            </a>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 flex flex-wrap gap-2">
                        <StatusPill label={currentModeLabel} />
                        {previewScene?.purpose ? (
                          <StatusPill label={`Scene purpose: ${previewScene.purpose}`} />
                        ) : null}
                        {campaignTitle ? <StatusPill label={campaignTitle} /> : null}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <OutputCard label="Title" content={campaignTitle ?? "Campaign render"} />
                      <OutputCard
                        label="Hook"
                        content={effectiveOutput?.hookLine ?? "Volunteer recruitment preview"}
                      />
                      <OutputCard
                        label="Call to action"
                        content={campaignCta ?? "Volunteer now"}
                        accent
                      />
                    </div>
                  </div>
                )}

                {effectiveOutput && (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-[30px] bg-[#f7faf9] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                            Storyboard title
                          </p>
                          <h4 className="mt-2 text-3xl font-black text-[#0b6570]">
                            {effectiveOutput.videoTitle}
                          </h4>
                        </div>
                        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                          {effectiveOutput.tone}
                        </div>
                      </div>
                      <p className="mt-5 text-lg leading-8 text-slate-700">
                        {effectiveOutput.hookLine}
                      </p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <OutputCard
                        label="Target audience"
                        content={effectiveOutput.targetAudience}
                      />
                      <OutputCard
                        label="Visual style"
                        content={effectiveOutput.visualStyle}
                      />
                    </div>

                    <OutputCard label="Concept" content={effectiveOutput.concept} />
                    <OutputCard label="Narration" content={effectiveOutput.narrationScript} />

                    <section className="rounded-[30px] bg-[#f7faf9] p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                        Scene breakdown
                      </p>
                      <div className="mt-4 space-y-4">
                        {effectiveOutput.sceneBreakdown.map((scene) => (
                          <div
                            key={scene.scene}
                            className="rounded-[24px] bg-white p-5 shadow-[0_12px_30px_rgba(17,69,79,0.05)]"
                          >
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                              Scene {scene.scene}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-slate-900">
                              {scene.visual}
                            </p>
                            <p className="mt-3 text-sm leading-7 text-slate-600">
                              {scene.voiceover}
                            </p>
                            <p className="mt-3 rounded-2xl bg-[#f7faf9] px-4 py-3 text-sm font-medium text-[#0d6f77]">
                              {scene.onscreenText}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <OutputCard
                        label="On-screen text"
                        content={effectiveOutput.onScreenText}
                      />
                      <OutputCard
                        label="Call to action"
                        content={effectiveOutput.callToAction}
                        accent
                      />
                    </div>
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function StudioStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white/10 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-100/75">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function OutputCard({
  accent = false,
  content,
  label,
}: {
  accent?: boolean;
  content: string;
  label: string;
}) {
  return (
    <section
      className={`rounded-[30px] p-6 ${accent ? "bg-[#fff6dc]" : "bg-[#f7faf9]"}`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-[0.24em] ${accent ? "text-[#7a5b00]" : "text-[#0d6f77]/70"}`}
      >
        {label}
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-700">{content}</p>
    </section>
  );
}

function StatusPill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-[#0d6f77]/10 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">
      {label}
    </div>
  );
}

function DebugRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d6f77]/65">
        {label}
      </p>
      <p className="mt-2 break-all text-sm text-slate-700">
        {value && value.trim() ? value : "n/a"}
      </p>
    </div>
  );
}

function DebugJsonBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-2xl bg-[#f7faf9] px-3 py-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0d6f77]/65">
        {label}
      </p>
      <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-slate-700">
        {value ? JSON.stringify(value, null, 2) : "n/a"}
      </pre>
    </div>
  );
}

async function loadStoryboardFallback(
  nonprofitId: string,
  nonprofitContext: NonprofitContext,
  prompt: string,
) {
  try {
    const response = await fetch(`/api/nonprofits/${nonprofitId}/campaign`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nonprofitId,
        nonprofitContext,
        userPrompt: prompt.trim() || undefined,
      }),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as CampaignVideoOutput;
  } catch {
    return null;
  }
}

function formatTimestamp(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

function sleep(delayMs: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
