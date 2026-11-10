import { AspectRatio, FramingMode, ProcessingOptions, VideoSegment } from "@/types/video";

export interface RenderProgressCallback {
  (progress: number): void;
}

export function getTargetDimensions(
  aspectRatio: AspectRatio,
  resolution: '1080p' | '720p' | 'source',
  sourceWidth: number,
  sourceHeight: number
): { width: number; height: number } {
  if (aspectRatio === 'original') {
    return { width: sourceWidth, height: sourceHeight };
  }

  const is720p = resolution === '720p';

  switch (aspectRatio) {
    case '9:16':
      return is720p ? { width: 720, height: 1280 } : { width: 1080, height: 1920 };
    case '1:1':
      return is720p ? { width: 720, height: 720 } : { width: 1080, height: 1080 };
    case '4:5':
      return is720p ? { width: 720, height: 900 } : { width: 1080, height: 1350 };
    case '16:9':
      return is720p ? { width: 1280, height: 720 } : { width: 1920, height: 1080 };
    default:
      return { width: 1080, height: 1920 };
  }
}

/**
 * Draws a single video frame onto the target 2D canvas context with the selected framing mode.
 */
export function drawFramedFrame(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  targetWidth: number,
  targetHeight: number,
  options: ProcessingOptions,
  segmentIndex?: number
) {
  const { framingMode, blurIntensity, letterboxColor, cropPanOffset, addPartWatermark, partBannerText, bannerPosition } = options;
  const vw = video.videoWidth || 1920;
  const vh = video.videoHeight || 1080;
  const videoAspect = vw / vh;
  const targetAspect = targetWidth / targetHeight;

  // Clear canvas
  ctx.clearRect(0, 0, targetWidth, targetHeight);

  if (framingMode === 'original' || options.aspectRatio === 'original') {
    ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
  } else if (framingMode === 'blur') {
    // 1. Draw enlarged blurred background video (object-fit: cover + blur)
    let bgW = targetWidth;
    let bgH = targetHeight;
    let bgX = 0;
    let bgY = 0;

    if (videoAspect > targetAspect) {
      bgH = targetHeight;
      bgW = targetHeight * videoAspect;
      bgX = (targetWidth - bgW) / 2;
    } else {
      bgW = targetWidth;
      bgH = targetWidth / videoAspect;
      bgY = (targetHeight - bgH) / 2;
    }

    // Slightly oversized to avoid blur edge clipping
    const bleed = 40;
    ctx.save();
    ctx.filter = `blur(${blurIntensity || 25}px) brightness(0.65) saturate(1.2)`;
    ctx.drawImage(video, bgX - bleed / 2, bgY - bleed / 2, bgW + bleed, bgH + bleed);
    ctx.restore();

    // 2. Add subtle dark vignette / overlay over background for depth
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.restore();

    // 3. Draw sharp original video centered (object-fit: contain)
    let fgW = targetWidth;
    let fgH = targetWidth / videoAspect;

    if (fgH > targetHeight) {
      fgH = targetHeight;
      fgW = targetHeight * videoAspect;
    }

    const fgX = (targetWidth - fgW) / 2;
    const fgY = (targetHeight - fgH) / 2;

    // Subtle drop shadow for foreground video
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 10;
    ctx.drawImage(video, fgX, fgY, fgW, fgH);
    ctx.restore();

  } else if (framingMode === 'letterbox') {
    // 1. Fill solid background (e.g. pure black or custom color)
    ctx.fillStyle = letterboxColor || '#000000';
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    // 2. Draw centered video
    let fgW = targetWidth;
    let fgH = targetWidth / videoAspect;

    if (fgH > targetHeight) {
      fgH = targetHeight;
      fgW = targetHeight * videoAspect;
    }

    const fgX = (targetWidth - fgW) / 2;
    const fgY = (targetHeight - fgH) / 2;

    ctx.drawImage(video, fgX, fgY, fgW, fgH);

  } else if (framingMode === 'crop_fill') {
    // Zoom in to fill entire canvas (object-fit: cover)
    let srcW = vw;
    let srcH = vh;
    let srcX = 0;
    let srcY = 0;

    if (videoAspect > targetAspect) {
      // Source is wider than target (e.g. 16:9 into 9:16)
      srcW = vh * targetAspect;
      // Allow pan offset: -50% to +50%
      const maxOffset = (vw - srcW);
      const panFactor = (cropPanOffset || 0) / 100; // -0.5 to 0.5
      srcX = Math.max(0, Math.min(vw - srcW, (vw - srcW) / 2 + panFactor * maxOffset));
    } else {
      // Source is taller than target
      srcH = vw / targetAspect;
      srcY = (vh - srcH) / 2;
    }

    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, targetWidth, targetHeight);
  }

  // Optional: Part Watermark / Banner
  if (addPartWatermark && segmentIndex !== undefined) {
    const partNum = segmentIndex;
    const rawText = partBannerText ? partBannerText.replace('{n}', `${partNum}`) : `PART ${partNum}`;

    ctx.save();
    const fontSize = Math.round(targetHeight * 0.024); // ~46px for 1920h
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const textMetrics = ctx.measureText(rawText);
    const paddingX = fontSize * 0.9;
    const paddingY = fontSize * 0.5;
    const badgeW = textMetrics.width + paddingX * 2;
    const badgeH = fontSize + paddingY * 2;
    const radius = badgeH / 2;

    const badgeX = targetWidth / 2;
    const badgeY = bannerPosition === 'bottom' ? targetHeight - badgeH - 60 : badgeH + 60;

    // Draw pill background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;

    const left = badgeX - badgeW / 2;
    const top = badgeY - badgeH / 2;

    ctx.beginPath();
    ctx.roundRect(left, top, badgeW, badgeH, radius);
    ctx.fill();
    ctx.stroke();

    // Text
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 8;
    ctx.fillText(rawText, badgeX, badgeY);

    ctx.restore();
  }
}

