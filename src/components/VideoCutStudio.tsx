"use client";

import { useState, useRef, useEffect, useCallback, CSSProperties } from "react";
import {
  CloudUpload,
  Film,
  Scissors,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Sparkles,
  FolderArchive,
  Eye,
  Loader2,
  RefreshCw,
  Check,
  ChevronDown,
  Clock,
  SlidersHorizontal,
  Languages,
  ShieldCheck,
  Zap,
  MonitorPlay,
  CircleCheck,
  X,
  Repeat,
  AudioLines,
  HardDrive,
  Send,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import confetti from "canvas-confetti";
import {
  AspectRatio,
  FramingMode,
  ProcessingOptions,
  VideoMetadata,
  VideoSegment,
} from "@/types/video";
import {
  formatBytes,
  formatTime,
  generateSegments,
  generateSegmentsByCount,
} from "@/lib/formatters";
import {
  captureSegmentThumbnail,
  drawFramedFrame,
  renderSegmentWithCanvas,
} from "@/lib/video-processor";
import { sliceVideoLossless, extractAudioPreview } from "@/lib/ffmpeg-processor";
import {
  AudioTrackInfo,
  parseMediaMetadata,
} from "@/lib/audio-detector";
import { useTheme } from "next-themes";
import { EmbedClip, EmbedInit, isAllowedParent, isEmbedRequested } from "@/lib/embed";

/** The local multi-audio sample is too big (and not ours) to deploy — dev only. */
const SHOW_LOCAL_SAMPLE = process.env.NODE_ENV !== "production";

const MIME_BY_EXT: Record<string, string> = {
  mp4: "video/mp4",
  webm: "video/webm",
  mkv: "video/x-matroska",
  mov: "video/quicktime",
};

type CutMode = "parts" | "duration" | "trim";
type StyleKey = "shorts_blur" | "shorts_black" | "original" | "shorts_crop";

const STYLE_OPTIONS: { key: StyleKey; title: string; desc: string }[] = [
  { key: "original", title: "Original", desc: "Keep source ratio, lossless" },
  { key: "shorts_blur", title: "Blur fill", desc: "9:16 with blurred backdrop" },
  { key: "shorts_black", title: "Letterbox", desc: "9:16 with solid bars" },
  { key: "shorts_crop", title: "Zoom & fill", desc: "9:16 center crop" },
];

const STYLE_LABEL: Record<StyleKey, string> = {
  original: "Original ratio",
  shorts_blur: "9:16 Blur fill",
  shorts_black: "9:16 Letterbox",
  shorts_crop: "9:16 Zoom & fill",
};

const LANG_CODE: Record<string, string> = {
  tamil: "TA",
  hindi: "HI",
  telugu: "TE",
  english: "EN",
  malayalam: "ML",
  kannada: "KN",
  bengali: "BN",
  marathi: "MR",
  japanese: "JA",
  korean: "KO",
  spanish: "ES",
  french: "FR",
};

function langCode(name: string) {
  const key = name.toLowerCase();
  return LANG_CODE[key] || name.slice(0, 2).toUpperCase() || "??";
}

/** Inline CSS var for range fill */
function fill(value: number, min: number, max: number): CSSProperties {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return { ["--fill" as string]: `${Math.min(100, Math.max(0, pct))}%` } as CSSProperties;
}

/** Tiny visual glyph for each framing style */
function StyleGlyph({ kind, active }: { kind: StyleKey; active: boolean }) {
  const strip = (
    <div
      className={`absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[34%] rounded-[2px] ${
        active ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)]" : "bg-[color:var(--subtle)]"
      }`}
    />
  );

  if (kind === "original") {
    return (
      <div className="flex items-center justify-center w-12 h-12">
        <div
          className={`w-11 h-[25px] rounded-[4px] border ${
            active
              ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] border-transparent"
              : "bg-[color:var(--subtle)]/60 border-[color:var(--border-strong)]"
          }`}
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-12 h-12">
      <div className="relative w-[27px] h-12 rounded-[5px] overflow-hidden border border-[color:var(--border-strong)]">
        {kind === "shorts_blur" && (
          <div
            className={`absolute inset-0 blur-[3px] scale-150 ${
              active ? "bg-gradient-to-b from-[var(--brand)]/60 to-[var(--brand-2)]/60" : "bg-[color:var(--subtle)]/40"
            }`}
          />
        )}
        {kind === "shorts_black" && <div className="absolute inset-0 bg-black" />}
        {kind === "shorts_crop" ? (
          <div
            className={`absolute inset-0 ${
              active ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)]" : "bg-[color:var(--subtle)]/70"
            }`}
          />
        ) : (
          strip
        )}
      </div>
    </div>
  );
}

export function VideoCutStudio() {
  // File & Video State
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoadingSample, setIsLoadingSample] = useState<string>("");

  // Multi-Audio Tracks State
  const [audioTracks, setAudioTracks] = useState<AudioTrackInfo[]>([]);
  const [selectedAudioTrack, setSelectedAudioTrack] = useState<number>(-1); // -1 = All tracks, 0, 1, 2 = specific track
  const [isDetectingAudio, setIsDetectingAudio] = useState<boolean>(false);

  // Simple Cut Mode: "parts" (e.g. 2 parts for 20m video) or "duration" (e.g. 30s shorts) or "trim"
  const [cutMode, setCutMode] = useState<CutMode>("parts");
  const [partsCount, setPartsCount] = useState<number>(2); // Default: 2 parts
  const [segmentLength, setSegmentLength] = useState<number>(30); // Default: 30s for shorts
  const [trimStart, setTrimStart] = useState<number>(0);
  const [trimEnd, setTrimEnd] = useState<number>(0);

  // Framing style
  const [selectedStyle, setSelectedStyle] = useState<StyleKey>("original");

  // Optional Advanced Settings
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);
  const [blurIntensity, setBlurIntensity] = useState<number>(25);
  const [letterboxColor, setLetterboxColor] = useState<string>("#000000");
  const [addPartBadge, setAddPartBadge] = useState<boolean>(true);
  const [resolution, setResolution] = useState<"1080p" | "720p">("1080p");

  // Segments List
  const [segments, setSegments] = useState<VideoSegment[]>([]);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  // Player State
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Batch Processing State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [currentProgress, setCurrentProgress] = useState<number>(0);
  const [overallProgress, setOverallProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [doneMessage, setDoneMessage] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);

  // DOM Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewAudioRef = useRef<HTMLAudioElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef<boolean>(false);

  // Live Audio Preview State for Multi-Audio Switching
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string>("");
  const [isLoadingPreviewAudio, setIsLoadingPreviewAudio] = useState<boolean>(false);

  // Embed (inside UTubeFlow): the verified parent origin, once it has said hello
  const [embedParent, setEmbedParent] = useState<string | null>(null);
  const [embedKind, setEmbedKind] = useState<EmbedInit["kind"] | null>(null);
  const { setTheme } = useTheme();

  useEffect(() => {
    if (!isEmbedRequested()) return;

    const onMessage = (e: MessageEvent) => {
      if (!isAllowedParent(e.origin) || e.source !== window.parent) return;
      const data = e.data as { type?: string } & Partial<EmbedInit> & { count?: number };
      if (data?.type === "utubeflow:init") {
        setEmbedParent(e.origin);
        const kind = data.kind === "short" ? "short" : "video";
        setEmbedKind(kind);
        if (kind === "short") {
          setCutMode("duration");
          setSelectedStyle("shorts_blur");
        } else {
          setCutMode("parts");
          setSelectedStyle("original");
        }
        if (data.theme === "dark" || data.theme === "light") setTheme(data.theme);
      } else if (data?.type === "utubeflow:received") {
        setDoneMessage(`${data.count ?? 0} clip${data.count === 1 ? "" : "s"} added to your UTubeFlow upload list`);
      }
    };

    window.addEventListener("message", onMessage);
    // "ready" carries no data, so "*" is safe; the parent replies with init from its own origin.
    window.parent.postMessage({ type: "videocut:ready" }, "*");
    return () => window.removeEventListener("message", onMessage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Map simplified style to processing options
  const getProcessingOptions = useCallback((): ProcessingOptions => {
    let aspectRatio: AspectRatio = "9:16";
    let framingMode: FramingMode = "blur";

    if (selectedStyle === "shorts_blur") {
      aspectRatio = "9:16";
      framingMode = "blur";
    } else if (selectedStyle === "shorts_black") {
      aspectRatio = "9:16";
      framingMode = "letterbox";
    } else if (selectedStyle === "shorts_crop") {
      aspectRatio = "9:16";
      framingMode = "crop_fill";
    } else if (selectedStyle === "original") {
      aspectRatio = "original";
      framingMode = "original";
    }

    return {
      aspectRatio,
      framingMode,
      segmentDuration: segmentLength,
      blurIntensity,
      letterboxColor,
      cropPanOffset: 0,
      addPartWatermark: addPartBadge && selectedStyle !== "original",
      partBannerText: "PART {n}",
      bannerPosition: "top",
      resolution,
    };
  }, [selectedStyle, segmentLength, blurIntensity, letterboxColor, addPartBadge, resolution]);

  // Handle File Upload
  const handleFile = async (selectedFile: File) => {
    if (!selectedFile.type.startsWith("video/") && !selectedFile.name.match(/\.(mp4|webm|mov|mkv|avi|m4v)$/i)) {
      alert("Please select a valid video file (MP4, WebM, MOV, MKV, etc.)");
      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(selectedFile);
    setFile(selectedFile);
    setVideoUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setActiveSegmentIndex(null);
    setAudioTracks([]);
    setSelectedAudioTrack(-1);
    setDoneMessage("");

    // Auto-detect multi-audio tracks & container metadata instantly
    setIsDetectingAudio(true);
    try {
      const parsed = await parseMediaMetadata(selectedFile);
      const tracks = parsed.tracks;
      setAudioTracks(tracks);

      if (tracks.length > 1) {
        // Auto-select Tamil if present in video, else default or first track
        const tamilIdx = tracks.findIndex(
          (t) => t.languageName.toLowerCase() === "tamil" || t.title.toLowerCase().includes("tamil")
        );
        if (tamilIdx !== -1) {
          setSelectedAudioTrack(tracks[tamilIdx].index);
        } else {
          const defIdx = tracks.findIndex((t) => t.isDefault);
          if (defIdx !== -1) setSelectedAudioTrack(tracks[defIdx].index);
          else setSelectedAudioTrack(0);
        }
      } else {
        setSelectedAudioTrack(-1);
      }

      // If container gave us valid duration & dimensions, apply immediately
      if (parsed.duration > 0 && parsed.width > 0) {
        setMetadata({
          name: selectedFile.name,
          size: selectedFile.size,
          duration: parsed.duration,
          width: parsed.width,
          height: parsed.height,
          aspectRatio: parsed.width / parsed.height,
        });
        setTrimStart(0);
        setTrimEnd(parsed.duration);
        rebuildSegments(parsed.duration, cutMode, partsCount, segmentLength, 0, parsed.duration);
      }
    } catch (e) {
      console.warn("Audio detection note:", e);
    } finally {
      setIsDetectingAudio(false);
    }
  };

  // Local Jackie Chan Sample Video with 6 Audio Tracks (Tamil, Telugu, Hindi, English)
  const loadJackieChanSample = async () => {
    try {
      setIsLoadingSample("jackie");
      setIsDetectingAudio(true);
      const filename = "[Toonworld4all] Jackie Chan Adventures S01E01 Remastered 720p HEVC 10bit WEB-DL Multi Audio.mkv";
      const response = await fetch(`/${encodeURIComponent(filename)}`);
      if (!response.ok) {
        throw new Error(`Failed to load ${filename}`);
      }
      const blob = await response.blob();
      const sampleFile = new File([blob], filename, { type: "video/x-matroska" });
      handleFile(sampleFile);
    } catch (e: any) {
      alert(`Could not load local sample: ${e.message}`);
    } finally {
      setIsDetectingAudio(false);
      setIsLoadingSample("");
    }
  };

  // Demo Video Loader
  const loadDemoVideo = async () => {
    try {
      setIsLoadingSample("bunny");
      const response = await fetch(
        "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      );
      const blob = await response.blob();
      const demoFile = new File([blob], "sample-video.mp4", { type: "video/mp4" });
      handleFile(demoFile);
    } catch {
      alert("Could not load demo video. Please upload your video file.");
    } finally {
      setIsLoadingSample("");
    }
  };

  // Extract preview audio for the selected audio track so live preview plays Tamil / Telugu / etc.
  useEffect(() => {
    if (!file || selectedAudioTrack < 0) {
      setPreviewAudioUrl("");
      return;
    }

    let isCancelled = false;
    setIsLoadingPreviewAudio(true);

    (async () => {
      try {
        const url = await extractAudioPreview(file, selectedAudioTrack, 300);
        if (!isCancelled) {
          setPreviewAudioUrl(url);
        }
      } catch (err) {
        console.warn("Live audio preview note:", err);
      } finally {
        if (!isCancelled) {
          setIsLoadingPreviewAudio(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [file, selectedAudioTrack]);

  // Keep the separate language audio element in sync with the mute button
  useEffect(() => {
    if (previewAudioRef.current) previewAudioRef.current.muted = isMuted;
  }, [isMuted, previewAudioUrl]);

  // When video loads metadata
  const onVideoLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;

    const dur = video.duration || 0;
    const w = video.videoWidth || 1920;
    const h = video.videoHeight || 1080;

    setMetadata({
      name: file?.name || "Video",
      size: file?.size || 0,
      duration: dur,
      width: w,
      height: h,
      aspectRatio: w / h,
    });

    setTrimStart(0);
    setTrimEnd(dur);

    rebuildSegments(dur, cutMode, partsCount, segmentLength, 0, dur);
  };

  // Rebuild Segments based on active mode
  const rebuildSegments = useCallback(
    (dur: number, mode: CutMode, parts: number, segLen: number, start: number, end: number) => {
      let rawSegments: { id: string; index: number; title: string; startTime: number; endTime: number; duration: number }[] = [];

      if (mode === "parts") {
        rawSegments = generateSegmentsByCount(dur, parts, start, end);
      } else if (mode === "duration") {
        rawSegments = generateSegments(dur, segLen, start, end);
      } else if (mode === "trim") {
        rawSegments = [
          {
            id: `seg-trim-1`,
            index: 1,
            title: `Trimmed Clip`,
            startTime: start,
            endTime: end,
            duration: end - start,
          },
        ];
      }

      const segs: VideoSegment[] = rawSegments.map((s) => ({
        ...s,
        selected: true,
        status: "idle",
      }));

      setSegments(segs);
    },
    []
  );

  // Recalculate segments when mode, parts, or duration changes
  useEffect(() => {
    if (metadata) {
      rebuildSegments(metadata.duration, cutMode, partsCount, segmentLength, trimStart, trimEnd);
    }
  }, [cutMode, partsCount, segmentLength, trimStart, trimEnd, metadata, rebuildSegments]);

  // Live Canvas Preview Frame
  const renderPreviewFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const opts = getProcessingOptions();

    let targetW = 360;
    let targetH = 640;

    if (opts.aspectRatio === "original") {
      const vw = video.videoWidth || 1920;
      const vh = video.videoHeight || 1080;
      const vAspect = vw / vh;

      if (vAspect >= 1) {
        targetW = Math.min(640, vw);
        targetH = Math.round(targetW / vAspect);
      } else {
        targetH = Math.min(640, vh);
        targetW = Math.round(targetH * vAspect);
      }

      targetW = targetW - (targetW % 2);
      targetH = targetH - (targetH % 2);
    }

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    let currentPartNum = 1;
    if (segments.length > 0) {
      const curT = video.currentTime;
      const found = segments.find((s) => curT >= s.startTime && curT <= s.endTime);
      if (found) currentPartNum = found.index;
    }

    drawFramedFrame(ctx, video, targetW, targetH, opts, currentPartNum);

    if (!video.paused && !video.ended) {
      animFrameRef.current = requestAnimationFrame(renderPreviewFrame);
    }
  }, [getProcessingOptions, segments]);

  // Re-draw the paused frame whenever framing settings change
  useEffect(() => {
    if (!isPlaying) renderPreviewFrame();
  }, [renderPreviewFrame, isPlaying]);

  // Video timeupdate
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    if (activeSegmentIndex !== null && segments[activeSegmentIndex]) {
      const seg = segments[activeSegmentIndex];
      if (video.currentTime >= seg.endTime) {
        video.currentTime = seg.startTime;
        if (previewAudioRef.current) previewAudioRef.current.currentTime = seg.startTime;
      }
    }

    renderPreviewFrame();
  };

  const startPlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    const audio = previewAudioRef.current;

    if (previewAudioUrl && audio) {
      video.muted = true;
      audio.muted = isMuted;
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    } else {
      video.muted = isMuted;
    }

    video.play().then(() => {
      setIsPlaying(true);
      renderPreviewFrame();
    });
  };

  // Play / Pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      startPlayback();
    } else {
      video.pause();
      previewAudioRef.current?.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }
  };

  // Seek
  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = newTime;
    setCurrentTime(newTime);

    const audio = previewAudioRef.current;
    if (audio) {
      audio.currentTime = newTime;
    }

    renderPreviewFrame();
  };

  // Timeline scrubbing
  const seekFromPointer = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || !metadata?.duration) return;
    const rect = el.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    setActiveSegmentIndex(null);
    handleSeek(ratio * metadata.duration);
  };

  // Preview Specific Segment
  const previewSegment = (index: number) => {
    const seg = segments[index];
    if (!seg || !videoRef.current) return;

    setActiveSegmentIndex(index);
    videoRef.current.currentTime = seg.startTime;
    setCurrentTime(seg.startTime);
    if (previewAudioRef.current) previewAudioRef.current.currentTime = seg.startTime;
    startPlayback();
    document.getElementById("studio-monitor")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const toggleSegment = (id: string) => {
    setSegments((prev) => prev.map((s) => (s.id === id ? { ...s, selected: !s.selected } : s)));
  };

  const setAllSelected = (value: boolean) => {
    setSegments((prev) => prev.map((s) => ({ ...s, selected: value })));
  };

  // Generate Thumbnails
  const generateAllThumbnails = async () => {
    if (!file || segments.length === 0 || !videoUrl) return;

    const tempVideo = document.createElement("video");
    tempVideo.crossOrigin = "anonymous";
    tempVideo.preload = "auto";
    tempVideo.src = videoUrl;

    await new Promise((res) => {
      tempVideo.onloadedmetadata = res;
    });

    const opts = getProcessingOptions();

    for (let i = 0; i < Math.min(segments.length, 30); i++) {
      const seg = segments[i];
      try {
        const thumbUrl = await captureSegmentThumbnail(tempVideo, seg, opts);
        setSegments((prev) =>
          prev.map((s) => (s.id === seg.id ? { ...s, thumbnailUrl: thumbUrl } : s))
        );
      } catch (e) {
        console.warn("Thumbnail note", e);
      }
    }
    tempVideo.removeAttribute("src");
    tempVideo.load();
  };

  useEffect(() => {
    if (file && segments.length > 0 && !segments[0].thumbnailUrl) {
      generateAllThumbnails();
    }
  }, [file, segments.length, selectedStyle]);

  // Render & Download a single clip
  const downloadSingleSegment = async (segment: VideoSegment) => {
    if (!file || !videoUrl) return;

    try {
      setSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? { ...s, status: "rendering" } : s))
      );

      const safeBaseName = file.name.replace(/\.[^/.]+$/, "");
      const opts = getProcessingOptions();

      let blob: Blob;
      let ext = "mp4";

      if (opts.aspectRatio === "original") {
        try {
          const res = await sliceVideoLossless(file, segment, selectedAudioTrack, undefined, true);
          blob = res.blob;
          ext = res.extension;
        } catch (err: any) {
          console.warn("Single slice fallback:", err);
          const res = await renderSegmentWithCanvas(videoUrl, segment, opts, () => {});
          blob = res.blob;
          ext = res.extension;
        }
      } else {
        let tempClipUrl = "";
        try {
          const sliceRes = await sliceVideoLossless(file, segment, selectedAudioTrack, undefined, true);
          tempClipUrl = URL.createObjectURL(sliceRes.blob);
          const res = await renderSegmentWithCanvas(
            tempClipUrl,
            { ...segment, startTime: 0, endTime: segment.duration },
            opts,
            () => {}
          );
          blob = res.blob;
          ext = res.extension;
        } catch (err: any) {
          console.warn("Shorts slice fallback:", err);
          const res = await renderSegmentWithCanvas(videoUrl, segment, opts, () => {});
          blob = res.blob;
          ext = res.extension;
        } finally {
          if (tempClipUrl) URL.revokeObjectURL(tempClipUrl);
        }
      }

      const filename = `${safeBaseName}_${segment.title.replace(/\s+/g, "_")}.${ext}`;
      saveAs(blob, filename);

      setSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? { ...s, status: "ready" } : s))
      );
    } catch (err: any) {
      alert(`Error rendering ${segment.title}: ${err.message}`);
      setSegments((prev) =>
        prev.map((s) => (s.id === segment.id ? { ...s, status: "error" } : s))
      );
    }
  };

  // Batch export: download all parts as a ZIP, or send them to UTubeFlow when embedded
  const processAndDownloadAll = async (target: "zip" | "utubeflow" = "zip") => {
    if (target === "utubeflow" && !embedParent) return;
    const selectedSegments = segments.filter((s) => s.selected);
    if (selectedSegments.length === 0) {
      alert("Please select at least one part to download.");
      return;
    }

    if (!file || !videoUrl) return;

    setIsProcessing(true);
    setCurrentProgress(0);
    setOverallProgress(0);
    setDoneMessage("");

    const abortCtrl = new AbortController();
    abortControllerRef.current = abortCtrl;

    const zip = new JSZip();
    const clips: EmbedClip[] = [];
    const safeBaseName = file.name.replace(/\.[^/.]+$/, "");
    const niceTitle = safeBaseName.replace(/\[[^\]]*\]/g, "").replace(/[_.]+/g, " ").replace(/\s+/g, " ").trim() || "Video";
    const opts = getProcessingOptions();

    try {
      for (let i = 0; i < selectedSegments.length; i++) {
        if (abortCtrl.signal.aborted) break;

        const seg = selectedSegments[i];
        setStatusMessage(`Cutting ${seg.title} (${i + 1} of ${selectedSegments.length})...`);

        setSegments((prev) =>
          prev.map((s) => (s.id === seg.id ? { ...s, status: "rendering" } : s))
        );

        let blob: Blob;
        let ext = "mp4";

        if (opts.aspectRatio === "original") {
          try {
            const activeLang = selectedAudioTrack >= 0 && audioTracks[selectedAudioTrack] ? audioTracks[selectedAudioTrack].languageName : "Tamil";
            setStatusMessage(`Fast slicing ${seg.title} with ${activeLang} audio (~1s)...`);
            const sliceRes = await sliceVideoLossless(file, seg, selectedAudioTrack, (msg) => setStatusMessage(msg), true);
            blob = sliceRes.blob;
            ext = sliceRes.extension;
            setCurrentProgress(100);
            setOverallProgress(Math.round(((i + 1) / selectedSegments.length) * 100));
          } catch (err: any) {
            console.warn("Fast slice fallback:", err);
            setStatusMessage(`Rendering ${seg.title} with video engine...`);
            const res = await renderSegmentWithCanvas(
              videoUrl,
              seg,
              opts,
              (p) => {
                setCurrentProgress(p);
                setOverallProgress(Math.round(((i + p / 100) / selectedSegments.length) * 100));
              },
              abortCtrl.signal
            );
            blob = res.blob;
            ext = res.extension;
          }
        } else {
          let tempClipUrl = "";
          try {
            const activeLang = selectedAudioTrack >= 0 && audioTracks[selectedAudioTrack] ? audioTracks[selectedAudioTrack].languageName : "Tamil";
            setStatusMessage(`Extracting ${activeLang} audio clip for ${seg.title}...`);
            const sliceRes = await sliceVideoLossless(file, seg, selectedAudioTrack, (msg) => setStatusMessage(msg), true);
            tempClipUrl = URL.createObjectURL(sliceRes.blob);

            setStatusMessage(`Rendering 9:16 Shorts with ${activeLang} audio (${seg.title})...`);
            const res = await renderSegmentWithCanvas(
              tempClipUrl,
              { ...seg, startTime: 0, endTime: seg.duration },
              opts,
              (p) => {
                setCurrentProgress(p);
                setOverallProgress(Math.round(((i + p / 100) / selectedSegments.length) * 100));
              },
              abortCtrl.signal
            );
            blob = res.blob;
            ext = res.extension;
          } catch (err: any) {
            console.warn("Shorts slice fallback:", err);
            const res = await renderSegmentWithCanvas(
              videoUrl,
              seg,
              opts,
              (p) => {
                setCurrentProgress(p);
                setOverallProgress(Math.round(((i + p / 100) / selectedSegments.length) * 100));
              },
              abortCtrl.signal
            );
            blob = res.blob;
            ext = res.extension;
          } finally {
            if (tempClipUrl) URL.revokeObjectURL(tempClipUrl);
          }
        }

        const filename = `${safeBaseName}_Part_${String(seg.index).padStart(2, "0")}.${ext}`;
        if (target === "zip") {
          zip.file(filename, blob);
        } else {
          clips.push({
            name: filename,
            type: blob.type || MIME_BY_EXT[ext] || "video/mp4",
            blob,
            title: `${niceTitle} - Part ${seg.index}`.slice(0, 100),
            index: seg.index,
            duration: seg.duration,
          });
        }

        setSegments((prev) =>
          prev.map((s) => (s.id === seg.id ? { ...s, status: "ready" } : s))
        );
      }

      if (!abortCtrl.signal.aborted && target === "utubeflow" && embedParent) {
        setStatusMessage("Sending clips to UTubeFlow...");
        setOverallProgress(100);
        window.parent.postMessage({ type: "videocut:clips", clips }, embedParent);
        setStatusMessage(`Sent ${clips.length} clips to UTubeFlow.`);
        setDoneMessage(`Sent ${clips.length} clip${clips.length > 1 ? "s" : ""} to UTubeFlow`);
      } else if (!abortCtrl.signal.aborted) {
        setStatusMessage("Zipping all parts...");
        setOverallProgress(99);

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const zipName = `${safeBaseName}_Cut_Parts.zip`;
        saveAs(zipBlob, zipName);

        setOverallProgress(100);
        setStatusMessage(`Done! Downloaded ${selectedSegments.length} parts.`);
        setDoneMessage(`${selectedSegments.length} part${selectedSegments.length > 1 ? "s" : ""} saved as ${zipName}`);

        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } catch (err: any) {
      if (!abortCtrl.signal.aborted) {
        alert(`Export stopped: ${err.message}`);
      }
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  };

  const resetVideo = () => {
    if (!confirm("Remove this video and start over?")) return;
    videoRef.current?.pause();
    previewAudioRef.current?.pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    setFile(null);
    setVideoUrl("");
    setMetadata(null);
    setSegments([]);
    setAudioTracks([]);
    setSelectedAudioTrack(-1);
    setIsPlaying(false);
    setCurrentTime(0);
    setDoneMessage("");
  };

  // Derived values
  const selectedCount = segments.filter((s) => s.selected).length;
  const duration = metadata?.duration || 0;
  const isVertical = selectedStyle !== "original";
  const activeTrack = selectedAudioTrack >= 0 ? audioTracks.find((t) => t.index === selectedAudioTrack) : undefined;
  const voiceLabel =
    selectedAudioTrack === -1
      ? "All audio tracks"
      : activeTrack
      ? `${activeTrack.languageName} audio`
      : `Track ${selectedAudioTrack + 1}`;
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const perClip = cutMode === "parts" ? duration / (segments.length || 1) : segmentLength;

  return (
    <section id="studio" className="relative z-10 w-full">
      {/* Hidden audio-enabled video */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="hidden"
          preload="auto"
          crossOrigin="anonymous"
          muted={previewAudioUrl ? true : isMuted}
          onLoadedMetadata={onVideoLoadedMetadata}
          onLoadedData={renderPreviewFrame}
          onSeeked={renderPreviewFrame}
          onTimeUpdate={onTimeUpdate}
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {/* Synchronized Live Audio for Selected Language Track */}
      {previewAudioUrl && (
        <audio
          ref={previewAudioRef}
          src={previewAudioUrl}
          preload="auto"
          onEnded={() => setIsPlaying(false)}
        />
      )}

      {!file ? (
        /* ------------------------------------------------------------ */
        /*  Empty state: dropzone                                       */
        /* ------------------------------------------------------------ */
        <div className="max-w-3xl mx-auto animate-fade-up">
          <div
            data-drag={isDragging}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            className="dropzone group relative cursor-pointer overflow-hidden rounded-[28px] px-6 py-14 sm:px-14 sm:py-16 text-center shadow-[var(--shadow-lg)] transition-transform duration-300"
          >
            <div className="dropzone-dash" />

            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.mkv,.avi"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            />

            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl btn-primary animate-float">
                <CloudUpload className="h-7 w-7" strokeWidth={2} />
              </div>

              <h2 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[color:var(--fg)]">
                {isDragging ? "Release to load your video" : "Drop a video to start cutting"}
              </h2>
              <p className="mt-2 text-sm text-[color:var(--muted)] max-w-md mx-auto leading-relaxed">
                Split into equal parts or vertical Shorts. MP4, MOV, MKV, WebM and AVI. Nothing leaves your device.
              </p>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button type="button" className="btn btn-primary h-11 px-6 text-sm w-full sm:w-auto">
                  <Scissors className="w-4 h-4" />
                  Choose video file
                </button>
                <span className="text-xs text-[color:var(--subtle)] hidden sm:inline">or</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  {SHOW_LOCAL_SAMPLE && (
                    <button
                      type="button"
                      disabled={!!isLoadingSample}
                      onClick={(e) => {
                        e.stopPropagation();
                        loadJackieChanSample();
                      }}
                      className="btn btn-secondary h-11 px-4 text-[13px] flex-1 sm:flex-none"
                    >
                      {isLoadingSample === "jackie" ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Languages className="w-4 h-4 text-[color:var(--brand)]" />
                      )}
                      Multi-audio sample
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!isLoadingSample}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadDemoVideo();
                    }}
                    className="btn btn-secondary h-11 px-4 text-[13px] flex-1 sm:flex-none"
                  >
                    {isLoadingSample === "bunny" ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Film className="w-4 h-4 text-[color:var(--brand)]" />
                    )}
                    MP4 sample
                  </button>
                </div>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[color:var(--muted)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Private, in-browser
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Lossless fast slicing
                </span>
                <span className="flex items-center gap-1.5">
                  <AudioLines className="w-4 h-4 text-[color:var(--brand)]" /> Multi-language audio
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------ */
        /*  Workspace                                                   */
        /* ------------------------------------------------------------ */
        <div className="space-y-5 animate-fade-up">
          {/* File bar */}
          <div className="panel flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] text-[color:var(--brand-fg)] flex items-center justify-center shrink-0">
                <Film className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="font-display text-[15px] font-semibold text-[color:var(--fg)] truncate max-w-[70vw] sm:max-w-xl" title={file.name}>
                  {file.name}
                </h4>
                <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                  <span className="chip">
                    <Clock className="w-3 h-3" />
                    {metadata ? formatTime(metadata.duration) : "--:--"}
                  </span>
                  <span className="chip">
                    <HardDrive className="w-3 h-3" />
                    {formatBytes(file.size)}
                  </span>
                  <span className="chip font-mono">{metadata ? `${metadata.width}×${metadata.height}` : "Reading…"}</span>
                  {audioTracks.length > 1 && (
                    <span className="chip chip-brand">
                      <Languages className="w-3 h-3" />
                      {audioTracks.length} audio tracks
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button onClick={resetVideo} className="btn btn-secondary h-9 px-3.5 text-[13px] self-start sm:self-auto">
              <RefreshCw className="w-3.5 h-3.5" />
              Change video
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* ---------------- Monitor ---------------- */}
            <div id="studio-monitor" className="lg:col-span-7 lg:sticky lg:top-20 space-y-5">
              <div className="panel overflow-hidden">
                <div className="panel-head">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="relative flex h-2 w-2">
                      {isPlaying && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      )}
                      <span className={`relative inline-flex rounded-full h-2 w-2 ${isPlaying ? "bg-emerald-500" : "bg-[color:var(--subtle)]"}`} />
                    </span>
                    <span className="font-display font-semibold text-sm text-[color:var(--fg)]">Preview</span>
                    <span className="chip hidden sm:inline-flex">{STYLE_LABEL[selectedStyle]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeTrack && (
                      <span className="chip chip-brand">
                        {isLoadingPreviewAudio ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <AudioLines className="w-3 h-3" />
                        )}
                        {isLoadingPreviewAudio ? "Syncing audio" : activeTrack.languageName}
                      </span>
                    )}
                    {activeSegmentIndex !== null && segments[activeSegmentIndex] && (
                      <button
                        onClick={() => setActiveSegmentIndex(null)}
                        className="chip chip-brand hover:opacity-80 transition-opacity"
                        title="Stop looping this part"
                      >
                        <Repeat className="w-3 h-3" />
                        {segments[activeSegmentIndex].title}
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Screen */}
                <div className="monitor relative flex justify-center items-center p-5 sm:p-8 min-h-[300px] sm:min-h-[420px]">
                  <div className="relative inline-flex items-center justify-center group">
                    <canvas
                      ref={previewCanvasRef}
                      onClick={togglePlay}
                      className={`block cursor-pointer rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/10 transition-[height,width] duration-500 ${
                        isVertical
                          ? "h-[360px] sm:h-[440px] w-auto"
                          : "w-full max-w-full max-h-[400px] h-auto"
                      }`}
                    />

                    <button
                      onClick={togglePlay}
                      aria-label={isPlaying ? "Pause" : "Play"}
                      className={`absolute inset-0 m-auto w-16 h-16 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/25 text-white flex items-center justify-center transition-all duration-300 hover:bg-white/25 hover:scale-105 ${
                        isPlaying ? "opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-hover:scale-100" : "opacity-100"
                      }`}
                    >
                      {isPlaying ? <Pause className="w-6 h-6 fill-white" /> : <Play className="w-6 h-6 fill-white ml-1" />}
                    </button>
                  </div>
                </div>

                {/* Transport + timeline */}
                <div className="px-4 sm:px-5 pt-4 pb-5 space-y-3 bg-[color:var(--card)]">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="btn btn-primary w-10 h-10 rounded-full p-0 shrink-0"
                      aria-label={isPlaying ? "Pause" : "Play"}
                    >
                      {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                    </button>

                    <div className="font-mono text-xs tabular-nums text-[color:var(--muted)]">
                      <span className="text-[color:var(--fg)] font-semibold">{formatTime(currentTime)}</span>
                      <span className="mx-1 text-[color:var(--subtle)]">/</span>
                      {formatTime(duration)}
                    </div>

                    <div className="flex-1" />

                    <button
                      onClick={() => setIsMuted(!isMuted)}
                      className="btn btn-ghost w-9 h-9 p-0"
                      aria-label={isMuted ? "Unmute" : "Mute"}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Timeline with segments */}
                  <div
                    ref={timelineRef}
                    className="relative h-11 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)] cursor-pointer select-none touch-none overflow-hidden"
                    onPointerDown={(e) => {
                      scrubbingRef.current = true;
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      seekFromPointer(e.clientX);
                    }}
                    onPointerMove={(e) => scrubbingRef.current && seekFromPointer(e.clientX)}
                    onPointerUp={() => (scrubbingRef.current = false)}
                    onPointerCancel={() => (scrubbingRef.current = false)}
                  >
                    {duration > 0 &&
                      segments.map((seg, i) => {
                        const left = (seg.startTime / duration) * 100;
                        const width = (seg.duration / duration) * 100;
                        const isActive = activeSegmentIndex === i;
                        return (
                          <div
                            key={seg.id}
                            className="timeline-seg m-1 flex items-center justify-center overflow-hidden"
                            style={{
                              left: `${left}%`,
                              width: `calc(${width}% - 4px)`,
                              background: isActive
                                ? "linear-gradient(135deg, var(--brand), var(--brand-2))"
                                : seg.selected
                                ? "var(--brand-soft)"
                                : "transparent",
                              border: `1px solid ${seg.selected || isActive ? "var(--brand-line)" : "var(--border)"}`,
                            }}
                          >
                            {width > 4 && (
                              <span
                                className={`text-[10px] font-semibold font-mono truncate px-1 ${
                                  isActive ? "text-white" : seg.selected ? "text-[color:var(--brand-fg)]" : "text-[color:var(--subtle)]"
                                }`}
                              >
                                {width > 9 ? seg.title.replace("Part ", "P") : seg.index}
                              </span>
                            )}
                          </div>
                        );
                      })}

                    {/* Playhead */}
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-[color:var(--fg)] pointer-events-none"
                      style={{ left: `${playheadPct}%`, transition: isPlaying ? "none" : "left 0.15s var(--ease)" }}
                    >
                      <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[color:var(--fg)] ring-2 ring-[color:var(--card)]" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-[color:var(--subtle)]">
                    <span>00:00</span>
                    <span>Click or drag to scrub · {segments.length} parts</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ---------------- Controls ---------------- */}
            <div className="lg:col-span-5 space-y-5">
              {/* Step 1: Audio */}
              <div className="panel">
                <div className="panel-head">
                  <div className="flex items-center gap-3">
                    <span className="step-num">1</span>
                    <div>
                      <h3 className="font-display font-semibold text-[15px] text-[color:var(--fg)]">Audio track</h3>
                      <p className="text-xs text-[color:var(--muted)]">Choose which language to keep</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--muted)]">
                    {isPlaying && selectedAudioTrack !== -1 ? (
                      <div className="flex items-end gap-[3px] h-3.5">
                        <span className="w-[3px] bg-emerald-500 rounded-full animate-eq-1" />
                        <span className="w-[3px] bg-emerald-500 rounded-full animate-eq-2" />
                        <span className="w-[3px] bg-emerald-500 rounded-full animate-eq-3" />
                        <span className="w-[3px] bg-emerald-500 rounded-full animate-eq-4" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="p-4 sm:p-5 space-y-3">
                  {isDetectingAudio && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-[color:var(--muted)]">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[color:var(--brand)]" />
                        Scanning audio tracks…
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="skeleton h-14 rounded-xl" />
                        <div className="skeleton h-14 rounded-xl" />
                      </div>
                    </div>
                  )}

                  {!isDetectingAudio && audioTracks.length === 1 && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)] text-xs text-[color:var(--muted)] leading-relaxed">
                      <AudioLines className="w-4 h-4 mt-px shrink-0 text-[color:var(--brand)]" />
                      <span>This video has a single audio track. It&apos;s kept as is in every part.</span>
                    </div>
                  )}

                  {!isDetectingAudio && audioTracks.length > 1 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-2 stagger">
                      <button
                        type="button"
                        data-active={selectedAudioTrack === -1}
                        onClick={() => setSelectedAudioTrack(-1)}
                        className="option p-3 flex items-center gap-3"
                      >
                        <span className="w-9 h-9 rounded-lg bg-[color:var(--card-alt)] border border-[color:var(--border)] flex items-center justify-center shrink-0">
                          <Languages className="w-4 h-4 text-[color:var(--muted)]" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-[color:var(--fg)]">Keep all</span>
                          <span className="block text-[11px] text-[color:var(--muted)] truncate">Every track preserved</span>
                        </span>
                        {selectedAudioTrack === -1 && <CircleCheck className="w-4 h-4 text-[color:var(--brand)] shrink-0" />}
                      </button>

                      {audioTracks.map((track) => {
                        const isTamil =
                          track.languageName.toLowerCase() === "tamil" || track.title.toLowerCase().includes("tamil");
                        const isSelected = selectedAudioTrack === track.index;

                        return (
                          <button
                            key={track.index}
                            type="button"
                            data-active={isSelected}
                            onClick={() => setSelectedAudioTrack(track.index)}
                            className="option p-3 flex items-center gap-3"
                            title={track.title || track.displayLabel}
                          >
                            <span
                              className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-display text-xs font-bold transition-colors ${
                                isSelected
                                  ? "btn-primary"
                                  : "bg-[color:var(--card-alt)] border border-[color:var(--border)] text-[color:var(--muted)]"
                              }`}
                            >
                              {langCode(track.languageName)}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--fg)]">
                                <span className="truncate">{track.languageName}</span>
                                {isTamil && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-px rounded bg-[color:var(--brand-soft)] text-[color:var(--brand-fg)] border border-[color:var(--brand-line)]">
                                    Pick
                                  </span>
                                )}
                                {track.isDefault && !isTamil && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-px rounded bg-[color:var(--card-alt)] text-[color:var(--subtle)] border border-[color:var(--border)]">
                                    Default
                                  </span>
                                )}
                              </span>
                              <span className="block text-[11px] text-[color:var(--muted)] truncate">
                                {track.title || `Track ${track.index + 1} · ${track.codec.toUpperCase()}`}
                              </span>
                            </span>
                            {isSelected && <CircleCheck className="w-4 h-4 text-[color:var(--brand)] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Fallback when tracks couldn't be parsed */}
                  {!isDetectingAudio && audioTracks.length === 0 && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)] text-xs text-[color:var(--muted)] leading-relaxed">
                        <AudioLines className="w-4 h-4 mt-px shrink-0 text-[color:var(--subtle)]" />
                        <span>
                          No track labels found. The original audio is kept by default, or pick a track number manually if you know it.
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[-1, 0, 1, 2, 3, 4, 5].map((idx) => (
                          <button
                            key={idx}
                            type="button"
                            data-active={selectedAudioTrack === idx}
                            onClick={() => setSelectedAudioTrack(idx)}
                            className="option px-3 py-1.5 text-xs font-semibold text-[color:var(--fg)]"
                          >
                            {idx === -1 ? "All tracks" : `Track ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Cut */}
              <div className="panel">
                <div className="panel-head">
                  <div className="flex items-center gap-3">
                    <span className="step-num">2</span>
                    <div>
                      <h3 className="font-display font-semibold text-[15px] text-[color:var(--fg)]">How to cut</h3>
                      <p className="text-xs text-[color:var(--muted)]">Equal parts or fixed-length clips</p>
                    </div>
                  </div>
                  <span className="chip chip-brand font-mono">{segments.length} parts</span>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="segmented grid-cols-2">
                    <div
                      className="segmented-thumb"
                      style={{
                        width: "calc(50% - 4px)",
                        transform: cutMode === "duration" ? "translateX(100%)" : "translateX(0)",
                      }}
                    />
                    <button
                      type="button"
                      data-active={cutMode === "parts"}
                      onClick={() => {
                        setCutMode("parts");
                        setSelectedStyle("original");
                      }}
                    >
                      <Scissors className="w-4 h-4" />
                      Equal parts
                    </button>
                    <button
                      type="button"
                      data-active={cutMode === "duration"}
                      onClick={() => {
                        setCutMode("duration");
                        setSelectedStyle("shorts_blur");
                      }}
                    >
                      <Sparkles className="w-4 h-4" />
                      Shorts clips
                    </button>
                  </div>

                  {cutMode === "parts" && (
                    <div key="parts" className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-4 gap-2">
                        {[2, 3, 4, 5].map((count) => (
                          <button
                            key={count}
                            type="button"
                            data-active={partsCount === count}
                            onClick={() => setPartsCount(count)}
                            className="option py-2.5 px-1 text-center"
                          >
                            <div className="font-display text-lg font-bold text-[color:var(--fg)] leading-none">{count}</div>
                            <div className="text-[10px] text-[color:var(--muted)] font-mono mt-1.5">
                              {duration ? formatTime(duration / count) : count === 2 ? "halves" : "parts"}
                            </div>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="label shrink-0">Custom</span>
                        <input
                          type="range"
                          min="2"
                          max="20"
                          value={partsCount}
                          style={fill(partsCount, 2, 20)}
                          onChange={(e) => setPartsCount(Number(e.target.value))}
                          className="flex-1"
                          aria-label="Number of parts"
                        />
                        <span className="font-mono font-semibold text-sm text-[color:var(--fg)] w-8 text-right tabular-nums">
                          {partsCount}
                        </span>
                      </div>
                    </div>
                  )}

                  {cutMode === "duration" && (
                    <div key="duration" className="space-y-3 animate-fade-in">
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { len: 15, desc: "Stories" },
                          { len: 30, desc: "Shorts" },
                          { len: 45, desc: "Reels" },
                          { len: 60, desc: "1 min" },
                        ].map((d) => (
                          <button
                            key={d.len}
                            type="button"
                            data-active={segmentLength === d.len}
                            onClick={() => setSegmentLength(d.len)}
                            className="option py-2.5 px-1 text-center"
                          >
                            <div className="font-display text-lg font-bold text-[color:var(--fg)] leading-none">
                              {d.len}
                              <span className="text-xs font-semibold text-[color:var(--muted)]">s</span>
                            </div>
                            <div className="text-[10px] text-[color:var(--muted)] mt-1.5">{d.desc}</div>
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center gap-3 pt-1">
                        <span className="label shrink-0">Custom</span>
                        <input
                          type="range"
                          min="5"
                          max="120"
                          value={segmentLength}
                          style={fill(segmentLength, 5, 120)}
                          onChange={(e) => setSegmentLength(Number(e.target.value))}
                          className="flex-1"
                          aria-label="Clip length in seconds"
                        />
                        <span className="font-mono font-semibold text-sm text-[color:var(--fg)] w-10 text-right tabular-nums">
                          {segmentLength}s
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Format */}
              <div className="panel">
                <div className="panel-head">
                  <div className="flex items-center gap-3">
                    <span className="step-num">3</span>
                    <div>
                      <h3 className="font-display font-semibold text-[15px] text-[color:var(--fg)]">Output format</h3>
                      <p className="text-xs text-[color:var(--muted)]">Frame for YouTube, Shorts or Reels</p>
                    </div>
                  </div>
                  <span className="chip font-mono">{isVertical ? "1080×1920" : metadata ? `${metadata.width}×${metadata.height}` : "Source"}</span>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {STYLE_OPTIONS.map((opt) => {
                      const active = selectedStyle === opt.key;
                      return (
                        <button
                          key={opt.key}
                          type="button"
                          data-active={active}
                          onClick={() => setSelectedStyle(opt.key)}
                          className="option p-3 flex items-center gap-2.5"
                        >
                          <StyleGlyph kind={opt.key} active={active} />
                          <span className="min-w-0">
                            <span className="block text-[13px] font-semibold text-[color:var(--fg)]">{opt.title}</span>
                            <span className="block text-[11px] text-[color:var(--muted)] leading-snug">{opt.desc}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Fine-tune */}
                  <div className="rounded-xl border border-[color:var(--border)] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 text-[13px] font-semibold text-[color:var(--fg)] hover:bg-[color:var(--card-alt)] transition-colors"
                      aria-expanded={showAdvanced}
                    >
                      <span className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[color:var(--muted)]" />
                        Fine-tune
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 text-[color:var(--muted)] transition-transform duration-300 ${showAdvanced ? "rotate-180" : ""}`}
                      />
                    </button>
                    <div className="accordion" data-open={showAdvanced}>
                      <div>
                        <div className="px-3.5 pb-4 pt-1 space-y-4 border-t border-[color:var(--border)]">
                          {!isVertical && (
                            <p className="text-xs text-[color:var(--muted)] pt-3 leading-relaxed">
                              Original ratio is a lossless stream copy, so there&apos;s nothing to adjust. Pick a 9:16 format for framing options.
                            </p>
                          )}

                          {selectedStyle === "shorts_blur" && (
                            <div className="pt-3 space-y-2">
                              <div className="flex justify-between">
                                <span className="label">Blur strength</span>
                                <span className="font-mono text-xs text-[color:var(--fg)]">{blurIntensity}px</span>
                              </div>
                              <input
                                type="range"
                                min="5"
                                max="60"
                                value={blurIntensity}
                                style={fill(blurIntensity, 5, 60)}
                                onChange={(e) => setBlurIntensity(Number(e.target.value))}
                                className="w-full"
                                aria-label="Blur strength"
                              />
                            </div>
                          )}

                          {selectedStyle === "shorts_black" && (
                            <div className="pt-3 flex items-center justify-between">
                              <span className="label">Bar color</span>
                              <div className="flex items-center gap-1.5">
                                {["#000000", "#ffffff", "#111827", "#1e1b4b"].map((c) => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => setLetterboxColor(c)}
                                    className={`w-6 h-6 rounded-md border transition-transform hover:scale-110 ${
                                      letterboxColor === c ? "ring-2 ring-[color:var(--brand)] ring-offset-2 ring-offset-[color:var(--card)]" : "border-[color:var(--border-strong)]"
                                    }`}
                                    style={{ background: c }}
                                    aria-label={`Bar color ${c}`}
                                  />
                                ))}
                                <label className="relative w-6 h-6 rounded-md border border-[color:var(--border-strong)] overflow-hidden cursor-pointer" title="Custom color">
                                  <input
                                    type="color"
                                    value={letterboxColor}
                                    onChange={(e) => setLetterboxColor(e.target.value)}
                                    className="absolute -inset-2 w-10 h-10 cursor-pointer"
                                  />
                                </label>
                              </div>
                            </div>
                          )}

                          {isVertical && (
                            <>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="text-[13px] font-medium text-[color:var(--fg)]">&ldquo;PART n&rdquo; badge</div>
                                  <div className="text-[11px] text-[color:var(--muted)]">Label each clip at the top</div>
                                </div>
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={addPartBadge}
                                  data-on={addPartBadge}
                                  onClick={() => setAddPartBadge(!addPartBadge)}
                                  className="switch"
                                />
                              </div>

                              <div className="flex items-center justify-between">
                                <span className="label">Resolution</span>
                                <div className="segmented grid-cols-2 w-40">
                                  <div
                                    className="segmented-thumb"
                                    style={{
                                      width: "calc(50% - 4px)",
                                      transform: resolution === "720p" ? "translateX(100%)" : "translateX(0)",
                                    }}
                                  />
                                  {(["1080p", "720p"] as const).map((r) => (
                                    <button
                                      key={r}
                                      type="button"
                                      data-active={resolution === r}
                                      onClick={() => setResolution(r)}
                                      className="!py-1 !text-xs"
                                    >
                                      {r}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------------- Parts ---------------- */}
          <div className="panel">
            <div className="panel-head flex-wrap">
              <div className="flex items-center gap-3">
                <span className="step-num">4</span>
                <div>
                  <h3 className="font-display font-semibold text-[15px] text-[color:var(--fg)]">
                    Your parts <span className="text-[color:var(--muted)] font-normal">({segments.length})</span>
                  </h3>
                  <p className="text-xs text-[color:var(--muted)]">Preview, untick to skip, or save one at a time</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setAllSelected(true)} className="btn btn-ghost h-8 px-2.5 text-xs">
                  Select all
                </button>
                <button onClick={() => setAllSelected(false)} className="btn btn-ghost h-8 px-2.5 text-xs">
                  Clear
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-5">
              <div
                className={`grid gap-3 ${
                  isVertical
                    ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
                    : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                }`}
              >
                {segments.map((seg, idx) => {
                  const isActive = activeSegmentIndex === idx;
                  return (
                    <div
                      key={seg.id}
                      className={`group rounded-2xl border bg-[color:var(--card)] overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)] ${
                        isActive
                          ? "border-[color:var(--brand)] ring-2 ring-[color:var(--brand-soft)]"
                          : seg.selected
                          ? "border-[color:var(--border)]"
                          : "border-[color:var(--border)] opacity-55 hover:opacity-90"
                      }`}
                      style={{ animation: `fadeUp 0.45s var(--ease) ${Math.min(idx, 12) * 0.03}s both` }}
                    >
                      {/* Thumbnail */}
                      <div
                        className={`relative bg-[color:var(--monitor)] overflow-hidden cursor-pointer ${
                          isVertical ? "aspect-[9/16]" : "aspect-video"
                        }`}
                        onClick={() => previewSegment(idx)}
                      >
                        {seg.thumbnailUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={seg.thumbnailUrl}
                            alt={seg.title}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 animate-fade-in"
                          />
                        ) : (
                          <div className="absolute inset-0 skeleton opacity-40" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSegment(seg.id);
                          }}
                          className="absolute top-2 left-2 p-0.5"
                          aria-label={seg.selected ? `Exclude ${seg.title}` : `Include ${seg.title}`}
                        >
                          <span className="check shadow-sm" data-on={seg.selected}>
                            {seg.selected && <Check className="w-3 h-3" strokeWidth={3.5} />}
                          </span>
                        </button>

                        {seg.status === "ready" && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-white bg-emerald-500/90 px-1.5 py-0.5 rounded-md">
                            <Check className="w-3 h-3" strokeWidth={3} /> Saved
                          </span>
                        )}
                        {seg.status === "rendering" && (
                          <span className="absolute top-2 right-2 flex items-center gap-1 text-[10px] font-semibold text-white bg-black/60 backdrop-blur px-1.5 py-0.5 rounded-md">
                            <Loader2 className="w-3 h-3 animate-spin" /> Rendering
                          </span>
                        )}

                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <span className="w-11 h-11 rounded-full bg-white/20 backdrop-blur-md ring-1 ring-white/30 flex items-center justify-center">
                            {isActive && isPlaying ? (
                              <Pause className="w-4 h-4 text-white fill-white" />
                            ) : (
                              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                            )}
                          </span>
                        </div>

                        <div className="absolute bottom-2 left-2.5 right-2.5 flex items-end justify-between gap-1">
                          <span className="font-display text-[13px] font-semibold text-white drop-shadow">{seg.title}</span>
                          <span className="font-mono text-[10px] font-semibold text-white bg-black/50 backdrop-blur px-1.5 py-0.5 rounded">
                            {formatTime(seg.duration)}
                          </span>
                        </div>
                      </div>

                      {/* Meta + actions */}
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-[color:var(--muted)] truncate">
                          {formatTime(seg.startTime)} – {formatTime(seg.endTime)}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => previewSegment(idx)}
                            className="btn btn-ghost w-7 h-7 p-0 rounded-lg"
                            aria-label={`Preview ${seg.title}`}
                            title="Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={seg.status === "rendering"}
                            onClick={() => downloadSingleSegment(seg)}
                            className="btn btn-ghost w-7 h-7 p-0 rounded-lg hover:!text-[color:var(--brand)]"
                            aria-label={`Download ${seg.title}`}
                            title="Download this part"
                          >
                            {seg.status === "rendering" ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Download className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ---------------- Export bar (sticky) ---------------- */}
          <div className="sticky bottom-4 z-30">
            <div className="panel !rounded-2xl p-2.5 sm:p-3.5 pl-3.5 sm:pl-5 flex flex-row items-center justify-between gap-3 backdrop-blur-xl !bg-[color:var(--card)]/90 shadow-[var(--shadow-lg)]">
              <div className="min-w-0 flex items-center gap-3">
                <div className="hidden sm:flex w-10 h-10 rounded-xl bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] text-[color:var(--brand-fg)] items-center justify-center shrink-0">
                  {doneMessage ? <CircleCheck className="w-5 h-5 text-emerald-500" /> : <MonitorPlay className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <div className="font-display text-sm sm:text-[15px] font-semibold text-[color:var(--fg)] truncate">
                    {doneMessage ||
                      `${selectedCount} of ${segments.length} ${cutMode === "parts" ? "parts" : "clips"} · ${formatTime(perClip)} each`}
                  </div>
                  <div className="hidden sm:block text-xs text-[color:var(--muted)] truncate">
                    {STYLE_LABEL[selectedStyle]} · {voiceLabel}
                    {isVertical ? ` · ${resolution}` : " · lossless"}
                  </div>
                </div>
              </div>

              {embedParent ? (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => processAndDownloadAll("zip")}
                    disabled={isProcessing || selectedCount === 0}
                    className="btn btn-secondary h-10 sm:h-11 w-10 sm:w-11 p-0"
                    title="Download as ZIP instead"
                    aria-label="Download as ZIP instead"
                  >
                    <FolderArchive className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => processAndDownloadAll("utubeflow")}
                    disabled={isProcessing || selectedCount === 0}
                    className="btn btn-primary h-10 sm:h-11 px-4 sm:px-6 text-[13px] sm:text-sm"
                  >
                    <Send className="w-4 h-4" />
                    <span className="sm:hidden">Send ({selectedCount})</span>
                    <span className="hidden sm:inline">
                      Send {selectedCount} to UTubeFlow {embedKind === "short" ? "Shorts" : "Videos"}
                    </span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => processAndDownloadAll("zip")}
                  disabled={isProcessing || selectedCount === 0}
                  className="btn btn-primary h-10 sm:h-11 px-4 sm:px-6 text-[13px] sm:text-sm shrink-0"
                >
                  <FolderArchive className="w-4 h-4" />
                  <span className="sm:hidden">ZIP ({selectedCount})</span>
                  <span className="hidden sm:inline">Download {selectedCount} as ZIP</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Processing modal ---------------- */}
      {isProcessing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md panel !rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-in">
            <div className="flex items-center gap-4">
              <div className="relative w-14 h-14 shrink-0">
                <svg viewBox="0 0 56 56" className="w-14 h-14 -rotate-90">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border)" strokeWidth="5" />
                  <circle
                    cx="28"
                    cy="28"
                    r="24"
                    fill="none"
                    stroke="url(#pg)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 24}
                    strokeDashoffset={2 * Math.PI * 24 * (1 - overallProgress / 100)}
                    style={{ transition: "stroke-dashoffset 0.4s var(--ease)" }}
                  />
                  <defs>
                    <linearGradient id="pg" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="var(--brand)" />
                      <stop offset="100%" stopColor="var(--brand-2)" />
                    </linearGradient>
                  </defs>
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold text-[color:var(--fg)] tabular-nums">
                  {overallProgress}%
                </span>
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-semibold text-[color:var(--fg)]">Exporting your parts</h3>
                <p className="text-xs text-[color:var(--muted)] mt-0.5 line-clamp-2">{statusMessage}</p>
              </div>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex justify-between text-[11px] font-mono text-[color:var(--muted)]">
                <span>Current part</span>
                <span className="tabular-nums">{Math.round(currentProgress)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-[color:var(--card-alt)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)] progress-stripes"
                  style={{ width: `${currentProgress}%`, transition: "width 0.3s var(--ease)" }}
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-[11px] text-[color:var(--subtle)]">Keep this tab open</span>
              <button
                onClick={() => {
                  if (abortControllerRef.current) {
                    abortControllerRef.current.abort();
                    setIsProcessing(false);
                  }
                }}
                className="btn btn-secondary h-9 px-4 text-xs hover:!text-rose-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
