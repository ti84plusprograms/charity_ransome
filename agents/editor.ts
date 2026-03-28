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

