"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";

export default function HomePage() {
  const router = useRouter();
  const { setUserName, ironyScore } = useSessionStore();
  const [name, setName] = useState("");
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

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="text-6xl">🎯</div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight">
            The Aggressive Recruiter
          </h1>
          <p className="text-gray-400 text-lg">
            AI-powered satirical volunteering recruitment.{" "}
            <span className="text-orange-400">Your excuses are not impressive.</span>
          </p>
        </div>

        {/* Irony Score */}
        {ironyScore > 0 && (
          <div className="bg-gray-800 rounded-xl p-4 border border-orange-800">
            <p className="text-sm text-gray-400">Your Irony Score™</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex-1 bg-gray-700 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-orange-500 to-red-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${ironyScore}%` }}
                />
              </div>
              <span className="text-orange-400 font-bold">{ironyScore}/100</span>
            </div>
          </div>
        )}

        {/* Get Roasted Form */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 space-y-4">
          <h2 className="text-xl font-bold">Step 1: Face Your Destiny</h2>
          <p className="text-gray-400 text-sm">
            Enter your name so our AI can personally judge you.
          </p>
          <div className="flex gap-3">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleGetRoasted()}
              placeholder="Your name (we'll be gentle-ish)"
              className="flex-1 bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
            <button
              onClick={handleGetRoasted}
              disabled={loading || !name.trim()}
              className="bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition-colors"
            >
              {loading ? "Roasting..." : "Roast Me"}
            </button>
          </div>

          {roast && (
            <div className="bg-orange-950 border border-orange-800 rounded-xl p-4 text-orange-100 text-sm leading-relaxed">
              <p className="text-orange-400 font-bold mb-2">🎤 The Roastmaster says:</p>
              <p>{roast}</p>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/campaign")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-orange-500 p-5 rounded-xl transition-all text-left space-y-2"
          >
            <div className="text-3xl">��</div>
            <h3 className="font-bold">Find Charities</h3>
            <p className="text-gray-400 text-xs">Browse local non-profits that desperately need you</p>
          </button>
          <button
            onClick={() => router.push("/booth")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-purple-500 p-5 rounded-xl transition-all text-left space-y-2"
          >
            <div className="text-3xl">🎬</div>
            <h3 className="font-bold">Hero Shot</h3>
            <p className="text-gray-400 text-xs">Record your opt-in 5s charity video (be the star!)</p>
          </button>
          <button
            onClick={() => router.push("/campaign")}
            className="bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-green-500 p-5 rounded-xl transition-all text-left space-y-2"
          >
            <div className="text-3xl">✉️</div>
            <h3 className="font-bold">Shout-Out</h3>
            <p className="text-gray-400 text-xs">Send a hilarious recommendation letter to a friend</p>
          </button>
        </div>

        <p className="text-gray-600 text-xs">
          Satire for a good cause. All camera access is explicitly opt-in for marketing asset creation.
        </p>
      </div>
    </main>
  );
}
