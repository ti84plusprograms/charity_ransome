export interface VideoClip {
  blob: Blob;
  duration: number;
  charityName: string;
  city: string;
}

export interface EditedVideo {
  url: string;
  blob: Blob;
}

export async function createCharityAd(clip: VideoClip): Promise<EditedVideo> {
  const { createFFmpeg, fetchFile } = await import("@ffmpeg/ffmpeg");
  
  const ffmpeg = createFFmpeg({ log: false });
  await ffmpeg.load();

  const inputName = "input.webm";
  const outputName = "output.mp4";

  ffmpeg.FS("writeFile", inputName, await fetchFile(clip.blob));

  await ffmpeg.run(
    "-i", inputName,
    "-t", "5",
    "-vf", `drawtext=text='${clip.charityName} needs YOU in ${clip.city}!':fontcolor=white:fontsize=24:x=(w-text_w)/2:y=h-th-10:box=1:boxcolor=black@0.5:boxborderw=5`,
    "-c:v", "libx264",
    "-preset", "fast",
    "-crf", "23",
    outputName
  );

  const data = ffmpeg.FS("readFile", outputName);
  const outputBlob = new Blob([data.buffer as ArrayBuffer], { type: "video/mp4" });
  const url = URL.createObjectURL(outputBlob);

  return { url, blob: outputBlob };
}
