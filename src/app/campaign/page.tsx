"use client";

import { useState } from "react";
import { useSessionStore } from "@/lib/state";
import { fetchLocalNonProfits } from "@/agents/scout";
import type { NonProfit } from "@/agents/scout";

export default function CampaignPage() {
  const { userName, selectedCharity, setSelectedCharity, ironyScore, generatedAdUrl, setRecommendationLetter, recommendationLetter } = useSessionStore();
  const [city, setCity] = useState("");
  const [charities, setCharities] = useState<NonProfit[]>([]);
  const [loadingCharities, setLoadingCharities] = useState(false);
  const [loadingLetter, setLoadingLetter] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [letterSent, setLetterSent] = useState(false);

  const handleFindCharities = async () => {
    if (!city.trim()) return;
    setLoadingCharities(true);
    try {
      const results = await fetchLocalNonProfits(city);
      setCharities(results);
    } catch {
      setCharities([]);
    } finally {
      setLoadingCharities(false);
    }
  };

  const handleGenerateLetter = async () => {
    setLoadingLetter(true);
    try {
      const res = await fetch("/api/shoutout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "letter",
          userName,
          charityName: selectedCharity?.name,
          city: selectedCharity?.city || city,
          ironyScore,
        }),
      });
      const data = await res.json();
      setRecommendationLetter(data.message);
    } catch {
      setRecommendationLetter("Letter generation failed. The postman is on strike.");
    } finally {
      setLoadingLetter(false);
    }
  };

  const handleSendShoutout = async () => {
    if (!recipientEmail || !recommendationLetter) return;
    try {
      await fetch("/api/shoutout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "send",
          recipientEmail,
          letter: recommendationLetter,
          userName,
          charityName: selectedCharity?.name,
        }),
      });
      setLetterSent(true);
    } catch {
      console.error("Failed to send shoutout");
    }
  };

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black">📋 Campaign HQ</h1>
          <p className="text-gray-400">Where good intentions meet satirical execution.</p>
        </div>

        {/* IronyScore Display */}
        <div className="bg-gray-900 rounded-xl p-4 border border-orange-800 flex items-center gap-4">
          <div className="text-4xl">🌡️</div>
          <div className="flex-1">
            <p className="text-sm text-gray-400">Current Irony Score™ (tab-switching penalty applies)</p>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex-1 bg-gray-700 rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${ironyScore}%` }}
                />
              </div>
              <span className="text-orange-400 font-bold">{ironyScore}/100</span>
            </div>
          </div>
        </div>

        {/* Scout: Find Local Charities */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 space-y-4">
          <h2 className="text-xl font-bold">🔍 Scout: Find Local Non-Profits</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleFindCharities()}
              placeholder="Enter your city"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleFindCharities}
              disabled={loadingCharities || !city.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg"
            >
              {loadingCharities ? "Scouting..." : "Find Charities"}
            </button>
          </div>

          {charities.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {charities.map((charity) => (
                <button
                  key={charity.id}
                  onClick={() => setSelectedCharity({ id: charity.id, name: charity.name, city: charity.city })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedCharity?.id === charity.id
                      ? "border-orange-500 bg-orange-950"
                      : "border-gray-600 bg-gray-800 hover:border-gray-400"
                  }`}
                >
                  <p className="font-bold">{charity.name}</p>
                  <p className="text-gray-400 text-sm">{charity.address}</p>
                  {charity.rating && (
                    <p className="text-yellow-400 text-sm mt-1">⭐ {charity.rating}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Generated Ad Preview */}
        {generatedAdUrl && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-green-700 space-y-4">
            <h2 className="text-xl font-bold">🎬 Your Charity Ad</h2>
            <video src={generatedAdUrl} controls className="w-full rounded-xl bg-black" />
          </div>
        )}

        {/* Shout-out / Recommendation Letter */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-yellow-800 space-y-4">
          <h2 className="text-xl font-bold">✉️ Shout-Out: Recommendation Letter</h2>
          <p className="text-gray-400 text-sm">
            Generate a hilariously self-deprecating letter to guilt your friends into volunteering.
          </p>

          <button
            onClick={handleGenerateLetter}
            disabled={loadingLetter}
            className="w-full bg-yellow-700 hover:bg-yellow-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
          >
            {loadingLetter ? "Writing comedy gold..." : "Generate Recommendation Letter"}
          </button>

          {recommendationLetter && (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap border border-gray-600">
                {recommendationLetter}
              </div>

              {!letterSent ? (
                <div className="space-y-3">
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="Friend's email (opt-in only!)"
                    className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500"
                  />
                  <button
                    onClick={handleSendShoutout}
                    disabled={!recipientEmail}
                    className="w-full bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-bold py-3 rounded-lg"
                  >
                    📤 Send Shout-Out (Opt-in)
                  </button>
                </div>
              ) : (
                <div className="bg-green-900 border border-green-600 rounded-xl p-4 text-center">
                  <p className="text-green-300 font-bold">✅ Letter sent! Your friend&apos;s guilt trip has begun.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Fame/Shame Cards */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 space-y-4">
          <h2 className="text-xl font-bold">🏆 Fame &amp; Shame Scoreboard</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-950 border border-green-700 rounded-xl p-4 text-center">
              <div className="text-3xl">🌟</div>
              <p className="font-bold text-green-300 mt-2">FAME</p>
              <p className="text-sm text-gray-400 mt-1">
                {ironyScore < 30 ? "Hero-level dedication!" : "Potential hero detected"}
              </p>
            </div>
            <div className="bg-red-950 border border-red-800 rounded-xl p-4 text-center">
              <div className="text-3xl">😬</div>
              <p className="font-bold text-red-300 mt-2">SHAME</p>
              <p className="text-sm text-gray-400 mt-1">
                {ironyScore > 50 ? `${ironyScore} tabs escaped. For shame.` : "Staying focused. Impressive."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
