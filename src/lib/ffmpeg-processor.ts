import { VideoSegment } from "@/types/video";

export interface AudioTrackInfo {
  index: number; // 0, 1, 2... (audio stream index for -map 0:a:N)
  streamNumber: number; // absolute stream # in file (e.g. 1, 2, 3...)
  languageCode: string; // "tam", "hin", "tel", "eng"
  languageName: string; // "Tamil", "Hindi", "Telugu", "English"
  title: string; // Raw title from metadata: "Toonworld4all.me - [Tamil]"
  codec: string; // "aac", "mp3", "ac3"
  isDefault: boolean;
  displayLabel: string; // User-facing clean label: "Tamil (Toonworld4all.me)"
}

let ffmpegInstance: any = null;
let ffmpegLoadingPromise: Promise<any> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    if (document.querySelector(`script[src="${src}"]`)) {
      return resolve();
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(new Error(`Failed to load script ${src}`));
    document.head.appendChild(script);
  });
}

async function toBlobURL(url: string, mimeType: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return URL.createObjectURL(new Blob([blob], { type: mimeType }));
}

export async function getFFmpegInstance(onProgress?: (progress: number) => void): Promise<any> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (ffmpegLoadingPromise) {
    return ffmpegLoadingPromise;
  }

  ffmpegLoadingPromise = (async () => {
    await loadScript("/ffmpeg/ffmpeg.js");

    const FFmpegClass = (window as any)?.FFmpegWASM?.FFmpeg;
    if (!FFmpegClass) {
      throw new Error("FFmpeg WASM failed to initialize from local assets.");
    }

    const ffmpeg = new FFmpegClass();

    if (onProgress) {
      ffmpeg.on("progress", ({ progress }: any) => {
        onProgress(Math.round(progress * 100));
      });
    }

    const coreURL = `${window.location.origin}/ffmpeg/ffmpeg-core.js`;
    const wasmURL = `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`;

    await ffmpeg.load({
      coreURL,
      wasmURL,
    });

    ffmpegInstance = ffmpeg;
    return ffmpeg;
  })();

  return ffmpegLoadingPromise;
}

const LANGUAGE_MAP: Record<string, string> = {
  tam: "Tamil",
  ta: "Tamil",
  hin: "Hindi",
  hi: "Hindi",
  tel: "Telugu",
  te: "Telugu",
  mal: "Malayalam",
  ml: "Malayalam",
  kan: "Kannada",
  kn: "Kannada",
  eng: "English",
  en: "English",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  spa: "Spanish",
  es: "Spanish",
  fra: "French",
  fre: "French",
  fr: "French",
  deu: "German",
  ger: "German",
  de: "German",
  rus: "Russian",
  ru: "Russian",
  zho: "Chinese",
  chi: "Chinese",
  zh: "Chinese",
  ara: "Arabic",
  ar: "Arabic",
};

/**
 * Detects all audio tracks and languages inside a video file.
 */
