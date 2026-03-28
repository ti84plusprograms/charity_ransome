"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";
import {
  featuredNonProfits,
  sortDirectoryNonProfits,
  type DirectorySortKey,
} from "@/lib/nonprofits";

export default function HomePage() {
  const router = useRouter();
  const { onboardingComplete, userName, ironyScore, setUserName, setSelectedCharity } = useSessionStore();
  
  // ree state
  const [sortBy, setSortBy] = useState<DirectorySortKey>("priority");
  const [searchQuery, setSearchQuery] = useState("");
  const [zipCode, setZipCode] = useState("");
  
  // ary state
  const [name, setName] = useState(userName || "");
  const [roast, setRoast] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetRoasted = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setUserName(name);
    try {
      const res = await fetch("/api/shoutout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "roast", userName: name, ironyScore }),
      });
      const data = await res.json();
      setRoast(data.message);
    } catch {
      setRoast("Our roastmaster is temporarily on vacation (probably volunteering). Try again!");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrganizations = featuredNonProfits.filter((organization) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const normalizedZip = zipCode.trim();
    const matchesQuery =
      !normalizedQuery ||
      [
        organization.name,
        organization.category,
        organization.city,
        organization.state,
        organization.address,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    const matchesZip = !normalizedZip || organization.zip.startsWith(normalizedZip);
    return matchesQuery && matchesZip;
  });

  const visibleOrganizations = sortDirectoryNonProfits(filteredOrganizations, sortBy);
  const sortOptions: { value: DirectorySortKey; label: string; description: string }[] = [
    {
      value: "priority",
      label: "Compliance Priority",
      description: "Show the most urgent volunteer needs first.",
    },
    {
      value: "reviews",
      label: "Most Reviewed",
      description: "Bring the busiest community profiles to the top.",
    },
    {
      value: "rating",
      label: "Highest Rating",
      description: "Prioritize the strongest feedback signals.",
    },
    {
      value: "name",
      label: "Name",
      description: "Alphabetical A-Z ordering.",
    },
  ];

  const handleSelectOrganization = (id: string, name: string, city: string, route: string) => {
    setSelectedCharity({ id, name, city });
    router.push(route);
  };

  const renderStars = (rating: number) => {
    const rounded = Math.round(rating);
    return "★".repeat(rounded) + "☆".repeat(Math.max(0, 5 - rounded));
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(57,183,176,0.18),transparent_30%),linear-gradient(180deg,#0d6f77_0px,#0d6f77_235px,#edf7f5_235px,#f8fcfb_100%)]">
      <header className="border-b border-white/15 bg-[#0d6f77]/95 text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-5 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
              <button
                onClick={() => router.push("/campaign")}
                className="rounded-2xl border border-white/25 bg-white/8 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Browse Mission Briefs
              </button>
              <button
                onClick={() => router.push("/onboarding")}
                className="rounded-2xl border border-[#f6d470] bg-[#f6d470] px-5 py-3 text-sm font-bold text-[#11454f] transition hover:bg-[#ffe08e]"
              >
                {onboardingComplete ? "Profile Ready" : "Login"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <nav className="flex flex-wrap gap-6 text-sm text-teal-50/90">
              <span className="font-semibold text-white">Home</span>
              <span>Top Priority Causes</span>
              <span>Volunteer Desk</span>
              <span>Impact Reports</span>
              <span>Accountability</span>
            </nav>

            <div className="grid gap-3 rounded-[28px] bg-white p-2 shadow-[0_18px_45px_rgba(7,24,28,0.18)] lg:min-w-[520px] lg:grid-cols-[1.5fr_0.85fr_auto]">
              <label className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] px-4 py-3">
                <span className="text-lg text-[#0d6f77]">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Organization, city, or cause"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-3 rounded-2xl bg-[#f7faf9] px-4 py-3">
                <span className="text-lg text-[#0d6f77]">◎</span>
                <input
                  type="text"
                  value={zipCode}
                  onChange={(event) => setZipCode(event.target.value)}
                  inputMode="numeric"
                  placeholder="Zip code"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />
              </label>
              <button
                onClick={() => router.push("/onboarding")}
                className="rounded-2xl bg-[#0d6f77] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0a5d64]"
              >
                Start Onboarding
              </button>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        {/* Compliance Assessment (Roastmaster Integration) */}
        <div className="mb-8 rounded-[34px] border border-[#0d6f77]/15 bg-slate-900 text-white p-6 md:p-8 shadow-[0_24px_55px_rgba(17,69,79,0.15)]">
          <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600/20 text-xl">
                  🎯
                </div>
                <h2 className="text-2xl font-black tracking-tight">Step 1: Compliance Assessment</h2>
              </div>
              <p className="text-teal-50/70 text-sm leading-relaxed max-w-xl">
                The Aggressive Recruiter system is now integrated. Enter your name below so our AI can 
                personally judge your volunteer eligibility. <span className="text-orange-400">Your excuses are not impressive.</span>
              </p>
              
              <div className="flex gap-3 max-w-md">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleGetRoasted()}
                  placeholder="Your name (we'll be gentle-ish)"
                  className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-orange-500 transition"
                />
                <button
                  onClick={handleGetRoasted}
                  disabled={loading || !name.trim()}
                  className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-2xl transition shadow-[0_8px_20px_rgba(234,88,12,0.3)]"
                >
                  {loading ? "Roasting..." : "Roast Me"}
                </button>
              </div>

              {roast && (
                <div className="bg-orange-950/40 border border-orange-800/50 rounded-2xl p-4 text-orange-100 text-sm leading-relaxed animate-in fade-in slide-in-from-top-4">
                  <p className="text-orange-400 font-bold mb-1">🎤 The Roastmaster says:</p>
                  <p className="italic">"{roast}"</p>
                </div>
              )}
            </div>

            {/* Irony Score Panel */}
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col justify-center">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-100/50">Your Irony Score™</p>
                <span className="text-orange-400 font-black text-xl">{ironyScore}/100</span>
              </div>
              <div className="bg-white/10 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-600 h-full transition-all duration-1000 ease-out"
                  style={{ width: `${ironyScore}%` }}
                />
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-[0.1em] text-teal-100/40 text-center">
                Score increases based on abandonment and excuses
              </p>
            </div>
          </div>
        </div>

        {onboardingComplete && (
          <div className="mb-8 rounded-[28px] border border-[#0d6f77]/10 bg-white/90 p-5 shadow-[0_18px_45px_rgba(17,69,79,0.08)]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#0d6f77]/70">
                  Intake complete
                </p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {userName || "Volunteer"} is cleared for onboarding review.
                </p>
              </div>
              <button
                onClick={() => router.push("/onboarding")}
                className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Update profile
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-8 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <aside className="rounded-[30px] border border-[#0d6f77]/12 bg-white/95 p-6 shadow-[0_18px_45px_rgba(17,69,79,0.08)]">
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#0d6f77]/70">
              Directory Controls
            </p>
            <h2 className="mt-3 text-3xl font-black text-slate-900">Sort By</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              This filter is live and will reorder the visible nonprofit cards immediately.
            </p>

            <div className="mt-6 space-y-3">
              {sortOptions.map((option) => {
                const isActive = sortBy === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortBy(option.value)}
                    className={`w-full rounded-2xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[#0d6f77] bg-[#0d6f77] text-white shadow-[0_12px_28px_rgba(13,111,119,0.25)]"
                        : "border-slate-200 bg-slate-50 text-slate-900 hover:border-[#0d6f77]/40 hover:bg-white"
                    }`}
                  >
                    <p className="text-sm font-bold">{option.label}</p>
                    <p className={`mt-1 text-xs ${isActive ? "text-teal-50/90" : "text-slate-500"}`}>
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                  Atlanta Queue
                </p>
                <h2 className="mt-2 text-4xl font-black tracking-tight text-[#0b6570] md:text-5xl">
                  Atlanta Nonprofits and Charities
                </h2>
                <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                  The portal is now framed as a volunteer intake directory. High-priority missions are
                  ranked by compliance urgency.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(17,69,79,0.08)]">
                Showing <span className="font-bold text-slate-900">{visibleOrganizations.length}</span> matches
              </div>
            </div>

            {visibleOrganizations.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-[#0d6f77]/25 bg-white/80 p-12 text-center shadow-[0_18px_45px_rgba(17,69,79,0.05)]">
                <p className="text-lg font-semibold text-slate-900">No organizations match that search yet.</p>
                <p className="mt-2 text-sm text-slate-600">
                  Try clearing the query or zip code to bring the Atlanta list back into view.
                </p>
              </div>
            ) : (
              visibleOrganizations.map((organization) => (
                <article
                  key={organization.id}
                  className="overflow-hidden rounded-[34px] border border-white/60 bg-white shadow-[0_24px_55px_rgba(17,69,79,0.09)]"
                >
                  <div className="grid gap-0 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <div
                      className="flex min-h-[220px] flex-col justify-between p-6 text-slate-950"
                      style={{
                        background: `linear-gradient(145deg, ${organization.accentFrom}, ${organization.accentTo})`,
                      }}
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-950/70">
                          {organization.category}
                        </p>
                        <div className="mt-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white/25 text-3xl font-black">
                          {organization.name.charAt(0)}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="inline-flex rounded-full bg-white/85 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-slate-900">
                          Priority {organization.compliancePriority}
                        </div>
                        <p className="text-sm leading-6 text-slate-900/85">
                          {organization.mission}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-6 p-6 md:p-8">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-[#0b6570]">{organization.name}</h3>
                          <p className="mt-2 text-base text-slate-600">
                            {organization.city}, {organization.state} {organization.zip}
                          </p>
                        </div>
                        <div className="rounded-2xl bg-[#fff6dc] px-4 py-3 text-right text-sm text-[#7a5b00]">
                          <p className="font-bold">{organization.openRoles} open volunteer slots</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.22em]">Mission brief active</p>
                        </div>
                      </div>

                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                        <div className="rounded-2xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Reviews</p>
                          <p className="mt-2 text-2xl font-black text-slate-900">{organization.reviewCount}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">Rating</p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {organization.rating.toFixed(1)}
                          </p>
                          <p className="mt-1 text-yellow-500">{renderStars(organization.rating)}</p>
                        </div>
                        <div className="rounded-2xl bg-slate-50 px-4 py-4">
                          <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                            Compliance
                          </p>
                          <p className="mt-2 text-2xl font-black text-slate-900">
                            {organization.compliancePriority}%
                          </p>
                        </div>
                      </div>

                      <div className="rounded-[28px] bg-slate-50 p-5">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-lg font-black text-[#0d6f77]">
                            {organization.latestReviewer.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{organization.latestReviewer}</p>
                            <p className="text-xs uppercase tracking-[0.22em] text-slate-500">
                              Latest mission note
                            </p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-7 text-slate-600">{organization.latestNote}</p>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectOrganization(
                              organization.id,
                              organization.name,
                              organization.city,
                              "/campaign",
                            )
                          }
                          className="rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b]"
                        >
                          View Mission Brief
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSelectOrganization(
                              organization.id,
                              organization.name,
                              organization.city,
                              "/onboarding",
                            )
                          }
                          className="rounded-2xl bg-[#f6d470] px-6 py-4 text-sm font-bold text-[#11454f] transition hover:bg-[#ffe08e]"
                        >
                          Join Mission
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
