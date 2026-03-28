"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";
import {
  buildNonProfitAddress,
  getUrgencyLabel,
  type NonProfitProfile,
} from "@/lib/nonprofits";

export function MissionBriefClient({
  initialNonProfit,
}: {
  initialNonProfit: NonProfitProfile;
}) {
  const router = useRouter();
  const { onboardingComplete, setSelectedCharity } = useSessionStore();
  const [nonProfit, setNonProfit] = useState(initialNonProfit);
  const [isEnriching, setIsEnriching] = useState(true);

  useEffect(() => {
    setSelectedCharity(initialNonProfit);
  }, [initialNonProfit, setSelectedCharity]);

  useEffect(() => {
    let isActive = true;

    async function enrichMissionBrief() {
      try {
        const response = await fetch(`/api/charities/${initialNonProfit.id}`);
        if (!response.ok) return;
        const data = (await response.json()) as NonProfitProfile;

        if (!isActive) return;

        setNonProfit(data);
        setSelectedCharity(data);
      } catch {
        // The local mission brief already covers the demo flow.
      } finally {
        if (isActive) {
          setIsEnriching(false);
        }
      }
    }

    void enrichMissionBrief();

    return () => {
      isActive = false;
    };
  }, [initialNonProfit.id, setSelectedCharity]);

  const missionSiteCta = nonProfit.website ? (
    <a
      href={nonProfit.website}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center justify-center rounded-2xl bg-[#0d6f77] px-6 py-4 text-sm font-bold text-white transition hover:bg-[#0a5d64]"
    >
      Wanna Volunteer? Let&apos;s go to the site
    </a>
  ) : (
    <button
      type="button"
      disabled
      className="inline-flex cursor-not-allowed items-center justify-center rounded-2xl bg-slate-300 px-6 py-4 text-sm font-bold text-slate-600"
    >
      Wanna Volunteer? Let&apos;s go to the site
    </button>
  );

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
              <h1 className="text-3xl font-black tracking-tight">Volunteer Compliance Portal</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              Home
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
              href="/"
              className="rounded-full border border-[#0d6f77]/15 bg-white/80 px-4 py-2 font-semibold text-[#0d6f77] shadow-[0_12px_30px_rgba(17,69,79,0.08)] transition hover:bg-white"
            >
              ← Back to directory
            </Link>
            <div className="rounded-full border border-[#0d6f77]/10 bg-white/70 px-4 py-2 font-semibold text-slate-700 shadow-[0_12px_30px_rgba(17,69,79,0.06)]">
              {isEnriching ? "Refreshing details from Google Places..." : "Mission brief ready"}
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <article className="rounded-[34px] border border-white/70 bg-white p-8 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-[#e7fbf8] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#0d6f77]">
                  Mission Brief
                </span>
                <span className="rounded-full bg-[#fff6dc] px-4 py-2 text-xs font-bold uppercase tracking-[0.24em] text-[#7a5b00]">
                  {nonProfit.category}
                </span>
              </div>

              <h2 className="mt-5 text-4xl font-black tracking-tight text-[#0b6570] md:text-5xl">
                {nonProfit.name}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {buildNonProfitAddress(nonProfit)}
              </p>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">{nonProfit.mission}</p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                {missionSiteCta}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCharity(nonProfit);
                    router.push(`/nonprofits/${nonProfit.id}/campaign`);
                  }}
                  className="inline-flex items-center justify-center rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b]"
                >
                  Generate Marketing Video
                </button>
              </div>

              {!nonProfit.website && (
                <p className="mt-3 text-sm text-slate-500">
                  A public volunteer site was not available in the current demo data, so that CTA stays disabled.
                </p>
              )}
            </article>

            <aside className="rounded-[34px] bg-[#0d6f77] p-6 text-white shadow-[0_24px_55px_rgba(17,69,79,0.18)]">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-teal-100/75">
                Current Status
              </p>
              <div className="mt-4 rounded-[28px] bg-white/10 p-5">
                <p className="text-sm text-teal-50/80">Urgency</p>
                <p className="mt-2 text-3xl font-black">{getUrgencyLabel(nonProfit.compliancePriority)}</p>
                <p className="mt-2 text-sm leading-6 text-teal-50/80">
                  Priority score {nonProfit.compliancePriority}/100. {nonProfit.whyThisMattersNow}
                </p>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <MetricCard label="Open Slots" value={String(nonProfit.openRoles)} />
                <MetricCard label="Rating" value={nonProfit.rating.toFixed(1)} />
                <MetricCard label="Reviews" value={String(nonProfit.reviewCount)} />
                <MetricCard label="Compliance" value={`${nonProfit.compliancePriority}%`} />
              </div>
            </aside>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <DetailCard title="What they do">
              <p className="text-sm leading-7 text-slate-600">
                {nonProfit.editorialSummary ?? nonProfit.whatTheyDo}
              </p>
            </DetailCard>
            <DetailCard title="Why this matters now">
              <p className="text-sm leading-7 text-slate-600">{nonProfit.whyThisMattersNow}</p>
              <p className="mt-4 rounded-2xl bg-[#f7faf9] px-4 py-4 text-sm leading-7 text-slate-600">
                {nonProfit.latestNote}
              </p>
            </DetailCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
            <DetailCard title="Current needs">
              <ul className="space-y-3 text-sm leading-7 text-slate-600">
                {nonProfit.currentNeeds.map((need) => (
                  <li key={need} className="flex items-start gap-3">
                    <span className="mt-2 inline-block h-2.5 w-2.5 rounded-full bg-[#0d6f77]" />
                    <span>{need}</span>
                  </li>
                ))}
              </ul>
            </DetailCard>

            <DetailCard title="Contact and site">
              <div className="space-y-4 text-sm leading-7 text-slate-600">
                <InfoRow label="Address" value={buildNonProfitAddress(nonProfit)} />
                <InfoRow
                  label="Website"
                  value={
                    nonProfit.website ? (
                      <a
                        href={nonProfit.website}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-[#0d6f77] underline decoration-[#0d6f77]/35 underline-offset-4"
                      >
                        {nonProfit.website}
                      </a>
                    ) : (
                      "No public site surfaced yet"
                    )
                  }
                />
                {nonProfit.phoneNumber && <InfoRow label="Phone" value={nonProfit.phoneNumber} />}
                {nonProfit.openingHours?.length ? (
                  <InfoRow
                    label="Hours"
                    value={
                      <div className="space-y-1">
                        {nonProfit.openingHours.map((line) => (
                          <div key={line}>{line}</div>
                        ))}
                      </div>
                    }
                  />
                ) : null}
              </div>
            </DetailCard>
          </div>
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-white/10 px-5 py-4">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-100/75">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function DetailCard({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <section className="rounded-[34px] border border-white/70 bg-white p-6 shadow-[0_24px_55px_rgba(17,69,79,0.09)]">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <div className="mt-1">{value}</div>
    </div>
  );
}