export async function detectAudioTracks(file: File): Promise<AudioTrackInfo[]> {
  try {
    const ffmpeg = await getFFmpegInstance();

    const inputName = `probe_${Date.now()}.${file.name.split(".").pop() || "mkv"}`;

    // Write file to virtual filesystem to probe
    const buffer = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, buffer);

    const logLines: string[] = [];
    const logHandler = ({ message }: { message: string }) => {
      logLines.push(message);
    };

    ffmpeg.on("log", logHandler);

    try {
      // Running -i on input without output causes ffmpeg to dump stream details to log
      await ffmpeg.exec(["-i", inputName]);
    } catch {
      // Expected: ffmpeg returns non-zero when no output file is provided
    }

    ffmpeg.off("log", logHandler);

    try {
      await ffmpeg.deleteFile(inputName);
    } catch {}

    const audioTracks: AudioTrackInfo[] = [];
    let currentAudioTrack: Partial<AudioTrackInfo> | null = null;
    let audioIndexCounter = 0;

    for (let i = 0; i < logLines.length; i++) {
      const line = logLines[i];

      // Stream #0:1(hin): Audio: aac (LC), 48000 Hz, stereo, fltp (default)
      const streamMatch = line.match(/Stream\s+#0:(\d+)(?:\[0x[0-9a-fA-F]+\])?(?:\(([^)]+)\))?:\s+Audio:\s+([a-zA-Z0-9_-]+)/i);

      if (streamMatch) {
        if (currentAudioTrack && currentAudioTrack.index !== undefined) {
          audioTracks.push(finalizeAudioTrack(currentAudioTrack as AudioTrackInfo));
        }

        const streamNum = parseInt(streamMatch[1], 10);
        const rawLang = (streamMatch[2] || "").toLowerCase().trim();
        const codec = streamMatch[3] || "aac";
        const isDefault = line.toLowerCase().includes("(default)");

        const langName = LANGUAGE_MAP[rawLang] || (rawLang ? rawLang.toUpperCase() : "Audio");

        currentAudioTrack = {
          index: audioIndexCounter++,
          streamNumber: streamNum,
          languageCode: rawLang,
          languageName: langName,
          title: "",
          codec,
          isDefault,
        };
        continue;
      }

      // Metadata title: title : 1st Dub DVD DD2.0~Toonworld4all.me - [Hindi]
      if (currentAudioTrack) {
        const titleMatch = line.match(/^\s*title\s*:\s*(.+)$/i);
        if (titleMatch) {
          currentAudioTrack.title = titleMatch[1].trim();

          // Try to extract language tag inside brackets if title has [Tamil], [Hindi], etc.
          const bracketLang = currentAudioTrack.title.match(/\[([a-zA-Z]+)\]/);
          if (bracketLang) {
            const detectedFromTitle = bracketLang[1].toLowerCase();
            if (LANGUAGE_MAP[detectedFromTitle]) {
              currentAudioTrack.languageCode = detectedFromTitle;
              currentAudioTrack.languageName = LANGUAGE_MAP[detectedFromTitle];
            } else {
              currentAudioTrack.languageName = bracketLang[1];
            }
          }
        }
      }
    }

    if (currentAudioTrack && currentAudioTrack.index !== undefined) {
      audioTracks.push(finalizeAudioTrack(currentAudioTrack as AudioTrackInfo));
    }

    return audioTracks;
  } catch (err) {
    console.warn("Audio track detection note:", err);
    return [];
  }
}

function finalizeAudioTrack(track: AudioTrackInfo): AudioTrackInfo {
  let label = track.languageName || `Track ${track.index + 1}`;

  if (track.title) {
    // If title has meaningful label like "Toonworld4all.me - [Tamil]"
    label = `${track.languageName}: ${track.title}`;
  } else {
    label = `${track.languageName} (Track ${track.index + 1})`;
  }

  if (track.isDefault) {
    label += " [Default]";
  }

  return {
    ...track,
    displayLabel: label,
  };
}

export interface SliceResult {
  blob: Blob;
  extension: string;
}

export async function prepareInputFile(file: File, onProgress?: (msg: string) => void): Promise<{ ffmpeg: any; inputName: string }> {
  if (onProgress) onProgress("Preparing video file in fast engine...");
  const ffmpeg = await getFFmpegInstance();
  const inputExt = (file.name.split(".").pop() || "mp4").toLowerCase();
  const inputName = `shared_input_${Date.now()}.${inputExt}`;
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  await ffmpeg.writeFile(inputName, fileBuffer);
  return { ffmpeg, inputName };
}

export async function cleanupInputFile(inputName: string): Promise<void> {
  try {
    const ffmpeg = await getFFmpegInstance();
    await ffmpeg.deleteFile(inputName);
  } catch (e) {
    console.warn("Shared input cleanup note:", e);
  }
}

/**
 * Fast Lossless Slice using local FFmpeg stream copy.
 * Slices 10 minutes from a 20-minute video in literally 1-3 SECONDS!
 * Keeps ONLY the selected audio track (e.g. Tamil voice) and outputs universal MP4 (or MKV).
 */