/**
 * Fast capture of a thumbnail frame for a given segment.
 */
export async function captureSegmentThumbnail(
  video: HTMLVideoElement,
  segment: VideoSegment,
  options: ProcessingOptions
): Promise<string> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    // Smaller preview canvas for performance (e.g. 360 x 640)
    const { width: origW, height: origH } = getTargetDimensions(
      options.aspectRatio,
      '720p',
      video.videoWidth || 1920,
      video.videoHeight || 1080
    );

    const scale = Math.min(1, 480 / Math.max(origW, origH));
    canvas.width = Math.round(origW * scale);
    canvas.height = Math.round(origH * scale);

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) {
      resolve('');
      return;
    }

    const seekTime = Math.min(segment.startTime + 0.2, segment.endTime - 0.1);

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      drawFramedFrame(ctx, video, canvas.width, canvas.height, options, segment.index);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      resolve(dataUrl);
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = seekTime;
  });
}

/**
 * Determines the best supported mimeType for recording video with audio.
 */
export function getSupportedMimeType(): { mimeType: string; extension: string } {
  if (typeof window === 'undefined' || !window.MediaRecorder) {
    return { mimeType: 'video/webm', extension: 'webm' };
  }

  const types = [
    { mimeType: 'video/mp4;codecs=avc1,mp4a.40.2', extension: 'mp4' },
    { mimeType: 'video/mp4', extension: 'mp4' },
    { mimeType: 'video/webm;codecs=vp9,opus', extension: 'webm' },
    { mimeType: 'video/webm;codecs=vp8,opus', extension: 'webm' },
    { mimeType: 'video/webm', extension: 'webm' },
  ];

  for (const t of types) {
    if (MediaRecorder.isTypeSupported(t.mimeType)) {
      return t;
    }
  }

  return { mimeType: 'video/webm', extension: 'webm' };
}

/**
 * Renders a specific video segment using Canvas + MediaRecorder with 100% audio sync.
 */
