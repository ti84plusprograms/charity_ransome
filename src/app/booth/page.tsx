"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSessionStore } from "@/lib/state";
import { processHeroShot } from "@/lib/media/ugc-engine";

type BoothState = "idle" | "consent" | "recording" | "processing" | "done";

export default function BoothPage() {
  const router = useRouter();
  const { userName, selectedCharity, setHeroShotUrl, setGeneratedAdUrl } = useSessionStore();
  const [state, setState] = useState<BoothState>("idle");
  const [countdown, setCountdown] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback((stream: MediaStream) => {
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
      ? "video/webm;codecs=vp9"
      : MediaRecorder.isTypeSupported("video/webm")
      ? "video/webm"
      : "";
    if (!mimeType) {
      setError("Your browser does not support video recording. Please try Chrome or Firefox.");
      setState("idle");
      return;
    }
    const mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorder.onstop = async () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setState("processing");
      
      try {
        const result = await processHeroShot({
          heroShot: blob,
          charityName: selectedCharity?.name ?? "Local Charity",
          city: selectedCharity?.city ?? "Your City",
          userName: userName || "Anonymous Hero",
        });
        setHeroShotUrl(result.videoUrl);
        setGeneratedAdUrl(result.videoUrl);
        setPreviewUrl(result.videoUrl);
        setState("done");
      } catch {
        setError("Video processing failed. Even heroes have bad days.");
        setState("idle");
      }

      stream.getTracks().forEach((track) => track.stop());
    };

    let timeLeft = 5;
    setCountdown(5);
    mediaRecorder.start(100);

    const timer = setInterval(() => {
      timeLeft -= 1;
      setCountdown(timeLeft);
      if (timeLeft <= 0) {
        clearInterval(timer);
        mediaRecorder.stop();
      }
    }, 1000);
  }, [selectedCharity, userName, setHeroShotUrl, setGeneratedAdUrl]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setState("recording");
      startRecording(stream);
    } catch {
      setError("Camera access denied. No hero shot today. 😔");
      setState("idle");
    }
  }, [startRecording]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-black">🎬 Hero Shot Studio</h1>
          <p className="text-gray-400">
            Create your 5-second charity ad. Fame and minor embarrassment await.
          </p>
        </div>

        {/* Consent State */}
        {state === "idle" && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-purple-800 space-y-4">
            <h2 className="text-xl font-bold text-purple-300">⚠️ Camera Consent Required</h2>
            <div className="space-y-3 text-sm text-gray-300">
              <p>By clicking &quot;I Consent &amp; Start Recording&quot;, you agree that:</p>
              <ul className="list-disc list-inside space-y-1 text-gray-400">
                <li>Your camera will be activated <strong>solely</strong> for creating a charity marketing asset</li>
                <li>Your 5-second video will be processed locally in your browser</li>
                <li>No video data is uploaded without your explicit approval</li>
                <li>You can stop the recording at any time</li>
              </ul>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setState("consent")}
                className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition-colors"
              >
                I Consent &amp; Start Recording
              </button>
              <button
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                Not Today
              </button>
            </div>
          </div>
        )}

        {/* Confirmation before starting */}
        {state === "consent" && (
          <div className="bg-gray-900 rounded-2xl p-6 border border-yellow-700 space-y-4 text-center">
            <div className="text-5xl">🎥</div>
            <h2 className="text-xl font-bold">Ready, {userName || "Champion"}?</h2>
            <p className="text-gray-400">
              You&apos;ll be recording a 5-second video for{" "}
              <strong className="text-yellow-300">{selectedCharity?.name ?? "a local charity"}</strong>
            </p>
            <button
              onClick={startCamera}
              className="w-full bg-red-600 hover:bg-red-500 text-white font-black py-4 rounded-xl text-lg transition-colors"
            >
              🔴 Start Recording!
            </button>
          </div>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 right-4 bg-red-600 text-white font-black text-4xl w-16 h-16 rounded-full flex items-center justify-center animate-pulse">
                {countdown}
              </div>
              <div className="absolute bottom-4 left-0 right-0 text-center text-white font-bold">
                🔴 RECORDING for {selectedCharity?.name ?? "charity"}
              </div>
            </div>
          </div>
        )}

        {/* Processing State */}
        {state === "processing" && (
          <div className="bg-gray-900 rounded-2xl p-8 border border-gray-700 text-center space-y-4">
            <div className="text-5xl animate-spin">⚙️</div>
            <h2 className="text-xl font-bold">Processing your Hero Shot...</h2>
            <p className="text-gray-400 text-sm">
              Adding charity overlay. Making you look appropriately heroic.
            </p>
          </div>
        )}

        {/* Done State */}
        {state === "done" && previewUrl && (
          <div className="space-y-4">
            <div className="bg-green-900 border border-green-600 rounded-2xl p-4 text-center">
              <p className="text-green-300 font-bold">✅ Hero Shot Complete!</p>
            </div>
            <video
              src={previewUrl}
              controls
              className="w-full rounded-2xl bg-black"
            />
            <div className="flex gap-3">
              <button
                onClick={() => router.push("/campaign")}
                className="flex-1 bg-orange-600 hover:bg-orange-500 text-white font-bold py-3 rounded-lg"
              >
                View Campaign →
              </button>
              <button
                onClick={() => {
                  setPreviewUrl(null);
                  setState("idle");
                }}
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg"
              >
                Redo
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
