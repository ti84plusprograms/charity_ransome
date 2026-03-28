"use client";

export interface UGCEngineOptions {
  heroShot: Blob;
  charityName: string;
  city: string;
  userName: string;
}

export interface UGCResult {
  videoUrl: string;
  videoBlob: Blob;
  thumbnailUrl: string;
}

export async function processHeroShot(options: UGCEngineOptions): Promise<UGCResult> {
  const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");
  
  const ffmpeg = createFFmpeg({
    log: process.env.NODE_ENV === "development",
    corePath: "https://unpkg.com/@ffmpeg/core@0.11.0/dist/ffmpeg-core.js",
  });

  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }

  const inputFile = "hero_input.webm";
  const outputFile = "hero_output.mp4";
  const thumbFile = "thumb.jpg";

  ffmpeg.FS("writeFile", inputFile, await fetchFile(options.heroShot));

  const sanitizeForDrawtext = (text: string) =>
    text.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/:/g, "\\:");

  const safeCharity = sanitizeForDrawtext(options.charityName);
  const safeUser = sanitizeForDrawtext(options.userName);
  const safeCity = sanitizeForDrawtext(options.city);
  
  await ffmpeg.run(
    "-i", inputFile,
    "-t", "5",
    "-vf",
    [
      `drawtext=text='${safeCharity}':fontcolor=white:fontsize=28:x=(w-text_w)/2:y=30:box=1:boxcolor=black@0.6:boxborderw=8`,
      `drawtext=text='${safeUser} says\\: Volunteer in ${safeCity}!':fontcolor=yellow:fontsize=18:x=(w-text_w)/2:y=h-60:box=1:boxcolor=black@0.6:boxborderw=5`,
    ].join(","),
    "-c:v", "libx264",
    "-preset", "ultrafast",
    "-crf", "28",
    "-an",
    outputFile
  );

  await ffmpeg.run("-i", outputFile, "-ss", "00:00:02", "-vframes", "1", thumbFile);

  const videoData = ffmpeg.FS("readFile", outputFile);
  const thumbData = ffmpeg.FS("readFile", thumbFile);

  const videoBlob = new Blob([videoData.buffer as ArrayBuffer], { type: "video/mp4" });
  const thumbBlob = new Blob([thumbData.buffer as ArrayBuffer], { type: "image/jpeg" });

  return {
    videoUrl: URL.createObjectURL(videoBlob),
    videoBlob,
    thumbnailUrl: URL.createObjectURL(thumbBlob),
  };
}