export async function renderSegmentWithCanvas(
  sourceUrl: string,
  segment: VideoSegment,
  options: ProcessingOptions,
  onProgress: RenderProgressCallback,
  signal?: AbortSignal
): Promise<{ blob: Blob; mimeType: string; extension: string }> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      return reject(new Error('Rendering cancelled by user'));
    }

    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.preload = 'auto';
    video.src = sourceUrl;
    video.muted = false; // Need audio for capture
    video.volume = 1;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    // Attaching hidden element to DOM prevents browser autoplay restrictions from rejecting unmuted play()
    video.style.position = 'fixed';
    video.style.top = '-9999px';
    video.style.left = '-9999px';
    video.style.width = '1px';
    video.style.height = '1px';
    video.style.opacity = '0';
    video.style.pointerEvents = 'none';
    if (typeof document !== 'undefined' && document.body) {
      document.body.appendChild(video);
    }

    // Use a container canvas
    const canvas = document.createElement('canvas');
    const { width, height } = getTargetDimensions(
      options.aspectRatio,
      options.resolution,
      1920,
      1080
    );
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      if (video.parentNode) video.parentNode.removeChild(video);
      return reject(new Error('Failed to initialize 2D canvas context'));
    }

    let recorder: MediaRecorder | null = null;
    let animFrameId: number | null = null;
    const recordedChunks: Blob[] = [];

    const cleanup = () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
      video.pause();
      video.removeAttribute('src');
      video.load();
      if (video.parentNode) {
        video.parentNode.removeChild(video);
      }
    };

    if (signal) {
      signal.addEventListener('abort', () => {
        cleanup();
        if (recorder && recorder.state !== 'inactive') {
          recorder.stop();
        }
        reject(new Error('Rendering cancelled'));
      });
    }

    video.onloadedmetadata = async () => {
      // Re-calculate dimensions with actual videoWidth / videoHeight if needed
      const actualDims = getTargetDimensions(
        options.aspectRatio,
        options.resolution,
        video.videoWidth,
        video.videoHeight
      );
      canvas.width = actualDims.width;
      canvas.height = actualDims.height;

      // Seek to segment start
      video.currentTime = segment.startTime;
    };

    video.onseeked = () => {
      // First frame ready
      drawFramedFrame(ctx, video, canvas.width, canvas.height, options, segment.index);

      // Start capture stream from canvas (30fps or 60fps)
      const fps = 30;
      const canvasStream = canvas.captureStream(fps);

      // Extract audio track from video element if available
      try {
        let audioTrack: MediaStreamTrack | null = null;
        if ((video as any).captureStream) {
          const vStream = (video as any).captureStream();
          const aTracks = vStream.getAudioTracks();
          if (aTracks.length > 0) audioTrack = aTracks[0];
        } else if ((video as any).mozCaptureStream) {
          const vStream = (video as any).mozCaptureStream();
          const aTracks = vStream.getAudioTracks();
          if (aTracks.length > 0) audioTrack = aTracks[0];
        }

        if (audioTrack) {
          canvasStream.addTrack(audioTrack);
        }
      } catch (err) {
        console.warn('Audio capture note:', err);
      }

      const { mimeType, extension } = getSupportedMimeType();
      const videoBitsPerSecond = options.resolution === '720p' ? 5_000_000 : 9_500_000;

      try {
        recorder = new MediaRecorder(canvasStream, {
          mimeType,
          videoBitsPerSecond,
        });
      } catch (e) {
        recorder = new MediaRecorder(canvasStream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunks.push(event.data);
        }
      };

      recorder.onstop = () => {
        cleanup();
        const finalBlob = new Blob(recordedChunks, { type: mimeType });
        resolve({ blob: finalBlob, mimeType, extension });
      };

      recorder.onerror = (e) => {
        cleanup();
        reject(new Error(`Recording error: ${(e as any).error || 'unknown'}`));
      };

      recorder.start(100); // collect chunk every 100ms

      // Render loop during playback
      const renderLoop = () => {
        if (signal?.aborted) return;

        if (video.currentTime >= segment.endTime || video.ended) {
          if (recorder && recorder.state === 'recording') {
            recorder.stop();
          }
          return;
        }

        drawFramedFrame(ctx, video, canvas.width, canvas.height, options, segment.index);

        const currentSegmentTime = video.currentTime - segment.startTime;
        const progress = Math.min(100, Math.max(0, (currentSegmentTime / segment.duration) * 100));
        onProgress(Math.round(progress));

        animFrameId = requestAnimationFrame(renderLoop);
      };

      video.play().then(() => {
        renderLoop();
      }).catch((err) => {
        if (err && err.name === 'NotAllowedError') {
          console.warn('Unmuted play blocked by browser policy, attempting fallback with user context');
          video.muted = true;
          video.play().then(() => {
            renderLoop();
          }).catch((err2) => {
            cleanup();
            reject(err2);
          });
        } else {
          cleanup();
          reject(err);
        }
      });
    };

    video.onerror = () => {
      cleanup();
      reject(new Error('Video loading error'));
    };
  });
}

