"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";

type CaptureState = "idle" | "recording" | "complete";

function getSupportedMimeType() {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }

  if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
    return "video/webm;codecs=vp9";
  }

  if (MediaRecorder.isTypeSupported("video/webm")) {
    return "video/webm";
  }

  return "";
}

export default function OnboardingPage() {
  const router = useRouter();
  const {
    userName,
    userEmail,
    emergencyContactEmail,
    emergencyContactRelation,
    profileVideoUrl,
    onboardingComplete,
    selectedCharity,
    setOnboardingProfile,
  } = useSessionStore();
  const [name, setName] = useState(userName);
  const [email, setEmail] = useState(userEmail);
  const [contactEmail, setContactEmail] = useState(emergencyContactEmail);
  const [contactRelation, setContactRelation] = useState(emergencyContactRelation);
  const [videoUrl, setVideoUrl] = useState<string | null>(profileVideoUrl);
  const [captureState, setCaptureState] = useState<CaptureState>(
    profileVideoUrl ? "complete" : "idle",
  );
  const [countdown, setCountdown] = useState(5);
  const [formError, setFormError] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const liveVideoRef = useRef<HTMLVideoElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopActiveCapture = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (liveVideoRef.current) {
      liveVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    return () => stopActiveCapture();
  }, []);

  const handleRecordVideo = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setVideoError("Camera capture is not available in this browser.");
      return;
    }

    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setVideoError("This browser cannot record the requested 5-second clip.");
      return;
    }

    stopActiveCapture();
    setVideoError(null);
    setCaptureState("recording");
    setCountdown(5);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;

      if (liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const clip = new Blob(chunksRef.current, { type: mimeType });
        const nextVideoUrl = URL.createObjectURL(clip);
        setVideoUrl(nextVideoUrl);
        setCaptureState("complete");
        stopActiveCapture();
      };

      recorder.start(200);

      let secondsLeft = 5;
      timerRef.current = setInterval(() => {
        secondsLeft -= 1;
        setCountdown(Math.max(0, secondsLeft));

        if (secondsLeft <= 0) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          recorder.stop();
        }
      }, 1000);
    } catch {
      stopActiveCapture();
      setCaptureState(videoUrl ? "complete" : "idle");
      setVideoError("Camera access was blocked. You can upload a clip instead.");
    }
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setVideoError("Please upload a video file for the face capture requirement.");
      return;
    }

    setVideoError(null);
    setCaptureState("complete");
    setVideoUrl(URL.createObjectURL(file));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!name.trim() || !email.trim() || !contactEmail.trim() || !contactRelation.trim()) {
      setFormError("Please complete every required onboarding field.");
      return;
    }

    if (!videoUrl) {
      setVideoError("Please record or upload a 5-second face clip before continuing.");
      return;
    }

    setOnboardingProfile({
      userName: name.trim(),
      userEmail: email.trim(),
      emergencyContactEmail: contactEmail.trim(),
      emergencyContactRelation: contactRelation.trim(),
      profileVideoUrl: videoUrl,
    });
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(54,190,180,0.16),transparent_28%),linear-gradient(180deg,#081a1e_0%,#0d2830_100%)] px-6 py-10 text-white lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.2fr]">
        <section className="rounded-[34px] border border-white/12 bg-white/6 p-8 shadow-[0_25px_65px_rgba(0,0,0,0.25)] backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-teal-100/70">
            Account Access
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight">Login / Sign Up</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-300">
            This onboarding screen collects the identity fields you called out: name, email,
            emergency contact information, and a 5-second face video for the intake flow.
          </p>

          <div className="mt-8 space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-100/70">
                Selected mission
              </p>
              <p className="mt-2 text-2xl font-black">
                {selectedCharity?.name ?? "No organization selected yet"}
              </p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {selectedCharity
                  ? `${selectedCharity.city} intake will stay attached to this onboarding session.`
                  : "You can still complete onboarding first and choose a nonprofit afterwards."}
              </p>
            </div>

            <div className="rounded-[28px] border border-white/10 bg-slate-950/35 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-teal-100/70">
                Face capture guidance
              </p>
              <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <li>Send one 5-second clip of your face with a few angles or expressions.</li>
                <li>Use the built-in recorder or upload an existing short video file.</li>
                <li>Everything stays local to this session for now; no backend auth is wired yet.</li>
              </ul>
            </div>

            {onboardingComplete && (
              <div className="rounded-[28px] border border-emerald-400/30 bg-emerald-400/10 p-5 text-sm text-emerald-100">
                Session profile detected. Updating the form here will overwrite the current local onboarding data.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[34px] border border-white/12 bg-[#f8fcfb] p-8 text-slate-950 shadow-[0_25px_65px_rgba(0,0,0,0.25)]">
          <form className="space-y-8" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Full Name</span>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#0d6f77] focus:ring-4 focus:ring-[#0d6f77]/12"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-bold text-slate-700">Email</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#0d6f77] focus:ring-4 focus:ring-[#0d6f77]/12"
                />
              </label>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                  Emergency Contact
                </p>
                <h2 className="text-2xl font-black text-slate-950">Accountability Contact Details</h2>
              </div>

              <div className="mt-5 grid gap-5 md:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Emergency Contact Email</span>
                  <input
                    type="email"
                    required
                    value={contactEmail}
                    onChange={(event) => setContactEmail(event.target.value)}
                    placeholder="contact@example.com"
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#0d6f77] focus:ring-4 focus:ring-[#0d6f77]/12"
                  />
                </label>
                <label className="space-y-2">
                  <span className="text-sm font-bold text-slate-700">Relationship</span>
                  <input
                    type="text"
                    required
                    value={contactRelation}
                    onChange={(event) => setContactRelation(event.target.value)}
                    placeholder="Mom, friend, manager, sibling..."
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-950 outline-none transition focus:border-[#0d6f77] focus:ring-4 focus:ring-[#0d6f77]/12"
                  />
                </label>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-white p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#0d6f77]/70">
                    Face Video
                  </p>
                  <h2 className="text-2xl font-black text-slate-950">5-Second Onboarding Clip</h2>
                </div>
                {captureState === "recording" && (
                  <div className="rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white">
                    Recording {countdown}s
                  </div>
                )}
              </div>

              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                Record a short front-facing clip or upload one you already have. A little movement and a few expressions are enough.
              </p>

              <div className="mt-6 overflow-hidden rounded-[30px] bg-slate-950">
                {captureState === "recording" ? (
                  <video
                    ref={liveVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="aspect-video w-full object-cover"
                  />
                ) : videoUrl ? (
                  <video src={videoUrl} controls className="aspect-video w-full bg-black object-cover" />
                ) : (
                  <div className="flex aspect-video items-center justify-center px-6 text-center text-sm text-slate-300">
                    Your 5-second face capture preview will appear here.
                  </div>
                )}
              </div>

              <input
                ref={uploadInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={handleRecordVideo}
                  className="rounded-2xl bg-[#0d6f77] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#0a5d64]"
                >
                  Record 5-Second Clip
                </button>
                <button
                  type="button"
                  onClick={() => uploadInputRef.current?.click()}
                  className="rounded-2xl border border-slate-200 bg-slate-100 px-5 py-4 text-sm font-bold text-slate-900 transition hover:bg-slate-200"
                >
                  Upload Existing Video
                </button>
                {videoUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      stopActiveCapture();
                      setVideoUrl(null);
                      setCaptureState("idle");
                    }}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Clear Video
                  </button>
                )}
              </div>

              {videoError && <p className="mt-4 text-sm font-medium text-red-600">{videoError}</p>}
            </div>

            {formError && <p className="text-sm font-medium text-red-600">{formError}</p>}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                Back to Directory
              </button>
              <button
                type="submit"
                className="rounded-2xl bg-[#ff9c1a] px-6 py-4 text-sm font-bold text-slate-950 transition hover:bg-[#ffac3b]"
              >
                Save Onboarding Profile
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