export async function sliceVideoLossless(
  file: File,
  segment: VideoSegment,
  selectedAudioIndex: number = -1,
  onProgress?: (status: string) => void,
  preferMp4: boolean = true,
  existingInputName?: string
): Promise<SliceResult> {
  if (onProgress) onProgress("Initializing cut engine...");
  const ffmpeg = await getFFmpegInstance();

  const inputExt = (file.name.split(".").pop() || "mp4").toLowerCase();
  const isMkv = inputExt === "mkv";
  const outputExt = preferMp4 ? "mp4" : (isMkv ? "mkv" : inputExt);
  const outputMime = outputExt === "mp4" ? "video/mp4" : "video/x-matroska";

  const inputName = existingInputName || `input_${Date.now()}.${inputExt}`;
  const outputName = `output_${Date.now()}.${outputExt}`;

  if (!existingInputName) {
    if (onProgress) onProgress("Loading video data...");
    const fileBuffer = new Uint8Array(await file.arrayBuffer());
    await ffmpeg.writeFile(inputName, fileBuffer);
  }

  const startSec = Math.max(0, segment.startTime).toFixed(3);
  const durationSec = Math.max(0.1, segment.duration).toFixed(3);

  if (onProgress) onProgress(`Cutting ${segment.title} (${startSec}s to ${(segment.startTime + segment.duration).toFixed(1)}s)...`);

  // Build FFmpeg command args
  const args = [
    "-ss", startSec,
    "-i", inputName,
    "-t", durationSec,
  ];

  if (selectedAudioIndex >= 0) {
    // Map video stream 0 and ONLY the selected audio track!
    // Example: Tamil (0:a:3) becomes primary audio track 0:a:0 in output file!
    args.push("-map", "0:v:0", "-map", `0:a:${selectedAudioIndex}`);
  } else {
    // Keep all video and audio streams
    args.push("-map", "0:v?", "-map", "0:a?");
  }

  if (outputExt === "mp4") {
    // Universal MP4 format for YouTube, Reels, TikTok: Lossless copy video + crystal-clear AAC audio
    args.push("-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-avoid_negative_ts", "make_zero", outputName);
  } else {
    // Pure copy container
    args.push("-c", "copy", "-avoid_negative_ts", "make_zero", outputName);
  }

  await ffmpeg.exec(args);

  if (onProgress) onProgress("Finalizing output...");
  const data = await ffmpeg.readFile(outputName);

  try {
    if (!existingInputName) {
      await ffmpeg.deleteFile(inputName);
    }
    await ffmpeg.deleteFile(outputName);
  } catch (e) {
    console.warn("Cleanup note:", e);
  }

  return {
    blob: new Blob([data as any], { type: outputMime }),
    extension: outputExt,
  };
}

/**
 * Extracts a lightweight AAC audio track for the live preview player.
 * Enables listening directly to Tamil / Telugu / Hindi in the website preview in real-time.
 */
export async function extractAudioPreview(
  file: File,
  audioIndex: number,
  durationSec: number = 180
): Promise<string> {
  const ffmpeg = await getFFmpegInstance();
  const inputExt = (file.name.split(".").pop() || "mkv").toLowerCase();
  const inputName = `audio_in_${Date.now()}.${inputExt}`;
  const outputName = `audio_preview_${Date.now()}.m4a`;

  // Read up to 25MB slice of the file to extract audio preview in ~1 second
  const sliceSize = Math.min(file.size, 25 * 1024 * 1024);
  const sliceBuf = new Uint8Array(await file.slice(0, sliceSize).arrayBuffer());
  await ffmpeg.writeFile(inputName, sliceBuf);

  try {
    await ffmpeg.exec([
      "-ss", "0",
      "-i", inputName,
      "-t", String(durationSec),
      "-map", `0:a:${audioIndex}`,
      "-vn",
      "-c:a", "aac",
      "-b:a", "128k",
      outputName,
    ]);

    const data = await ffmpeg.readFile(outputName);
    const blob = new Blob([data as any], { type: "audio/mp4" });
    return URL.createObjectURL(blob);
  } finally {
    try {
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
    } catch {}
  }
}
