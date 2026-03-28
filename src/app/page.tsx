"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";
import {
  featuredNonProfits,
  sortDirectoryNonProfits,
  type NonProfitProfile,
  type DirectorySortKey,
} from "@/lib/nonprofits";

export default function HomePage() {
  const router = useRouter();
  const { onboardingComplete, userName, setSelectedCharity } = useSessionStore();
  const [sortBy, setSortBy] = useState<DirectorySortKey>("priority");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    // Clear selected charity when we are on the directory page
    setSelectedCharity(null);
  }, [setSelectedCharity]);

  const filteredOrganizations = featuredNonProfits.filter((organization) => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      [
        organization.name,
        organization.category,
        organization.city,
        organization.state,
        organization.address,
        organization.mission,
        organization.latestNote,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    return matchesQuery;
  });

  const visibleOrganizations = sortDirectoryNonProfits(filteredOrganizations, sortBy);
  const sortOptions: { value: DirectorySortKey; label: string }[] = [
    { value: "priority", label: "Compliance Priority" },
    { value: "reviews", label: "Most Reviewed" },
    { value: "rating", label: "Highest Rating" },
    { value: "name", label: "Name" },
  ];

  const handleSelectOrganization = (organization: NonProfitProfile) => {
    setSelectedCharity(organization);
    router.push(`/nonprofits/${organization.id}`);
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
                onClick={() => router.push("/onboarding")}
                className="rounded-2xl border border-[#f6d470] bg-[#f6d470] px-5 py-3 text-sm font-bold text-[#11454f] transition hover:bg-[#ffe08e]"
              >
                {onboardingComplete ? "Profile Ready" : "Login"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex w-full flex-col gap-3 lg:flex-row lg:items-center">
              <span className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-semibold text-white">
                Home
              </span>
              <label className="flex flex-1 items-center gap-3 rounded-[24px] bg-white px-4 py-3 shadow-[0_18px_45px_rgba(7,24,28,0.18)]">
                <span className="text-lg text-[#0d6f77]">⌕</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search organizations, causes, or city"
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-3 rounded-[24px] bg-white px-4 py-3 shadow-[0_18px_45px_rgba(7,24,28,0.18)] lg:min-w-[220px]">
                <span className="text-xs font-bold uppercase tracking-[0.22em] text-[#0d6f77]/70">
                  Sort By
                </span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as DirectorySortKey)}
                  className="w-full bg-transparent text-sm font-semibold text-slate-900 focus:outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-14 lg:px-8 lg:pb-12 lg:pt-20">
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

        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-4xl font-black tracking-tight text-[#0b6570] md:text-5xl">
                Atlanta Nonprofits and Charities
              </h2>
            </div>
            <div className="rounded-2xl bg-white/80 px-4 py-3 text-sm text-slate-600 shadow-[0_12px_30px_rgba(17,69,79,0.08)]">
              Showing <span className="font-bold text-slate-900">{visibleOrganizations.length}</span> matches
            </div>
          </div>

          {visibleOrganizations.length === 0 ? (
            <div className="rounded-[30px] border border-dashed border-[#0d6f77]/25 bg-white/80 p-12 text-center shadow-[0_18px_45px_rgba(17,69,79,0.05)]">
              <p className="text-lg font-semibold text-slate-900">No organizations match that search yet.</p>
              <p className="mt-2 text-sm text-slate-600">
                Try clearing the search to bring the Atlanta list back into view.
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
                        <p className="mt-1 text-xs uppercase tracking-[0.22em]">Volunteer intake open</p>
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

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => handleSelectOrganization(organization)}
                        className="rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b]"
                      >
                        View Mission Brief
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </main>
  );
}
