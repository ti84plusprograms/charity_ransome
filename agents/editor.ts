import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * WEAPON 1: THE INSTANT MEME (Canvas API)
 */
export async function generateShameMeme(videoBlob: Blob, roastCaption: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(videoBlob);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.onloadedmetadata = () => {
      video.currentTime = Math.min(1.0, video.duration / 2 || 1.0);
    };
    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject('Canvas context not supported');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
        data[i] = avg; data[i + 1] = avg; data[i + 2] = avg;
      }
      ctx.putImageData(imageData, 0, 0);
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = Math.floor(canvas.width / 150);
      ctx.textAlign = 'center';
      const fontSize = Math.floor(canvas.width / 15);
      ctx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
      const textX = canvas.width / 2;
      const textY = canvas.height - (fontSize * 1.5);
      ctx.strokeText(roastCaption.toUpperCase(), textX, textY);
      ctx.fillText(roastCaption.toUpperCase(), textX, textY);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.8));
    };
    video.onerror = (e) => reject(e);
  });
}

/**
 * WEAPON 2: THE UGC REEL ENGINE (FFmpeg.wasm)
 */
export async function generateMarketingReel(
  videoBlob: Blob,
  _charityName: string,
  _marketingScript: string
): Promise<string> {
  const ffmpeg = new FFmpeg();
  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
  const inputFileName = 'input.webm';
  const outputFileName = 'output.mp4';
  await ffmpeg.writeFile(inputFileName, await fetchFile(videoBlob));
  await ffmpeg.exec([
    '-stream_loop', '5',
    '-i', inputFileName,
    '-t', '30',
    '-vf', 'colorchannelmixer=.3:.4:.3:0:.3:.4:.3:0:.3:.4:.3, eq=contrast=1.2:brightness=-0.05',
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    outputFileName
  ]);
  const data = await ffmpeg.readFile(outputFileName);
  const outputBytes = data instanceof Uint8Array ? data : new Uint8Array();
  const outputBuffer = new Uint8Array(outputBytes).buffer;
  const blob = new Blob([outputBuffer], { type: 'video/mp4' });
  return URL.createObjectURL(blob);
}
