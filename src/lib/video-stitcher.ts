import "server-only";

import { execFile } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export async function getVideoStitchingCapability() {
  try {
    // We rely on a real ffmpeg binary for server-side stitching. If it is not
    // available, the UI intentionally falls back to the storyboard output.
    await execFileAsync("ffmpeg", ["-version"], { maxBuffer: 1024 * 1024 });
    return { available: true as const };
  } catch {
    return {
      available: false as const,
      reason:
        "ffmpeg is not available in this runtime, so the final vertical video cannot be stitched yet.",
    };
  }
}

export async function stitchSceneClipsToVideo({
  jobId,
  clipPaths,
}: {
  jobId: string;
  clipPaths: string[];
}) {
  const outputDirectory = path.join(process.cwd(), "public", "generated", "jobs", jobId);
  const outputPath = path.join(outputDirectory, "campaign-final.mp4");

  await mkdir(outputDirectory, { recursive: true });

  const args = ["-y"];

  for (const clipPath of clipPaths) {
    args.push("-i", clipPath);
  }

  const normalizedInputs = clipPaths.map((_, index) => {
    return `[${index}:v]scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2:black,setsar=1,fps=24,format=yuv420p[v${index}]`;
  });
  const concatenatedInputs = clipPaths.map((_, index) => `[v${index}]`).join("");
  const filterComplex = `${normalizedInputs.join(";")};${concatenatedInputs}concat=n=${clipPaths.length}:v=1:a=0[vout]`;

  args.push(
    "-filter_complex",
    filterComplex,
    "-map",
    "[vout]",
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    outputPath,
  );

  await execFileAsync("ffmpeg", args, { maxBuffer: 1024 * 1024 * 8 });

  return {
    filePath: outputPath,
    publicUrl: `/generated/jobs/${jobId}/campaign-final.mp4`,
  };
}
