"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSessionStore } from "@/lib/state";
import type { CampaignVideoOutput } from "@/lib/campaign";
import {
  buildNonProfitAddress,
  getUrgencyLabel,
  type NonProfitProfile,
} from "@/lib/nonprofits";

export function CampaignStudioClient({
  initialNonProfit,
}: {
  initialNonProfit: NonProfitProfile;
}) {
  const { onboardingComplete, setSelectedCharity } = useSessionStore();
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState<CampaignVideoOutput | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setSelectedCharity(initialNonProfit);
  }, [initialNonProfit, setSelectedCharity]);

  useEffect(() => {
    if (status !== "loading") {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      return;
    }

    setProgress(8);
    progressTimerRef.current = setInterval(() => {
      setProgress((current) => (current >= 92 ? current : current + Math.max(2, (92 - current) / 6)));
    }, 180);

    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    };
  }, [status]);

  const contextBullets = useMemo(
    () => [
      `${initialNonProfit.openRoles} active volunteer slots in ${initialNonProfit.city}`,
      `Priority level: ${getUrgencyLabel(initialNonProfit.compliancePriority)} (${initialNonProfit.compliancePriority}/100)`,
      `${initialNonProfit.currentNeeds.slice(0, 2).join(" and ")}`,
      initialNonProfit.website ? `Public site ready at ${initialNonProfit.website}` : "Public volunteer site not yet surfaced",
    ],
    [initialNonProfit],
  );

  const handleGenerate = async () => {
    setStatus("loading");
    setError(null);
    setOutput(null);

    try {
      const response = await fetch(`/api/nonprofits/${initialNonProfit.id}/campaign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nonprofitId: initialNonProfit.id,
          nonprofitContext: initialNonProfit,
          userPrompt: prompt.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Campaign generation failed.");
      }

      const data = (await response.json()) as CampaignVideoOutput;
      setOutput(data);
      setProgress(100);
      setStatus("done");
    } catch {
      setError("Campaign generation hit a snag. The nonprofit context is still loaded, so try again.");
      setStatus("error");
      setProgress(0);
    }
  };

  const handleCopyCta = async () => {
    if (!output?.callToAction) return;

    try {
      await navigator.clipboard.writeText(output.callToAction);
    } catch {
      setError("Copy failed in this browser, but the CTA is still visible below.");
    }
  };

  const handleDownloadScript = () => {
    if (!output) return;

    const content = [
      output.videoTitle,
      "",
      `Hook: ${output.hookLine}`,
      `Tone: ${output.tone}`,
      `Audience: ${output.targetAudience}`,
      "",
      "Narration",
      output.narrationScript,
      "",
      "Call To Action",
      output.callToAction,
      "",
      "Scene Breakdown",
      ...output.sceneBreakdown.map(
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
          </div>

          <div className="grid gap-6 xl:grid-cols-[0.88fr_1.12fr]">
            <aside className="space-y-6">
              <section className="rounded-[34px] border border-white/70 bg-white p-6 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                  Nonprofit context
                </p>
                <h2 className="mt-4 text-3xl font-black tracking-tight text-[#0b6570]">
                  {initialNonProfit.name}
                </h2>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {buildNonProfitAddress(initialNonProfit)}
                </p>
                <p className="mt-5 text-base leading-8 text-slate-700">{initialNonProfit.mission}</p>

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
                  <StudioStat label="Urgency" value={getUrgencyLabel(initialNonProfit.compliancePriority)} />
                  <StudioStat label="Open Slots" value={String(initialNonProfit.openRoles)} />
                  <StudioStat label="Rating" value={initialNonProfit.rating.toFixed(1)} />
                  <StudioStat label="Reviews" value={String(initialNonProfit.reviewCount)} />
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
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={status === "loading"}
                    className="inline-flex items-center justify-center rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Generate 30sec video
                  </button>
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

                {status === "loading" && (
                  <div className="mt-5 rounded-[28px] bg-[#f7faf9] p-5">
                    <div className="flex items-center justify-between text-sm font-semibold text-slate-700">
                      <span>Generating campaign output</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[#0d6f77] to-[#37b7b0] transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {error && (
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
                    <h3 className="mt-3 text-2xl font-black text-[#0b6570]">Storyboard and script output</h3>
                  </div>

                  {output && (
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleCopyCta}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Copy CTA
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadScript}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Download script
                      </button>
                    </div>
                  )}
                </div>

                {!output && status === "loading" ? (
                  <div className="mt-5 flex min-h-[360px] flex-col items-center justify-center rounded-[30px] border border-dashed border-[#0d6f77]/20 bg-[#f7faf9] px-8 text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#37b7b0]/25 border-t-[#0d6f77]" />
                    <p className="mt-5 text-sm font-semibold text-slate-700">
                      Building your 30-second campaign storyboard...
                    </p>
                    <p className="mt-2 max-w-xl text-sm leading-7 text-slate-500">
                      The studio is combining nonprofit context, urgency, and your optional direction into a structured concept.
                    </p>
                  </div>
                ) : null}

                {!output && status !== "loading" ? (
                  <div className="mt-5 flex min-h-[360px] items-center justify-center rounded-[30px] border border-dashed border-[#0d6f77]/20 bg-[#f7faf9] px-8 text-center text-sm leading-7 text-slate-500">
                    Your generated 30-second campaign output will appear here.
                  </div>
                ) : null}

                {output && (
                  <div className="mt-5 space-y-5">
                    <div className="rounded-[30px] bg-[#f7faf9] p-6">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                            Title
                          </p>
                          <h4 className="mt-2 text-3xl font-black text-[#0b6570]">{output.videoTitle}</h4>
                        </div>
                        <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700">
                          {output.tone}
                        </div>
                      </div>
                      <p className="mt-5 text-lg leading-8 text-slate-700">{output.hookLine}</p>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <OutputCard label="Target audience" content={output.targetAudience} />
                      <OutputCard label="Visual style" content={output.visualStyle} />
                    </div>

                    <OutputCard label="Concept" content={output.concept} />
                    <OutputCard label="Narration" content={output.narrationScript} />

                    <section className="rounded-[30px] bg-[#f7faf9] p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]/70">
                        Scene breakdown
                      </p>
                      <div className="mt-4 space-y-4">
                        {output.sceneBreakdown.map((scene) => (
                          <div key={scene.scene} className="rounded-[24px] bg-white p-5 shadow-[0_12px_30px_rgba(17,69,79,0.05)]">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                              Scene {scene.scene}
                            </p>
                            <p className="mt-3 text-sm font-semibold text-slate-900">{scene.visual}</p>
                            <p className="mt-3 text-sm leading-7 text-slate-600">{scene.voiceover}</p>
                            <p className="mt-3 rounded-2xl bg-[#f7faf9] px-4 py-3 text-sm font-medium text-[#0d6f77]">
                              {scene.onscreenText}
                            </p>
                          </div>
                        ))}
                      </div>
                    </section>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <OutputCard label="On-screen text" content={output.onScreenText} />
                      <OutputCard label="Call to action" content={output.callToAction} accent />
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
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-100/75">{label}</p>
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
    <section className={`rounded-[30px] p-6 ${accent ? "bg-[#fff6dc]" : "bg-[#f7faf9]"}`}>
      <p className={`text-xs font-bold uppercase tracking-[0.24em] ${accent ? "text-[#7a5b00]" : "text-[#0d6f77]/70"}`}>
        {label}
      </p>
      <p className="mt-4 text-sm leading-7 text-slate-700">{content}</p>
    </section>
  );
}
