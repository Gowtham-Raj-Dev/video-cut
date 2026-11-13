"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import {
  ArrowLeft,
  AudioLines,
  Check,
  ChevronsLeft,
  CircleAlert,
  CircleCheck,
  CloudUpload,
  Download,
  Film,
  FlipHorizontal2,
  FlipVertical2,
  FolderArchive,
  Gauge,
  Languages,
  Link2,
  Loader2,
  Music,
  Palette,
  Pause,
  Play,
  Plus,
  Redo2,
  RefreshCw,
  RotateCcw,
  RotateCw,
  Scissors,
  Send,
  ShieldCheck,
  SkipBack,
  SkipForward,
  Smartphone,
  Trash2,
  Type,
  Undo2,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { formatBytes, formatTime, formatTimeWithMs } from "@/lib/formatters";
import {
  Aspect,
  EditState,
  Fit,
  LOOKS,
  Seg,
  TextLayer,
  TextStyle,
  cancelExport,
  defaultEdit,
  drawFrame,
  exportEdit,
  isCutOnly,
  keptDuration,
  outDuration,
  outputDims,
  releaseInput,
  sortedSegs,
  splitEqual,
  splitEvery,
  srcToOut,
  textLayout,
  textVisible,
} from "@/lib/editor";
import { ThemeToggle } from "@/components/ThemeToggle";
import { EmbedClip, UTUBEFLOW_TAB, UTUBEFLOW_URL, isAllowedParent, isEmbedRequested } from "@/lib/embed";
import { AudioTrackInfo, parseMediaMetadata } from "@/lib/audio-detector";
import { extractAudioPreview } from "@/lib/ffmpeg-processor";

/** The local multi-audio sample is too big (and not ours) to deploy — dev only. */
const SHOW_LOCAL_SAMPLE = process.env.NODE_ENV !== "production";
const LOCAL_SAMPLE = "[Toonworld4all] Jackie Chan Adventures S01E01 Remastered 720p HEVC 10bit WEB-DL Multi Audio.mkv";

type Tool = "video" | "parts" | "canvas" | "adjust" | "text" | "audio" | "speed";
type Meta = { width: number; height: number; duration: number };
type Kind = "short" | "video";
type Result = { name: string; blob: Blob; url: string; title: string; description: string; index: number; duration: number; lossless: boolean };

const TOOLS: { id: Tool; label: string; title: string; icon: typeof Film }[] = [
  { id: "video", label: "Video", title: "Your video", icon: Film },
  { id: "parts", label: "Split", title: "Split into parts", icon: Scissors },
  { id: "canvas", label: "Frame", title: "Frame & size", icon: Smartphone },
  { id: "adjust", label: "Color", title: "Looks & color", icon: Palette },
  { id: "text", label: "Text", title: "Text & labels", icon: Type },
  { id: "audio", label: "Audio", title: "Sound & music", icon: Music },
  { id: "speed", label: "Speed", title: "Speed", icon: Gauge },
];

const ASPECT_OPTIONS: { key: Aspect; label: string; hint: string; w: number; h: number }[] = [
  { key: "original", label: "Original", hint: "Keep the video's own shape", w: 26, h: 16 },
  { key: "9:16", label: "9:16", hint: "YouTube Shorts · Reels · TikTok", w: 12, h: 21 },
  { key: "1:1", label: "1:1", hint: "Square post", w: 18, h: 18 },
  { key: "4:5", label: "4:5", hint: "Instagram feed", w: 16, h: 20 },
  { key: "16:9", label: "16:9", hint: "YouTube video", w: 26, h: 15 },
];

const FIT_OPTIONS: { key: Fit; label: string; hint: string }[] = [
  { key: "blur", label: "Blur fill", hint: "Blurred backdrop" },
  { key: "color", label: "Color bars", hint: "Solid background" },
  { key: "fill", label: "Zoom & crop", hint: "Fill the frame" },
];

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const TEXT_COLORS = ["#ffffff", "#000000", "#fde047", "#f87171", "#34d399", "#60a5fa", "#f472b6"];
const BG_COLORS = ["#000000", "#ffffff", "#111827", "#1e1b4b", "#064e3b"];
const RESOLUTIONS = [
  { res: 1080, label: "1080p", hint: "Full HD" },
  { res: 720, label: "720p", hint: "Faster" },
  { res: 480, label: "480p", hint: "Fastest" },
];
const QUALITIES = [
  { crf: 20, label: "High" },
  { crf: 24, label: "Balanced" },
  { crf: 29, label: "Small file" },
];
const SHORTCUTS: [string, string][] = [
  ["Space", "Play · pause"],
  ["S", "Split at playhead"],
  ["I  /  O", "Trim start · end"],
  ["Del", "Delete part or text"],
  ["←  →", "Move 1 s (Shift 5 s)"],
  ["Ctrl + Z", "Undo"],
];
const LANG_CODE: Record<string, string> = { tamil: "TA", hindi: "HI", telugu: "TE", english: "EN", malayalam: "ML", kannada: "KN", japanese: "JA", korean: "KO" };

const uid = () => Math.random().toString(36).slice(2, 9);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const niceName = (f: File | null) =>
  (f?.name ?? "Video")
    .replace(/\.[^/.]+$/, "")
    .replace(/\[[^\]]*\]/g, "")
    .replace(/[_.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "Video";

function fill(value: number, min: number, max: number): CSSProperties {
  const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return { ["--fill" as string]: `${clamp(pct, 0, 100)}%` } as CSSProperties;
}

function Slider({ label, value, min, max, step = 1, unit = "", def, onChange }: { label: string; value: number; min: number; max: number; step?: number; unit?: string; def?: number; onChange: (v: number) => void }) {
  const changed = def !== undefined && value !== def;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="flex items-center gap-2">
          {changed && (
            <button type="button" onClick={() => onChange(def!)} className="text-[10px] font-semibold text-[color:var(--brand-fg)] hover:underline">
              Reset
            </button>
          )}
          <span className="font-mono text-xs tabular-nums text-[color:var(--fg)]">
            {Number.isInteger(step) ? value : value.toFixed(2).replace(/0$/, "")}
            {unit}
          </span>
        </span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} style={fill(value, min, max)} onChange={(e) => onChange(Number(e.target.value))} className="w-full" aria-label={label} />
    </div>
  );
}

function Group({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-display text-[13px] font-semibold text-[color:var(--fg)]">{title}</h4>
        {action}
      </div>
      {children}
    </div>
  );
}

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <div className="text-[13px] font-medium text-[color:var(--fg)]">{label}</div>
        {hint && <div className="text-[11px] text-[color:var(--muted)]">{hint}</div>}
      </div>
      <button type="button" role="switch" aria-checked={on} aria-label={label} data-on={on} onClick={() => onChange(!on)} className="switch" />
    </div>
  );
}

const inputCls = "w-full text-xs bg-[color:var(--card-alt)] border border-[color:var(--border)] rounded-lg px-2.5 py-1.5 text-[color:var(--fg)] outline-none focus:border-[color:var(--brand)] transition-colors";

/**
 * VideoCut Studio: one tool to cut a video into parts or Shorts and to edit it
 * (trim, frame, color, text, sound, speed), then export one video or every part.
 */
/** `app`: the page IS the studio (home page and inside UTubeFlow) — it opens straight into the editor, even before a video is chosen. */
export function VideoEditor({ app = false }: { app?: boolean }) {
  // Source
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [noPreview, setNoPreview] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [loadingSample, setLoadingSample] = useState("");
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [tracks, setTracks] = useState<AudioTrackInfo[]>([]);
  const [detecting, setDetecting] = useState(false);
  const [langUrl, setLangUrl] = useState("");
  const [langLoading, setLangLoading] = useState(false);
  const [frameReady, setFrameReady] = useState(false);
  const frameReadyRef = useRef(false);
  const posterDone = useRef(false);

  // Edit state + undo history
  const [edit, setEditRaw] = useState<EditState | null>(null);
  const editRef = useRef<EditState | null>(null);
  const hist = useRef<{ past: EditState[]; future: EditState[]; key: string; at: number }>({ past: [], future: [], key: "", at: 0 });
  const defaultTrack = useRef(-1);

  // UI
  const [tool, setTool] = useState<Tool>(app ? "video" : "parts");
  const [shellDrag, setShellDrag] = useState(false);
  // The studio is portalled into <body>, which only exists in the browser (not while the page is pre-rendered).
  const [mounted, setMounted] = useState(false);
  const [embedded, setEmbedded] = useState(false);
  useEffect(() => {
    setMounted(true);
    setEmbedded(isEmbedRequested());
  }, []);
  const [panelOpen, setPanelOpen] = useState(false);
  const [splitMode, setSplitMode] = useState<"equal" | "every" | "manual">("every");
  const [equalCount, setEqualCount] = useState(2);
  const [everyLen, setEveryLen] = useState(30);
  const [titlePattern, setTitlePattern] = useState("{name} - Part {n}");
  const [selSeg, setSelSeg] = useState<string | null>(null);
  const [selText, setSelText] = useState<string | null>(null);
  const selTextRef = useRef<string | null>(null);
  selTextRef.current = tool === "text" ? selText : null;
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [music, setMusic] = useState<File | null>(null);
  const [musicUrl, setMusicUrl] = useState("");

  // Export
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<"parts" | "single">("parts");
  const [res, setRes] = useState(720);
  const [crf, setCrf] = useState(24);
  const [phase, setPhase] = useState<"idle" | "working" | "done" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [partLabel, setPartLabel] = useState("");
  const [errorText, setErrorText] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [shown, setShown] = useState(0);
  const [singleTitle, setSingleTitle] = useState("");
  const [sentNote, setSentNote] = useState("");
  const [sending, setSending] = useState(false);
  const cancelled = useRef(false);

  // Inside UTubeFlow (iframe) …
  const [embedParent, setEmbedParent] = useState<string | null>(null);
  const [embedKind, setEmbedKind] = useState<Kind | null>(null);
  const embedKindRef = useRef<Kind | null>(null);
  // … or linked to a UTubeFlow tab we opened.
  const linkWin = useRef<Window | null>(null);
  const linkOrigin = useRef<string | null>(null);
  const pendingSend = useRef<{ kind: Kind; clips: EmbedClip[] } | null>(null);
  const [linkStatus, setLinkStatus] = useState<"idle" | "connecting" | "connected">("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const langRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeSet = useRef(0);
  const dragRef = useRef<null | { kind: "scrub" } | { kind: "handle"; id: string; edge: "start" | "end" } | { kind: "text"; id: string; dx: number; dy: number } | { kind: "tap" }>(null);

  // ---------- Edit state ----------

  const setEdit = useCallback((next: EditState) => {
    editRef.current = next;
    setEditRaw(next);
  }, []);

  /** Applies a change and records it for undo. Changes with the same key within 0.8 s merge into one step. */
  const change = useCallback(
    (patch: Partial<EditState> | ((e: EditState) => EditState), key = "") => {
      const prev = editRef.current;
      if (!prev) return;
      const next = typeof patch === "function" ? patch(prev) : { ...prev, ...patch };
      const h = hist.current;
      const now = Date.now();
      if (!(key && key === h.key && now - h.at < 800)) {
        h.past.push(prev);
        if (h.past.length > 100) h.past.shift();
      }
      h.future = [];
      h.key = key;
      h.at = now;
      setEdit(next);
    },
    [setEdit],
  );

  const undo = useCallback(() => {
    const h = hist.current;
    const prev = h.past.pop();
    if (!prev || !editRef.current) return;
    h.future.push(editRef.current);
    h.key = "";
    setEdit(prev);
  }, [setEdit]);

  const redo = useCallback(() => {
    const h = hist.current;
    const next = h.future.pop();
    if (!next || !editRef.current) return;
    h.past.push(editRef.current);
    h.key = "";
    setEdit(next);
  }, [setEdit]);

  const patchSeg = useCallback(
    (id: string, patch: Partial<Seg>, key = "") => {
      const e = editRef.current;
      if (!e) return;
      change({ ...e, segs: e.segs.map((s) => (s.id === id ? { ...s, ...patch } : s)) }, key);
    },
    [change],
  );

  // ---------- UTubeFlow ----------

  useEffect(() => {
    if (!isEmbedRequested()) return;
    const hello = () => {
      try {
        window.parent.postMessage({ type: "videocut:ready", view: "studio" }, "*");
      } catch {}
    };
    const onMessage = (ev: MessageEvent) => {
      if (!isAllowedParent(ev.origin) || ev.source !== window.parent) return;
      const data = ev.data as { type?: string; count?: number; kind?: string; theme?: string };
      if (data?.type === "utubeflow:init") {
        setEmbedParent(ev.origin);
        // Follow UTubeFlow's light / dark theme so the studio looks like part of it.
        if (data.theme === "dark" || data.theme === "light") document.documentElement.classList.toggle("dark", data.theme === "dark");
        const kind = data.kind === "short" || data.kind === "video" ? data.kind : null;
        setEmbedKind(kind);
        embedKindRef.current = kind;
      } else if (data?.type === "utubeflow:received") {
        setSending(false);
        setSentNote(`${data.count ?? 0} clip${data.count === 1 ? "" : "s"} added to Ready to Post`);
      }
    };
    window.addEventListener("message", onMessage);
    hello();
    const retry = setInterval(hello, 1000);
    const stop = setTimeout(() => clearInterval(retry), 6000);
    return () => {
      window.removeEventListener("message", onMessage);
      clearInterval(retry);
      clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    if (isEmbedRequested()) return;
    const onMessage = (ev: MessageEvent) => {
      if (!linkWin.current || ev.source !== linkWin.current || !isAllowedParent(ev.origin)) return;
      const data = ev.data as { type?: string; count?: number };
      if (data?.type === "utubeflow:hello") {
        linkOrigin.current = ev.origin;
        setLinkStatus("connected");
        linkWin.current.postMessage({ type: "videocut:linked" }, ev.origin);
        const p = pendingSend.current;
        if (p) {
          pendingSend.current = null;
          linkWin.current.postMessage({ type: "videocut:clips", ...p }, ev.origin);
          setSentNote("Sending to UTubeFlow…");
        }
      } else if (data?.type === "utubeflow:received") {
        setSentNote(`${data.count ?? 0} clip${data.count === 1 ? "" : "s"} added to your UTubeFlow upload list`);
      }
    };
    window.addEventListener("message", onMessage);
    const closed = window.setInterval(() => {
      if (linkWin.current?.closed) {
        linkWin.current = null;
        linkOrigin.current = null;
        setLinkStatus("idle");
      }
    }, 1500);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearInterval(closed);
    };
  }, []);

  // ---------- Loading a video ----------

  const startEdit = useCallback(
    (m: Meta) => {
      setMeta(m);
      if (editRef.current) return;
      const e = defaultEdit(m.duration);
      e.audioTrack = defaultTrack.current;
      // UTubeFlow → Shorts: start as 30-second 9:16 parts.
      if (embedKindRef.current === "short") {
        e.aspect = "9:16";
        e.segs = splitEvery(e.segs, 30);
      }
      setEdit(e);
    },
    [setEdit],
  );

  const loadFile = useCallback(
    (f: File) => {
      if (!f.type.startsWith("video/") && !/\.(mp4|webm|mov|mkv|avi|m4v)$/i.test(f.name)) {
        alert("Please choose a video file (MP4, MOV, MKV, WebM…).");
        return;
      }
      setUrl((old) => {
        if (old) URL.revokeObjectURL(old);
        return URL.createObjectURL(f);
      });
      releaseInput();
      setFile(f);
      setMeta(null);
      setNoPreview(false);
      setFrameReady(false);
      frameReadyRef.current = false;
      posterDone.current = false;
      setEditRaw(null);
      editRef.current = null;
      hist.current = { past: [], future: [], key: "", at: 0 };
      defaultTrack.current = -1;
      setThumbs([]);
      setTracks([]);
      setLangUrl("");
      setPlaying(false);
      setTime(0);
      setSelSeg(null);
      setSelText(null);
      setResults([]);
      setPhase("idle");
      setSentNote("");
      setTool("parts");
      setSingleTitle(niceName(f).slice(0, 100));

      // Audio tracks (Tamil / Hindi / Telugu…) and a fallback size + length for formats the browser can't play.
      setDetecting(true);
      parseMediaMetadata(f)
        .then((parsed) => {
          const list = parsed.tracks ?? [];
          setTracks(list);
          let pick = -1;
          if (list.length > 1) {
            const ta = list.find((t) => t.languageName.toLowerCase() === "tamil" || t.title.toLowerCase().includes("tamil"));
            pick = (ta ?? list.find((t) => t.isDefault) ?? list[0]).index;
          }
          defaultTrack.current = pick;
          if (editRef.current && pick !== -1) setEdit({ ...editRef.current, audioTrack: pick });
          if (parsed.duration > 0 && parsed.width > 0) {
            setTimeout(() => {
              if (!editRef.current && videoRef.current?.readyState === 0) {
                setNoPreview(true);
                startEdit({ width: parsed.width, height: parsed.height, duration: parsed.duration });
              }
            }, 3000);
          }
        })
        .catch(() => {})
        .finally(() => setDetecting(false));
    },
    [setEdit, startEdit],
  );

  const loadSample = async (which: "mp4" | "multi") => {
    try {
      setLoadingSample(which);
      // A 3-minute gameplay clip (Saucer Siege, games.codelove.in): long enough to try Shorts / equal parts for real.
      const path = which === "mp4" ? "/samples/saucer-siege-3min.mp4" : `/${encodeURIComponent(LOCAL_SAMPLE)}`;
      const r = await fetch(path);
      if (!r.ok) throw new Error();
      const blob = await r.blob();
      loadFile(new File([blob], which === "mp4" ? "saucer-siege-gameplay.mp4" : LOCAL_SAMPLE, { type: which === "mp4" ? "video/mp4" : "video/x-matroska" }));
    } catch {
      alert("Could not load the sample video. Please choose your own file.");
    } finally {
      setLoadingSample("");
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    // Some WebM / MKV files carry no duration in their header: seeking far past the end makes the browser work it out.
    if (!Number.isFinite(v.duration)) {
      const found = () => {
        if (!Number.isFinite(v.duration)) return;
        v.removeEventListener("durationchange", found);
        v.currentTime = 0;
        onLoadedMetadata();
      };
      v.addEventListener("durationchange", found);
      v.currentTime = 1e101;
      return;
    }
    if (v.duration <= 0) return;
    setNoPreview(false);
    startEdit({ width: v.videoWidth || 1920, height: v.videoHeight || 1080, duration: v.duration });
  };

  // Filmstrip for the timeline.
  useEffect(() => {
    if (!url || !meta || noPreview) return;
    let alive = true;
    const v = document.createElement("video");
    v.muted = true;
    v.preload = "auto";
    v.src = url;
    const count = 16;
    const c = document.createElement("canvas");
    c.height = 54;
    c.width = Math.round((54 * meta.width) / meta.height);
    const ctx = c.getContext("2d");
    const out: string[] = [];
    const grab = (i: number) => {
      if (!alive || !ctx || i >= count) return;
      v.onseeked = () => {
        if (!alive) return;
        try {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          out.push(c.toDataURL("image/jpeg", 0.6));
          setThumbs([...out]);
        } catch {}
        grab(i + 1);
      };
      v.currentTime = Math.min(meta.duration - 0.05, ((i + 0.5) / count) * meta.duration);
    };
    v.onloadeddata = () => grab(0);
    return () => {
      alive = false;
      v.removeAttribute("src");
      v.load();
    };
  }, [url, meta, noPreview]);

  useEffect(() => {
    const v = videoRef.current;
    if (!edit || !meta || noPreview || posterDone.current || !v) return;
    posterDone.current = true;
    let alive = true;
    const probe = document.createElement("canvas");
    probe.width = 32;
    probe.height = 18;
    const pctx = probe.getContext("2d", { willReadFrequently: true });
    const brightness = () => {
      if (!pctx) return 255;
      try {
        pctx.drawImage(v, 0, 0, 32, 18);
        const d = pctx.getImageData(0, 0, 32, 18).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
        return sum / (d.length / 4);
      } catch {
        return 255;
      }
    };
    const seekTo = (t: number) =>
      new Promise<void>((resolve) => {
        const done = () => {
          v.removeEventListener("seeked", done);
          resolve();
        };
        v.addEventListener("seeked", done);
        v.currentTime = t;
        setTimeout(done, 4000);
      });
    (async () => {
      if (v.readyState < 2) await new Promise((r) => v.addEventListener("loadeddata", r, { once: true }));
      if (!alive || brightness() > 14) return;
      const d = meta.duration;
      for (const t of [2, 5, 10, 20, 40, 60, d * 0.03, d * 0.06, d * 0.1].filter((x) => x < d - 0.5)) {
        if (!alive || !v.paused) return;
        await seekTo(t);
        if (brightness() > 14) {
          lastTimeSet.current = t;
          setTime(t);
          movePlayhead(t);
          draw();
          return;
        }
      }
      if (alive && v.paused) await seekTo(0);
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edit === null, meta, noPreview]);

  // Live preview in the chosen language (the browser can only play a file's first audio track).
  const audioTrack = edit?.audioTrack ?? -1;
  useEffect(() => {
    if (!file || tracks.length < 2 || audioTrack < 0) {
      setLangUrl("");
      return;
    }
    let alive = true;
    setLangLoading(true);
    extractAudioPreview(file, audioTrack, 300)
      .then((u) => alive && setLangUrl(u))
      .catch(() => alive && setLangUrl(""))
      .finally(() => alive && setLangLoading(false));
    return () => {
      alive = false;
    };
  }, [file, tracks.length, audioTrack]);

  // ---------- Preview ----------

  const partNoAt = (e: EditState, t: number) => {
    const i = sortedSegs(e.segs).findIndex((s) => t >= s.start - 0.01 && t < s.end);
    return i < 0 ? 1 : i + 1;
  };

  const draw = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    const e = editRef.current;
    if (!v || !c || !e || v.readyState < 2) return;
    const { W, H } = outputDims(e, v.videoWidth, v.videoHeight, 540);
    if (c.width !== W || c.height !== H) {
      c.width = W;
      c.height = H;
    }
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const tOut = srcToOut(e, v.currentTime);
    const n = partNoAt(e, v.currentTime);
    drawFrame(ctx, v, v.videoWidth, v.videoHeight, W, H, e, tOut, n);
    if (!frameReadyRef.current) {
      frameReadyRef.current = true;
      setFrameReady(true);
    }

    const sel = e.texts.find((t) => t.id === selTextRef.current);
    if (sel && v.paused && textVisible(sel, tOut)) {
      const L = textLayout(ctx, W, H, sel, n);
      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "#ffffff";
      ctx.strokeRect(L.left - 4, L.top - 4, L.w + 8, L.h + 8);
      ctx.lineDashOffset = 5;
      ctx.strokeStyle = "#5b5cf0";
      ctx.strokeRect(L.left - 4, L.top - 4, L.w + 8, L.h + 8);
      ctx.restore();
    }
  }, []);

  const movePlayhead = (t: number) => {
    const d = videoRef.current?.duration || meta?.duration || 0;
    if (playheadRef.current && d > 0) playheadRef.current.style.left = `${(t / d) * 100}%`;
  };

  /** Keeps the music and the chosen-language audio in step with the video. */
  const syncAux = useCallback((play: boolean) => {
    const v = videoRef.current;
    const e = editRef.current;
    if (!v || !e) return;
    const m = musicRef.current;
    if (m && m.src) {
      m.volume = clamp(e.musicVolume / 100, 0, 1);
      const tOut = srcToOut(e, v.currentTime);
      if (Number.isFinite(m.duration) && m.duration > 0) m.currentTime = tOut % m.duration;
      if (play) m.play().catch(() => {});
      else m.pause();
    }
    const l = langRef.current;
    if (l && l.src) {
      l.playbackRate = e.speed;
      l.volume = clamp(e.volume / 100, 0, 1);
      l.muted = e.muted;
      l.currentTime = v.currentTime;
      if (play) l.play().catch(() => {});
      else l.pause();
    }
  }, []);

  const stopLoop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
  };

  const pause = useCallback(() => {
    videoRef.current?.pause();
    musicRef.current?.pause();
    langRef.current?.pause();
    stopLoop();
    setPlaying(false);
    if (videoRef.current) setTime(videoRef.current.currentTime);
    draw();
  }, [draw]);

  const tick = useCallback(() => {
    const v = videoRef.current;
    const e = editRef.current;
    if (!v || !e) return;
    if (!v.paused) {
      // Skip the parts that were cut out.
      const segs = sortedSegs(e.segs);
      const t = v.currentTime;
      if (!segs.some((s) => t >= s.start - 0.03 && t < s.end)) {
        const next = segs.find((s) => s.start > t);
        if (next) {
          v.currentTime = next.start;
          syncAux(true);
        } else {
          pause();
          return;
        }
      }
    }
    draw();
    movePlayhead(v.currentTime);
    if (Math.abs(v.currentTime - lastTimeSet.current) > 0.12) {
      lastTimeSet.current = v.currentTime;
      setTime(v.currentTime);
    }
    if (v.ended) {
      pause();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [draw, pause, syncAux]);

  const play = useCallback(() => {
    const v = videoRef.current;
    const e = editRef.current;
    if (!v || !e || noPreview) return;
    const segs = sortedSegs(e.segs);
    if (!segs.some((s) => v.currentTime >= s.start && v.currentTime < s.end - 0.05)) {
      v.currentTime = (segs.find((s) => s.start > v.currentTime) ?? segs[0]).start;
    }
    v.playbackRate = e.speed;
    v.muted = e.muted || e.volume === 0 || !!langRef.current?.src;
    v.volume = clamp(e.volume / 100, 0, 1);
    v.play()
      .then(() => {
        setPlaying(true);
        syncAux(true);
        stopLoop();
        rafRef.current = requestAnimationFrame(tick);
      })
      .catch(() => {});
  }, [syncAux, tick, noPreview]);

  const togglePlay = useCallback(() => (videoRef.current?.paused ? play() : pause()), [play, pause]);

  const seek = useCallback(
    (t: number) => {
      const v = videoRef.current;
      const d = v && Number.isFinite(v.duration) ? v.duration : meta?.duration ?? 0;
      const to = clamp(t, 0, Math.max(0, d - 0.01));
      if (v && !noPreview) v.currentTime = to;
      lastTimeSet.current = to;
      setTime(to);
      movePlayhead(to);
      if (v) syncAux(!v.paused);
    },
    [syncAux, meta, noPreview],
  );

  // Re-apply playback settings and redraw whenever the edit changes.
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !edit) return;
    v.playbackRate = edit.speed;
    v.muted = edit.muted || edit.volume === 0 || !!langUrl;
    v.volume = clamp(edit.volume / 100, 0, 1);
    if (musicRef.current) musicRef.current.volume = clamp(edit.musicVolume / 100, 0, 1);
    if (langRef.current) {
      langRef.current.volume = clamp(edit.volume / 100, 0, 1);
      langRef.current.muted = edit.muted;
      langRef.current.playbackRate = edit.speed;
    }
    if (v.paused) draw();
  }, [edit, draw, selText, tool, langUrl]);

  useEffect(() => () => stopLoop(), []);

  useEffect(() => {
    if (!music) {
      setMusicUrl("");
      return;
    }
    const u = URL.createObjectURL(music);
    setMusicUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [music]);

  // ---------- Parts / cuts ----------

  const duration = meta?.duration ?? 0;
  const segs = edit ? sortedSegs(edit.segs) : [];
  const currentSeg = segs.find((s) => time >= s.start && time < s.end) ?? null;
  const activeSeg = segs.find((s) => s.id === selSeg) ?? currentSeg;

  const split = useCallback(() => {
    const e = editRef.current;
    if (!e) return;
    const t = videoRef.current && !noPreview ? videoRef.current.currentTime : lastTimeSet.current;
    const s = e.segs.find((x) => t > x.start + 0.1 && t < x.end - 0.1);
    if (!s) return;
    const right: Seg = { id: uid(), start: t, end: s.end };
    change({ ...e, segs: e.segs.flatMap((x) => (x.id === s.id ? [{ ...x, end: t }, right] : [x])) });
    setSelSeg(right.id);
  }, [change, noPreview]);

  const removeSeg = useCallback(
    (id: string | null) => {
      const e = editRef.current;
      if (!e || !id || e.segs.length <= 1) return;
      change({ ...e, segs: e.segs.filter((x) => x.id !== id) });
      setSelSeg(null);
    },
    [change],
  );

  const setEdge = useCallback(
    (edge: "start" | "end") => {
      const e = editRef.current;
      if (!e) return;
      const t = videoRef.current && !noPreview ? videoRef.current.currentTime : lastTimeSet.current;
      const sorted = sortedSegs(e.segs);
      const s = sorted.find((x) => x.id === selSeg) ?? sorted.find((x) => t >= x.start && t <= x.end);
      if (!s) return;
      if (edge === "start" && t < s.end - 0.2) change({ ...e, segs: e.segs.map((x) => (x.id === s.id ? { ...x, start: t } : x)) });
      if (edge === "end" && t > s.start + 0.2) change({ ...e, segs: e.segs.map((x) => (x.id === s.id ? { ...x, end: t } : x)) });
    },
    [change, selSeg, noPreview],
  );

  const joinAll = () => {
    const e = editRef.current;
    if (!e || !meta) return;
    const s = sortedSegs(e.segs);
    change({ ...e, segs: [{ id: uid(), start: s[0]?.start ?? 0, end: s[s.length - 1]?.end ?? meta.duration }] });
    setSelSeg(null);
  };

  const restoreAll = () => {
    if (!editRef.current || !meta) return;
    change({ ...editRef.current, segs: [{ id: uid(), start: 0, end: meta.duration }] });
    setSelSeg(null);
  };

  const applyEqual = (n: number, key = "") => {
    setEqualCount(n);
    const e = editRef.current;
    if (e) change({ ...e, segs: splitEqual(e.segs, n) }, key);
    setSelSeg(null);
  };

  const applyEvery = (len: number, key = "") => {
    setEveryLen(len);
    const e = editRef.current;
    if (e) change({ ...e, segs: splitEvery(e.segs, len) }, key);
    setSelSeg(null);
  };

  const setAllOff = (off: boolean) => {
    const e = editRef.current;
    if (e) change({ ...e, segs: e.segs.map((s) => ({ ...s, off })) });
  };

  const applyTitles = () => {
    const e = editRef.current;
    if (!e) return;
    const order = sortedSegs(e.segs).map((s) => s.id);
    const name = niceName(file);
    change({ ...e, segs: e.segs.map((s) => ({ ...s, title: titlePattern.replace(/\{name\}/gi, name).replace(/\{n\}/gi, String(order.indexOf(s.id) + 1)).slice(0, 100) })) });
  };

  const playPart = (s: Seg) => {
    setSelSeg(s.id);
    seek(s.start);
    if (videoRef.current?.paused) play();
  };

  // ---------- Timeline pointer ----------

  const timeFromPointer = (clientX: number) => {
    const el = timelineRef.current;
    if (!el || !duration) return 0;
    const r = el.getBoundingClientRect();
    return clamp((clientX - r.left) / r.width, 0, 1) * duration;
  };

  const onTimelineDown = (ev: React.PointerEvent<HTMLDivElement>) => {
    const handle = (ev.target as HTMLElement).closest<HTMLElement>("[data-handle]");
    (ev.currentTarget as HTMLElement).setPointerCapture?.(ev.pointerId);
    if (handle) {
      dragRef.current = { kind: "handle", id: handle.dataset.seg!, edge: handle.dataset.handle as "start" | "end" };
      return;
    }
    dragRef.current = { kind: "scrub" };
    const t = timeFromPointer(ev.clientX);
    setSelSeg(segs.find((s) => t >= s.start && t < s.end)?.id ?? null);
    seek(t);
  };

  const onTimelineMove = (ev: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    const e = editRef.current;
    if (!d || !e) return;
    const t = timeFromPointer(ev.clientX);
    if (d.kind === "scrub") seek(t);
    else if (d.kind === "handle") {
      const sorted = sortedSegs(e.segs);
      const i = sorted.findIndex((s) => s.id === d.id);
      if (i < 0) return;
      const s = sorted[i];
      const lo = d.edge === "start" ? (sorted[i - 1]?.end ?? 0) : s.start + 0.2;
      const hi = d.edge === "start" ? s.end - 0.2 : (sorted[i + 1]?.start ?? duration);
      const val = clamp(t, lo, hi);
      change({ ...e, segs: e.segs.map((x) => (x.id === s.id ? { ...x, [d.edge]: val } : x)) }, `trim-${s.id}-${d.edge}`);
      seek(d.edge === "end" ? Math.max(s.start, val - 0.03) : val);
    }
  };

  // ---------- Canvas pointer (drag text / tap to play) ----------

  const canvasPoint = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * c.width, y: ((ev.clientY - r.top) / r.height) * c.height };
  };

  const onCanvasDown = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current;
    const e = editRef.current;
    const v = videoRef.current;
    if (!c || !e || !v) return;
    const ctx = c.getContext("2d")!;
    const p = canvasPoint(ev);
    const tOut = srcToOut(e, v.currentTime);
    const n = partNoAt(e, v.currentTime);
    const hit = [...e.texts].reverse().find((t) => {
      if (!textVisible(t, tOut)) return false;
      const L = textLayout(ctx, c.width, c.height, t, n);
      return p.x >= L.left - 6 && p.x <= L.left + L.w + 6 && p.y >= L.top - 6 && p.y <= L.top + L.h + 6;
    });
    c.setPointerCapture?.(ev.pointerId);
    if (hit) {
      if (!v.paused) pause();
      setTool("text");
      setPanelOpen(true);
      setSelText(hit.id);
      dragRef.current = { kind: "text", id: hit.id, dx: p.x / c.width - hit.x, dy: p.y / c.height - hit.y };
    } else dragRef.current = { kind: "tap" };
  };

  const onCanvasMove = (ev: React.PointerEvent<HTMLCanvasElement>) => {
    const d = dragRef.current;
    const c = canvasRef.current;
    const e = editRef.current;
    if (!d || d.kind !== "text" || !c || !e) return;
    const p = canvasPoint(ev);
    const x = clamp(p.x / c.width - d.dx, 0.02, 0.98);
    const y = clamp(p.y / c.height - d.dy, 0.02, 0.98);
    change({ ...e, texts: e.texts.map((t) => (t.id === d.id ? { ...t, x, y } : t)) }, `move-${d.id}`);
  };

  const onCanvasUp = () => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d?.kind === "tap") togglePlay();
  };

  // ---------- Text layers ----------

  const addText = (preset?: Partial<TextLayer>) => {
    const e = editRef.current;
    if (!e) return;
    const t: TextLayer = { id: uid(), text: "Your text", x: 0.5, y: e.texts.length % 2 ? 0.82 : 0.12, size: 6, color: "#ffffff", style: "box", bold: true, from: null, to: null, ...preset };
    change({ ...e, texts: [...e.texts, t] });
    setSelText(t.id);
  };

  const patchText = (id: string, patch: Partial<TextLayer>, key = "") => {
    const e = editRef.current;
    if (!e) return;
    change({ ...e, texts: e.texts.map((t) => (t.id === id ? { ...t, ...patch } : t)) }, key);
  };

  const removeText = useCallback(
    (id: string) => {
      const e = editRef.current;
      if (!e) return;
      change({ ...e, texts: e.texts.filter((t) => t.id !== id) });
      setSelText(null);
    },
    [change],
  );

  // ---------- Keyboard ----------

  useEffect(() => {
    if (!file) return;
    const onKey = (ev: KeyboardEvent) => {
      const el = ev.target as HTMLElement;
      if (el.closest("input, textarea, select, [contenteditable]") || exportOpen) return;
      const v = videoRef.current;
      const mod = ev.ctrlKey || ev.metaKey;
      const k = ev.key.toLowerCase();
      if (mod && k === "z") {
        ev.preventDefault();
        if (ev.shiftKey) redo();
        else undo();
      } else if (mod && k === "y") {
        ev.preventDefault();
        redo();
      } else if (mod) return;
      else if (k === " ") {
        ev.preventDefault();
        togglePlay();
      } else if (k === "s") split();
      else if (k === "i") setEdge("start");
      else if (k === "o") setEdge("end");
      else if (k === "delete" || k === "backspace") {
        if (selTextRef.current) removeText(selTextRef.current);
        else removeSeg(selSeg);
      } else if (k === "arrowleft" || k === "arrowright") {
        ev.preventDefault();
        const step = ev.shiftKey ? 5 : ev.altKey ? 1 / 30 : 1;
        seek((v?.currentTime ?? lastTimeSet.current) + (k === "arrowleft" ? -step : step));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [file, exportOpen, undo, redo, togglePlay, split, setEdge, removeSeg, removeText, seek, selSeg]);

  // The studio is a full-screen app: the page behind it must not scroll.
  useEffect(() => {
    if (!file && !app) return;
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, [file, app]);

  // ---------- Derived ----------

  const total = edit ? outDuration(edit) : 0;
  const tOut = edit ? srcToOut(edit, time) : 0;
  const selectedText = edit?.texts.find((t) => t.id === selText) ?? null;
  const dims = edit && meta ? outputDims(edit, meta.width, meta.height, res) : null;
  const vertical = !!dims && dims.H > dims.W;
  const removed = edit && meta ? meta.duration - keptDuration(edit.segs) : 0;
  const canUndo = hist.current.past.length > 0;
  const canRedo = hist.current.future.length > 0;
  const fillMode = !!edit && (edit.aspect === "original" || edit.fit === "fill");
  const multi = segs.length > 1;
  const onSegs = segs.filter((s) => !s.off);
  const exportSegs = onSegs.length ? onSegs : segs;
  const onCount = exportSegs.length;
  const mode = multi ? exportMode : "single";
  const partCutOnly = !!edit && isCutOnly({ ...edit, segs: segs.slice(0, 1) }, !!music);
  const instant = mode === "parts" ? partCutOnly : exportSegs.length === 1 && partCutOnly;
  const longest = segs.reduce((m, s) => Math.max(m, s.end - s.start), 0) / (edit?.speed ?? 1);
  const toolInfo = TOOLS.find((t) => t.id === tool)!;
  const activeTrack = tracks.find((t) => t.index === audioTrack);
  const sendKind: Kind = embedKind ?? (vertical ? "short" : "video");
  const baseName = (file?.name ?? "video").replace(/\.[^/.]+$/, "").replace(/[^\w-]+/g, "_").replace(/_+/g, "_").slice(0, 60);

  const openTool = (t: Tool) => {
    setTool(t);
    setPanelOpen(true);
  };

  // ---------- Export ----------

  const runExport = async () => {
    if (!file || !edit || !meta) return;
    pause();
    cancelled.current = false;
    setPhase("working");
    setProgress(0);
    setStatusText("Starting…");
    setErrorText("");
    setSentNote("");
    results.forEach((r) => URL.revokeObjectURL(r.url));
    setResults([]);
    setShown(0);

    const all = sortedSegs(edit.segs);
    const list = exportSegs;
    const name = niceName(file);
    const out: Result[] = [];
    try {
      if (mode === "parts") {
        for (let i = 0; i < list.length; i++) {
          if (cancelled.current) return;
          const s = list[i];
          const no = all.findIndex((x) => x.id === s.id) + 1;
          setPartLabel(`Part ${no} · ${i + 1} of ${list.length}`);
          const r = await exportEdit({
            file,
            edit: { ...edit, segs: [s] },
            width: meta.width,
            height: meta.height,
            res,
            crf,
            music,
            partNo: no,
            strict: false,
            onProgress: (p) => setProgress(Math.round(((i + p / 100) / list.length) * 100)),
            onStatus: setStatusText,
          });
          if (cancelled.current) return;
          out.push({
            name: `${baseName}_Part_${String(no).padStart(2, "0")}.mp4`,
            blob: r.blob,
            url: URL.createObjectURL(r.blob),
            title: (s.title?.trim() || `${name} - Part ${no}`).slice(0, 100),
            description: s.description ?? "",
            index: no,
            duration: (s.end - s.start) / edit.speed,
            lossless: r.lossless,
          });
          setResults([...out]);
        }
      } else {
        setPartLabel("");
        const r = await exportEdit({ file, edit: { ...edit, segs: list }, width: meta.width, height: meta.height, res, crf, music, strict: true, onProgress: setProgress, onStatus: setStatusText });
        if (cancelled.current) return;
        out.push({
          name: `${baseName}_edited.mp4`,
          blob: r.blob,
          url: URL.createObjectURL(r.blob),
          title: singleTitle.trim().slice(0, 100) || name,
          description: "",
          index: 1,
          duration: keptDuration(list) / edit.speed,
          lossless: r.lossless,
        });
        setResults(out);
      }
      setPhase("done");
    } catch (err) {
      if (cancelled.current) return;
      setErrorText((err as Error)?.message || "Export failed.");
      setPhase("error");
    }
  };

  const stopExport = () => {
    cancelled.current = true;
    cancelExport();
    setPhase(results.length ? "done" : "idle");
  };

  const downloadZip = async () => {
    const zip = new JSZip();
    for (const r of results) zip.file(r.name, r.blob);
    zip.file("clips_info.txt", results.map((r) => `${r.name}\nTitle: ${r.title}\nLength: ${formatTime(r.duration)}\nDescription: ${r.description || "-"}`).join(`\n${"-".repeat(40)}\n`));
    saveAs(await zip.generateAsync({ type: "blob" }), `${baseName}_parts.zip`);
  };

  const sendToUtubeflow = () => {
    if (!results.length) return;
    const clips: EmbedClip[] = results.map((r) => ({
      name: r.name,
      type: "video/mp4",
      blob: r.blob,
      title: results.length === 1 && mode === "single" ? singleTitle.trim().slice(0, 100) || r.title : r.title,
      description: r.description,
      index: r.index,
      duration: r.duration,
    }));
    if (embedParent) {
      setSending(true);
      window.parent.postMessage({ type: "videocut:clips", kind: sendKind, clips }, embedParent);
      setSentNote("Adding to Ready to Post…");
      return;
    }
    if (linkWin.current && !linkWin.current.closed && linkOrigin.current) {
      linkWin.current.postMessage({ type: "videocut:clips", kind: sendKind, clips }, linkOrigin.current);
      linkWin.current.focus();
      setSentNote("Sending to UTubeFlow…");
      return;
    }
    // Open UTubeFlow in a named tab; it says hello and then receives the clips.
    const w = window.open(`${UTUBEFLOW_URL}/upload/${sendKind}?from=videocut`, UTUBEFLOW_TAB);
    if (!w) {
      alert("Your browser blocked the UTubeFlow tab. Allow pop-ups for this site and try again.");
      return;
    }
    linkWin.current = w;
    linkOrigin.current = null;
    pendingSend.current = { kind: sendKind, clips };
    setLinkStatus("connecting");
    setSentNote("Opening UTubeFlow… sign in there if it asks.");
  };

  const reset = () => {
    if (hist.current.past.length > 0 && !confirm("Close this video and start over?")) return;
    pause();
    if (url) URL.revokeObjectURL(url);
    releaseInput();
    setFile(null);
    setUrl("");
    setMeta(null);
    setEditRaw(null);
    editRef.current = null;
    setMusic(null);
    setThumbs([]);
    setTracks([]);
    setLangUrl("");
    setTool(app ? "video" : "parts");
  };

  type CheckItem = { ok: boolean; text: string; hint?: string; action?: { label: string; run: () => void } };
  const checks: CheckItem[] =
    !edit || !dims
      ? []
      : [
          multi
            ? { ok: true, text: `${segs.length} parts`, hint: `${onCount} selected for export` }
            : { ok: false, text: "One clip", hint: "Split it into parts or Shorts.", action: { label: "Split", run: () => openTool("parts") } },
          { ok: true, text: `${dims.W} × ${dims.H} frame`, hint: edit.aspect === "9:16" ? "Right for Shorts and Reels" : edit.aspect === "original" ? "Same shape as your video" : undefined },
          vertical && (multi ? longest : total) > 180
            ? { ok: false, text: `${formatTime(multi ? longest : total)} long`, hint: "Shorts must be 3 minutes or less.", action: { label: "Split", run: () => openTool("parts") } }
            : { ok: true, text: multi ? `Longest part ${formatTime(longest)}` : `${formatTime(total)} long` },
          edit.texts.some((t) => t.text.trim())
            ? { ok: true, text: `${edit.texts.length} text layer${edit.texts.length === 1 ? "" : "s"}` }
            : { ok: false, text: "No text", hint: multi ? "Add a “PART n” label." : "Add a title or caption.", action: { label: "Add", run: () => openTool("text") } },
          edit.muted && !music
            ? { ok: false, text: "No sound", hint: "The original audio is muted.", action: { label: "Audio", run: () => openTool("audio") } }
            : { ok: true, text: activeTrack ? `${activeTrack.languageName} audio` : music ? (edit.muted ? "Music only" : "Sound + music") : "Original sound" },
        ];

  const sendLabel = embedParent ? "Add to Ready to Post" : linkStatus === "connected" ? "Send to UTubeFlow" : "Open in UTubeFlow";

  return (
    <section id="studio" className="relative z-10 w-full">
      {url && (
        // Off-screen, not display:none — some browsers stop decoding frames of a hidden video, which leaves the preview black.
        <video ref={videoRef} src={url} className="fixed top-0 -left-[9999px] w-px h-px opacity-0 pointer-events-none" aria-hidden preload="auto" playsInline onLoadedMetadata={onLoadedMetadata} onLoadedData={draw} onSeeked={draw} onCanPlay={draw} />
      )}
      {musicUrl && <audio ref={musicRef} src={musicUrl} preload="auto" loop />}
      {langUrl && <audio ref={langRef} src={langUrl} preload="auto" />}

      {!file && !app ? (
        /* ---------------- Empty state (landing pages) ---------------- */
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
              if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
            }}
            onClick={() => fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
            }}
            className="dropzone group relative cursor-pointer overflow-hidden rounded-[28px] px-6 py-14 sm:px-14 sm:py-16 text-center shadow-[var(--shadow-lg)]"
          >
            <div className="dropzone-dash" />
            <input ref={fileInputRef} type="file" accept="video/*,.mp4,.webm,.mov,.mkv,.avi" aria-label="Upload video file" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            <div className="relative">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl btn-primary animate-float">
                <CloudUpload className="h-7 w-7" strokeWidth={2} />
              </div>
              <h2 className="font-display text-2xl sm:text-[28px] font-bold tracking-tight text-[color:var(--fg)]">{isDragging ? "Release to open your video" : "Drop a video to cut & edit"}</h2>
              <p className="mt-2 text-sm text-[color:var(--muted)] max-w-md mx-auto leading-relaxed">
                Split it into Shorts or equal parts, trim, resize to 9:16, add text, music and more. MP4, MOV, MKV, WebM — nothing leaves your device.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button type="button" className="btn btn-primary h-11 px-6 text-sm w-full sm:w-auto">
                  <Scissors className="w-4 h-4" />
                  Choose video file
                </button>
                <div className="flex gap-2 w-full sm:w-auto">
                  {SHOW_LOCAL_SAMPLE && (
                    <button
                      type="button"
                      disabled={!!loadingSample}
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSample("multi");
                      }}
                      className="btn btn-secondary h-11 px-4 text-[13px] flex-1 sm:flex-none"
                    >
                      {loadingSample === "multi" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4 text-[color:var(--brand)]" />}
                      Multi-audio sample
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={!!loadingSample}
                    onClick={(e) => {
                      e.stopPropagation();
                      loadSample("mp4");
                    }}
                    className="btn btn-secondary h-11 px-4 text-[13px] flex-1 sm:flex-none"
                  >
                    {loadingSample === "mp4" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4 text-[color:var(--brand)]" />}
                    Try a sample
                  </button>
                </div>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-[color:var(--muted)]">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" /> Private, in-browser
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-500" /> Lossless fast cutting
                </span>
                <span className="flex items-center gap-1.5">
                  <AudioLines className="w-4 h-4 text-[color:var(--brand)]" /> Tamil · Hindi · Telugu audio
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : !mounted ? (
        <div className="studio-boot fixed inset-0 z-[55] editor-shell" aria-hidden />
      ) : (
        /* ---------------- Studio (full screen, on <body> so nothing on the page covers it) ---------------- */
        createPortal(
          <div
            className={`editor-shell ed-theme ed-grid fixed inset-0 z-[55] ${file ? "" : "ed-empty"}`}
            onDragOver={(e) => {
              if (file || !e.dataTransfer.types.includes("Files")) return;
              e.preventDefault();
              setShellDrag(true);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) setShellDrag(false);
            }}
            onDrop={(e) => {
              if (file) return;
              e.preventDefault();
              setShellDrag(false);
              if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
            }}
          >
            <input ref={fileInputRef} type="file" accept="video/*,.mp4,.webm,.mov,.mkv,.avi" aria-label="Choose a video" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            {/* Top bar */}
            <header className="ed-top flex items-center gap-2 sm:gap-3 px-2 sm:px-4 min-w-0">
              {file && !embedded && (
                <button onClick={reset} className="ed-btn w-9 h-9 shrink-0" title="Close this video" aria-label="Close this video">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <span className="w-8 h-8 rounded-lg btn-primary flex items-center justify-center shrink-0">
                <Scissors className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-sm sm:text-[15px] font-semibold text-[color:var(--fg)] truncate max-w-[34vw] lg:max-w-[18rem] leading-tight" title={file?.name}>
                  {file ? niceName(file) : "VideoCut Studio"}
                </h2>
                <div className="hidden sm:block text-[11px] text-[color:var(--muted)] leading-tight">{file ? "VideoCut Studio" : "Cut, split & edit videos — free"}</div>
              </div>

              {file && (
              <button
                onClick={() => openTool("canvas")}
                className="hidden md:flex mx-auto items-center gap-2 h-9 px-3.5 rounded-full border border-[color:var(--border)] bg-[color:var(--card-alt)] text-xs font-medium text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:border-[color:var(--border-strong)] transition-colors"
                title="Change the frame size"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{edit?.aspect === "original" ? "Original" : edit?.aspect}</span>
                <span className="opacity-40">·</span>
                <span className="font-semibold tabular-nums text-[color:var(--brand-fg)]">{multi ? `${segs.length} parts` : formatTime(total)}</span>
              </button>
              )}

              <div className={`flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0 ${file ? "md:ml-0" : ""}`}>
                {file && (
                  <>
                <button onClick={undo} disabled={!canUndo} className="ed-btn w-9 h-9" title="Undo (Ctrl+Z)" aria-label="Undo">
                  <Undo2 className="w-4 h-4" />
                </button>
                <button onClick={redo} disabled={!canRedo} className="ed-btn w-9 h-9" title="Redo (Ctrl+Y)" aria-label="Redo">
                  <Redo2 className="w-4 h-4" />
                </button>
                  </>
                )}
                {!embedded && <ThemeToggle />}
                <span className="hidden xl:flex items-center gap-1.5 px-2 text-xs text-[color:var(--muted)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Stays on this device
                </span>
                {!file ? (
                  <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary h-9 px-4 text-[13px]">
                    <CloudUpload className="w-3.5 h-3.5" />
                    Open video
                  </button>
                ) : (
                <button
                  onClick={() => {
                    // A result from before the latest edits is stale: start from the settings again.
                    if (phase !== "working") setPhase("idle");
                    setExportMode(multi ? "parts" : "single");
                    setExportOpen(true);
                  }}
                  disabled={!edit}
                  className="btn btn-primary h-9 px-4 text-[13px]"
                >
                  {embedParent ? <Send className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  Export{multi ? ` ${onCount}` : ""}
                </button>
                )}
              </div>
            </header>

            {/* Tool rail */}
            <nav className="ed-rail" role="tablist" aria-label="Tools">
              {TOOLS.map(({ id, label, icon: Icon }) => {
                const active = tool === id && panelOpen;
                return (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={active}
                    data-active={active}
                    disabled={!file && id !== "video"}
                    onClick={() => {
                      setPanelOpen(tool === id ? !panelOpen : true);
                      setTool(id);
                    }}
                    className="ed-tool"
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                );
              })}
            </nav>

            {/* Tool panel */}
            <aside className={`ed-panel ed-card ${panelOpen ? "" : "ed-panel-closed"}`}>
              <div className="flex items-center justify-between pl-4 pr-2 h-12 shrink-0 border-b border-[color:var(--border)]">
                <h3 className="font-display text-sm font-semibold text-[color:var(--fg)]">{toolInfo.title}</h3>
                <button onClick={() => setPanelOpen(false)} className="btn btn-ghost w-8 h-8 p-0 hidden lg:inline-flex" title="Hide panel" aria-label="Hide panel">
                  <ChevronsLeft className="w-4 h-4" />
                </button>
              </div>
              {!file && (
                <div className="p-4 space-y-5 overflow-y-auto flex-1 min-h-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-2xl border-[1.5px] border-dashed border-[color:var(--brand-line)] bg-[color:var(--brand-soft)] px-4 py-7 text-center transition-colors hover:bg-[color:var(--card-alt)]"
                  >
                    <span className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full btn-primary">
                      <CloudUpload className="h-5 w-5" />
                    </span>
                    <span className="block font-display text-[15px] font-semibold text-[color:var(--fg)]">Open a video</span>
                    <span className="mt-1 block text-xs text-[color:var(--muted)] leading-relaxed">Choose a file or drag it anywhere on this screen. MP4, MOV, MKV, WebM.</span>
                  </button>
                  <div className="flex items-start gap-2 text-[11px] text-[color:var(--muted)] leading-relaxed">
                    <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-500" />
                    Stays on this device at full quality. Nothing is uploaded to us.
                  </div>
                  <Group title="What you can do">
                    <ul className="space-y-2.5">
                      {(
                        [
                          [Scissors, "Split into Shorts or equal parts"],
                          [Smartphone, "Resize to 9:16, 1:1, 4:5 or 16:9"],
                          [Type, "Add text and “PART 1” labels"],
                          [Languages, "Keep Tamil, Hindi or Telugu audio"],
                          [Music, "Add music, fades and speed"],
                          [FolderArchive, "Export every part as a ZIP"],
                        ] as const
                      ).map(([Icon, t]) => (
                        <li key={t} className="flex items-center gap-2.5 text-xs text-[color:var(--fg)]">
                          <span className="w-7 h-7 rounded-lg bg-[color:var(--card-alt)] border border-[color:var(--border)] flex items-center justify-center shrink-0">
                            <Icon className="w-3.5 h-3.5 text-[color:var(--brand)]" />
                          </span>
                          {t}
                        </li>
                      ))}
                    </ul>
                  </Group>
                </div>
              )}
              {file && edit && (
                <div className="p-4 space-y-6 overflow-y-auto flex-1 min-h-0">
                  {tool === "video" && (
                    <>
                      <div className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--card-alt)] p-3.5 space-y-3">
                        <div className="flex items-start gap-3">
                          <span className="w-10 h-10 rounded-xl bg-[color:var(--brand-soft)] text-[color:var(--brand-fg)] flex items-center justify-center shrink-0">
                            <Film className="w-5 h-5" />
                          </span>
                          <div className="min-w-0">
                            <div className="text-[13px] font-semibold text-[color:var(--fg)] break-all leading-snug">{file?.name}</div>
                            <div className="mt-1.5 flex flex-wrap gap-1.5">
                              <span className="chip">{formatTime(meta?.duration ?? 0)}</span>
                              <span className="chip">{formatBytes(file?.size ?? 0)}</span>
                              {meta && <span className="chip font-mono">{`${meta.width}×${meta.height}`}</span>}
                            </div>
                          </div>
                        </div>
                        <input ref={replaceInputRef} type="file" accept="video/*,.mp4,.webm,.mov,.mkv,.avi" aria-label="Replace video" className="hidden" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
                        <button type="button" onClick={() => replaceInputRef.current?.click()} className="btn btn-secondary h-9 w-full text-[13px]">
                          <RefreshCw className="w-3.5 h-3.5" />
                          Replace video
                        </button>
                      </div>
                      {noPreview && (
                        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-[color:var(--fg)] leading-relaxed">
                          <CircleAlert className="w-4 h-4 mt-px shrink-0 text-amber-600" />
                          <span>Your browser can&apos;t show this video format, so there is no preview. Cutting into parts and exporting still work.</span>
                        </div>
                      )}

                      <Group title="Audio language">
                        {detecting ? (
                          <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-[color:var(--brand)]" /> Scanning audio tracks…
                          </div>
                        ) : tracks.length > 1 ? (
                          <div className="space-y-1.5">
                            {tracks.map((t) => {
                              const on = audioTrack === t.index;
                              return (
                                <button key={t.index} type="button" data-active={on} onClick={() => change({ audioTrack: t.index })} className="option w-full p-2.5 flex items-center gap-3" title={t.title || t.displayLabel}>
                                  <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 font-display text-xs font-bold ${on ? "btn-primary" : "bg-[color:var(--card-alt)] border border-[color:var(--border)] text-[color:var(--muted)]"}`}>
                                    {LANG_CODE[t.languageName.toLowerCase()] ?? (t.languageName.slice(0, 2).toUpperCase() || "??")}
                                  </span>
                                  <span className="min-w-0 flex-1 text-left">
                                    <span className="block text-[13px] font-semibold text-[color:var(--fg)] truncate">{t.languageName}</span>
                                    <span className="block text-[11px] text-[color:var(--muted)] truncate">{t.title || `Track ${t.index + 1} · ${t.codec.toUpperCase()}`}</span>
                                  </span>
                                  {on && <CircleCheck className="w-4 h-4 text-[color:var(--brand)] shrink-0" />}
                                </button>
                              );
                            })}
                            <button type="button" data-active={audioTrack === -1} onClick={() => change({ audioTrack: -1 })} className="option w-full p-2.5 text-left">
                              <span className="block text-[13px] font-semibold text-[color:var(--fg)]">Keep every track</span>
                              <span className="block text-[11px] text-[color:var(--muted)]">Only for lossless parts; edited clips use track 1</span>
                            </button>
                            {langLoading && (
                              <p className="flex items-center gap-1.5 text-[11px] text-[color:var(--muted)]">
                                <Loader2 className="w-3 h-3 animate-spin" /> Preparing the preview sound…
                              </p>
                            )}
                            <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">The preview plays the first few minutes in this language; the export uses the full track.</p>
                          </div>
                        ) : (
                          <p className="text-xs text-[color:var(--muted)] leading-relaxed p-3 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)]">
                            {tracks.length === 1 ? "This video has one audio track — it is kept as it is." : "No extra language tracks found. The original sound is used."}
                          </p>
                        )}
                      </Group>
                    </>
                  )}

                  {tool === "parts" && (
                    <>
                      <Group title="How to split">
                        <div className="segmented grid-cols-3">
                          <div className="segmented-thumb" style={{ width: "calc(33.333% - 2.7px)", transform: `translateX(${["every", "equal", "manual"].indexOf(splitMode) * 100}%)` }} />
                          {(
                            [
                              ["every", "Shorts"],
                              ["equal", "Equal"],
                              ["manual", "Manual"],
                            ] as const
                          ).map(([k, l]) => (
                            <button key={k} type="button" data-active={splitMode === k} onClick={() => setSplitMode(k)} className="!py-1.5 !text-xs">
                              {l}
                            </button>
                          ))}
                        </div>

                        {splitMode === "every" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {[15, 30, 45, 60].map((l) => (
                                <button key={l} type="button" data-active={multi && everyLen === l} onClick={() => applyEvery(l)} className="option py-2 text-center">
                                  <span className="block font-display text-sm font-bold text-[color:var(--fg)]">{l}s</span>
                                  <span className="block text-[10px] text-[color:var(--muted)]">{((n) => `${n} part${n === 1 ? "" : "s"}`)(Math.max(1, Math.ceil((keptDuration(segs) - 1.5) / l)))}</span>
                                </button>
                              ))}
                            </div>
                            <Slider label="Seconds per part" value={everyLen} min={5} max={180} unit="s" onChange={(v) => applyEvery(v, "every")} />
                          </div>
                        )}
                        {splitMode === "equal" && (
                          <div className="space-y-3">
                            <div className="grid grid-cols-4 gap-1.5">
                              {[2, 3, 4, 5].map((n) => (
                                <button key={n} type="button" data-active={segs.length === n} onClick={() => applyEqual(n)} className="option py-2 text-center">
                                  <span className="block font-display text-sm font-bold text-[color:var(--fg)]">{n}</span>
                                  <span className="block text-[10px] text-[color:var(--muted)] font-mono">{formatTime(keptDuration(segs) / n)}</span>
                                </button>
                              ))}
                            </div>
                            <Slider label="Number of parts" value={equalCount} min={2} max={20} onChange={(v) => applyEqual(v, "equal")} />
                          </div>
                        )}
                        {splitMode === "manual" && (
                          <div className="space-y-2.5">
                            <p className="text-xs text-[color:var(--muted)] leading-relaxed">Play or scrub to a moment and split there. Drag a part&apos;s edges on the timeline to fine-tune it.</p>
                            <div className="grid grid-cols-2 gap-2">
                              <button type="button" onClick={split} disabled={!currentSeg} className="btn btn-primary h-9 text-xs">
                                <Scissors className="w-3.5 h-3.5" /> Split at {formatTime(time)}
                              </button>
                              <button type="button" onClick={() => removeSeg(activeSeg?.id ?? null)} disabled={!activeSeg || !multi} className="btn btn-secondary h-9 text-xs">
                                <Trash2 className="w-3.5 h-3.5" /> Delete part
                              </button>
                            </div>
                          </div>
                        )}
                        {(multi || removed > 0.05) && (
                          <div className="flex flex-wrap gap-1">
                            {multi && (
                              <button type="button" onClick={joinAll} className="btn btn-ghost h-8 px-2.5 text-xs">
                                Join into one clip
                              </button>
                            )}
                            {removed > 0.05 && (
                              <button type="button" onClick={restoreAll} className="btn btn-ghost h-8 px-2.5 text-xs">
                                <RotateCcw className="w-3.5 h-3.5" /> Restore full video
                              </button>
                            )}
                          </div>
                        )}
                      </Group>

                      <Group
                        title={`Parts (${segs.length})`}
                        action={
                          multi ? (
                            <span className="flex gap-1">
                              <button type="button" onClick={() => setAllOff(false)} className="btn btn-ghost h-7 px-2 text-[11px]">
                                All
                              </button>
                              <button type="button" onClick={() => setAllOff(true)} className="btn btn-ghost h-7 px-2 text-[11px]">
                                None
                              </button>
                            </span>
                          ) : undefined
                        }
                      >
                        <div className="space-y-2">
                          {segs.map((s, i) => {
                            const sel = s.id === activeSeg?.id;
                            return (
                              <div key={s.id} className={`rounded-xl border p-2.5 space-y-2 transition-colors ${sel ? "border-[color:var(--brand)] bg-[color:var(--brand-soft)]" : "border-[color:var(--border)]"} ${s.off ? "opacity-55" : ""}`}>
                                <div className="flex items-center gap-2">
                                  {multi && (
                                    <button type="button" onClick={() => patchSeg(s.id, { off: !s.off })} className="p-0.5" aria-label={s.off ? "Include this part" : "Leave this part out"} title={s.off ? "Include in export" : "Leave out of export"}>
                                      <span className="check" data-on={!s.off}>
                                        {!s.off && <Check className="w-3 h-3" strokeWidth={3.5} />}
                                      </span>
                                    </button>
                                  )}
                                  <button type="button" onClick={() => playPart(s)} className="flex-1 min-w-0 flex items-center gap-2 text-left">
                                    <span className="font-display text-xs font-bold text-[color:var(--fg)] shrink-0">{multi ? `Part ${i + 1}` : "Whole clip"}</span>
                                    <span className="font-mono text-[10px] text-[color:var(--muted)] truncate">
                                      {formatTime(s.start)}–{formatTime(s.end)} · {formatTime((s.end - s.start) / edit.speed)}
                                    </span>
                                  </button>
                                  <button type="button" onClick={() => playPart(s)} className="btn btn-ghost w-7 h-7 p-0" aria-label={`Play part ${i + 1}`}>
                                    <Play className="w-3.5 h-3.5" />
                                  </button>
                                  {multi && (
                                    <button type="button" onClick={() => removeSeg(s.id)} className="btn btn-ghost w-7 h-7 p-0 hover:!text-rose-500" aria-label={`Delete part ${i + 1}`}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                {multi && (
                                  <>
                                    <input value={s.title ?? ""} maxLength={100} onChange={(e) => patchSeg(s.id, { title: e.target.value }, `title-${s.id}`)} placeholder={`${niceName(file)} - Part ${i + 1}`} aria-label={`Title of part ${i + 1}`} className={inputCls} />
                                    {sel && <textarea value={s.description ?? ""} rows={2} onChange={(e) => patchSeg(s.id, { description: e.target.value }, `desc-${s.id}`)} placeholder="Description (optional)" aria-label={`Description of part ${i + 1}`} className={`${inputCls} resize-none`} />}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </Group>

                      {multi && (
                        <Group title="Title every part">
                          <div className="flex gap-2">
                            <input value={titlePattern} onChange={(e) => setTitlePattern(e.target.value)} aria-label="Title pattern" className={inputCls} />
                            <button type="button" onClick={applyTitles} className="btn btn-secondary h-8 px-3 text-xs shrink-0">
                              Apply
                            </button>
                          </div>
                          <p className="text-[11px] text-[color:var(--muted)]">
                            {"{name}"} = video name, {"{n}"} = part number.
                          </p>
                        </Group>
                      )}
                    </>
                  )}

                  {tool === "canvas" && (
                    <>
                      <Group title="Frame size">
                        <div className="grid grid-cols-5 gap-1.5">
                          {ASPECT_OPTIONS.map((a) => (
                            <button key={a.key} type="button" data-active={edit.aspect === a.key} onClick={() => change({ aspect: a.key, zoom: 1, panX: 0, panY: 0 })} className="option px-1 py-2.5 flex flex-col items-center gap-1.5" title={a.hint}>
                              <span className="h-[22px] flex items-center">
                                <span className={`block rounded-[3px] border ${edit.aspect === a.key ? "bg-gradient-to-br from-[var(--brand)] to-[var(--brand-2)] border-transparent" : "bg-[color:var(--card-alt)] border-[color:var(--border-strong)]"}`} style={{ width: a.w, height: a.h }} />
                              </span>
                              <span className="text-[11px] font-semibold text-[color:var(--fg)]">{a.label}</span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[11px] text-[color:var(--muted)]">{ASPECT_OPTIONS.find((a) => a.key === edit.aspect)?.hint}</p>
                      </Group>

                      {edit.aspect !== "original" && (
                        <Group title="Fit the video">
                          <div className="grid grid-cols-3 gap-1.5">
                            {FIT_OPTIONS.map((f) => (
                              <button key={f.key} type="button" data-active={edit.fit === f.key} onClick={() => change({ fit: f.key, zoom: 1, panX: 0, panY: 0 })} className="option px-2 py-2.5 text-center">
                                <span className="block text-xs font-semibold text-[color:var(--fg)]">{f.label}</span>
                                <span className="block text-[10px] text-[color:var(--muted)] mt-0.5">{f.hint}</span>
                              </button>
                            ))}
                          </div>
                          {edit.fit === "blur" && <Slider label="Blur strength" value={edit.blur} min={5} max={60} def={25} unit="px" onChange={(v) => change({ blur: v }, "blur")} />}
                          {edit.fit === "color" && (
                            <div className="space-y-2">
                              <span className="label">Background</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {BG_COLORS.map((c) => (
                                  <button key={c} type="button" onClick={() => change({ bgColor: c })} className={`w-6 h-6 rounded-md border ${edit.bgColor === c ? "ring-2 ring-[color:var(--brand)] ring-offset-2 ring-offset-[color:var(--card)]" : "border-[color:var(--border-strong)]"}`} style={{ background: c }} aria-label={`Background ${c}`} />
                                ))}
                                <label className="relative w-6 h-6 rounded-md border border-[color:var(--border-strong)] overflow-hidden" title="Custom color">
                                  <input type="color" value={edit.bgColor} onChange={(e) => change({ bgColor: e.target.value }, "bg")} className="absolute -inset-2 w-10 h-10" />
                                </label>
                              </div>
                            </div>
                          )}
                        </Group>
                      )}

                      {fillMode && (
                        <Group title="Zoom & position">
                          <Slider label="Zoom" value={edit.zoom} min={1} max={3} step={0.05} def={1} unit="×" onChange={(v) => change({ zoom: v }, "zoom")} />
                          <Slider label="Move left / right" value={Math.round(edit.panX * 100)} min={-100} max={100} def={0} onChange={(v) => change({ panX: v / 100 }, "panx")} />
                          <Slider label="Move up / down" value={Math.round(edit.panY * 100)} min={-100} max={100} def={0} onChange={(v) => change({ panY: v / 100 }, "pany")} />
                        </Group>
                      )}

                      <Group title="Rotate & flip">
                        <div className="grid grid-cols-4 gap-1.5">
                          {(
                            [
                              ["Left", RotateCcw, () => change({ rotate: ((edit.rotate + 270) % 360) as EditState["rotate"] }), false],
                              ["Right", RotateCw, () => change({ rotate: ((edit.rotate + 90) % 360) as EditState["rotate"] }), false],
                              ["Mirror", FlipHorizontal2, () => change({ flipH: !edit.flipH }), edit.flipH],
                              ["Flip", FlipVertical2, () => change({ flipV: !edit.flipV }), edit.flipV],
                            ] as const
                          ).map(([l, Icon, run, on]) => (
                            <button key={l} type="button" data-active={on} onClick={run} className="option py-2.5 flex flex-col items-center gap-1 text-[10px] font-semibold text-[color:var(--muted)]">
                              <Icon className="w-4 h-4 text-[color:var(--fg)]" />
                              {l}
                            </button>
                          ))}
                        </div>
                      </Group>
                    </>
                  )}

                  {tool === "adjust" && (
                    <>
                      <Group title="Looks">
                        <div className="grid grid-cols-4 gap-1.5">
                          {LOOKS.map((l) => {
                            const active = edit.brightness === l.set.brightness && edit.contrast === l.set.contrast && edit.saturation === l.set.saturation && edit.look === l.set.look;
                            return (
                              <button key={l.key} type="button" data-active={active} onClick={() => change(l.set)} className="option px-1 py-2.5 text-[11px] font-semibold text-[color:var(--fg)] text-center">
                                {l.label}
                              </button>
                            );
                          })}
                        </div>
                      </Group>
                      <Group title="Fine-tune">
                        <Slider label="Brightness" value={edit.brightness} min={50} max={150} def={100} unit="%" onChange={(v) => change({ brightness: v }, "bri")} />
                        <Slider label="Contrast" value={edit.contrast} min={50} max={150} def={100} unit="%" onChange={(v) => change({ contrast: v }, "con")} />
                        <Slider label="Saturation" value={edit.saturation} min={0} max={200} def={100} unit="%" onChange={(v) => change({ saturation: v }, "sat")} />
                      </Group>
                    </>
                  )}

                  {tool === "text" && (
                    <>
                      <Group title="Add">
                        <div className="grid grid-cols-2 gap-2">
                          <button type="button" onClick={() => addText()} className="btn btn-primary h-9 text-xs">
                            <Plus className="w-3.5 h-3.5" /> Text
                          </button>
                          <button type="button" onClick={() => addText({ text: "PART {n}", y: 0.1, size: 4.5 })} className="btn btn-secondary h-9 text-xs" title="Shows PART 1, PART 2… on each part">
                            <Plus className="w-3.5 h-3.5" /> “PART n” label
                          </button>
                        </div>
                        <p className="text-[11px] text-[color:var(--muted)]">Write {"{n}"} in a text to show the part number. Drag a text on the preview to move it.</p>
                      </Group>

                      {edit.texts.length > 0 && (
                        <Group title="Layers">
                          <div className="space-y-1.5">
                            {edit.texts.map((t) => (
                              <div key={t.id} data-active={t.id === selText} className="option flex items-center gap-2 pl-3 pr-1.5 py-1.5">
                                <button type="button" onClick={() => setSelText(t.id)} className="flex-1 min-w-0 text-left text-xs font-semibold text-[color:var(--fg)] truncate py-1">
                                  {t.text.split("\n")[0] || "(empty)"}
                                </button>
                                <button type="button" onClick={() => removeText(t.id)} className="btn btn-ghost w-7 h-7 p-0 hover:!text-rose-500" aria-label="Delete text">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </Group>
                      )}

                      {selectedText && (
                        <Group title="Edit text">
                          <textarea value={selectedText.text} onChange={(e) => patchText(selectedText.id, { text: e.target.value }, `txt-${selectedText.id}`)} rows={2} placeholder="Type here…" className={`${inputCls} !text-sm !py-2 resize-none`} />
                          <Slider label="Size" value={selectedText.size} min={2} max={20} step={0.5} onChange={(v) => patchText(selectedText.id, { size: v }, `size-${selectedText.id}`)} />
                          <div className="space-y-2">
                            <span className="label">Color</span>
                            <div className="flex flex-wrap items-center gap-2">
                              {TEXT_COLORS.map((c) => (
                                <button key={c} type="button" onClick={() => patchText(selectedText.id, { color: c })} className={`w-6 h-6 rounded-full border ${selectedText.color === c ? "ring-2 ring-[color:var(--brand)] ring-offset-2 ring-offset-[color:var(--card)]" : "border-[color:var(--border-strong)]"}`} style={{ background: c }} aria-label={`Text color ${c}`} />
                              ))}
                              <label className="relative w-6 h-6 rounded-full border border-[color:var(--border-strong)] overflow-hidden" title="Custom color">
                                <input type="color" value={selectedText.color} onChange={(e) => patchText(selectedText.id, { color: e.target.value }, "tcol")} className="absolute -inset-2 w-10 h-10" />
                              </label>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(["box", "outline", "plain"] as TextStyle[]).map((st) => (
                              <button key={st} type="button" data-active={selectedText.style === st} onClick={() => patchText(selectedText.id, { style: st })} className="option py-2 !text-center text-xs font-semibold text-[color:var(--fg)]">
                                {st === "box" ? "Label" : st === "outline" ? "Outline" : "Shadow"}
                              </button>
                            ))}
                          </div>
                          <div className="grid grid-cols-3 gap-1.5">
                            {(
                              [
                                ["Top", 0.1],
                                ["Middle", 0.5],
                                ["Bottom", 0.86],
                              ] as const
                            ).map(([l, y]) => (
                              <button key={l} type="button" onClick={() => patchText(selectedText.id, { x: 0.5, y })} className="option py-2 !text-center text-xs font-semibold text-[color:var(--fg)]">
                                {l}
                              </button>
                            ))}
                          </div>
                          <Switch on={selectedText.bold} onChange={(v) => patchText(selectedText.id, { bold: v })} label="Bold" />
                          <Switch
                            on={selectedText.from === null && selectedText.to === null}
                            onChange={(whole) => patchText(selectedText.id, whole ? { from: null, to: null } : { from: Math.max(0, Math.round(tOut * 10) / 10), to: Math.min(total, Math.round((tOut + 3) * 10) / 10) })}
                            label="Show the whole time"
                            hint="Turn off to show it only for a few seconds"
                          />
                          {(selectedText.from !== null || selectedText.to !== null) && (
                            <div className="grid grid-cols-2 gap-2">
                              {(["from", "to"] as const).map((k) => (
                                <label key={k} className="block">
                                  <span className="label">{k === "from" ? "Appears at" : "Disappears at"}</span>
                                  <span className="mt-1 flex items-center gap-1.5">
                                    <input
                                      type="number"
                                      min={0}
                                      max={Math.ceil(total)}
                                      step={0.1}
                                      value={selectedText[k] ?? (k === "from" ? 0 : Math.round(total * 10) / 10)}
                                      onChange={(e) => patchText(selectedText.id, { [k]: clamp(Number(e.target.value) || 0, 0, total) }, `t-${k}`)}
                                      className={`${inputCls} font-mono`}
                                    />
                                    <button type="button" onClick={() => patchText(selectedText.id, { [k]: Math.round(tOut * 10) / 10 })} className="btn btn-secondary h-8 px-2 text-[10px]" title="Use the playhead time">
                                      Now
                                    </button>
                                  </span>
                                </label>
                              ))}
                            </div>
                          )}
                        </Group>
                      )}
                    </>
                  )}

                  {tool === "audio" && (
                    <>
                      <Group title="Original sound">
                        {tracks.length > 1 && (
                          <button type="button" onClick={() => openTool("video")} className="option w-full p-2.5 flex items-center gap-2.5 text-left">
                            <Languages className="w-4 h-4 text-[color:var(--brand)] shrink-0" />
                            <span className="flex-1 text-xs font-semibold text-[color:var(--fg)]">{activeTrack ? `${activeTrack.languageName} audio` : "Every track"}</span>
                            <span className="text-[11px] font-semibold text-[color:var(--brand-fg)]">Change</span>
                          </button>
                        )}
                        <Slider label="Volume" value={edit.volume} min={0} max={200} step={5} def={100} unit="%" onChange={(v) => change({ volume: v }, "vol")} />
                        <Switch on={edit.muted} onChange={(v) => change({ muted: v })} label="Mute original audio" hint="Use only the music below, or no sound" />
                      </Group>
                      <Group title="Fade">
                        <Slider label="Fade in" value={edit.fadeIn} min={0} max={5} step={0.5} def={0} unit="s" onChange={(v) => change({ fadeIn: v }, "fin")} />
                        <Slider label="Fade out" value={edit.fadeOut} min={0} max={5} step={0.5} def={0} unit="s" onChange={(v) => change({ fadeOut: v }, "fout")} />
                        <p className="text-[11px] text-[color:var(--muted)]">Picture and sound fade together from / to black{multi ? ", on every part" : ""}.</p>
                      </Group>
                      <Group title="Background music">
                        <input ref={musicInputRef} type="file" accept="audio/*,.mp3,.m4a,.wav,.ogg,.aac" className="hidden" aria-label="Choose music file" onChange={(e) => e.target.files?.[0] && setMusic(e.target.files[0])} />
                        {music ? (
                          <>
                            <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)]">
                              <span className="w-9 h-9 rounded-lg btn-primary flex items-center justify-center shrink-0">
                                <AudioLines className="w-4 h-4" />
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-semibold text-[color:var(--fg)] truncate">{music.name}</span>
                                <span className="block text-[11px] text-[color:var(--muted)]">{formatBytes(music.size)} · loops to fit</span>
                              </span>
                              <button type="button" onClick={() => setMusic(null)} className="btn btn-ghost w-8 h-8 p-0 hover:!text-rose-500" aria-label="Remove music">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            <Slider label="Music volume" value={edit.musicVolume} min={0} max={100} step={5} unit="%" onChange={(v) => change({ musicVolume: v }, "mvol")} />
                          </>
                        ) : (
                          <button type="button" onClick={() => musicInputRef.current?.click()} className="btn btn-secondary h-10 w-full text-[13px]">
                            <Music className="w-4 h-4 text-[color:var(--brand)]" />
                            Add music (MP3, M4A, WAV)
                          </button>
                        )}
                      </Group>
                    </>
                  )}

                  {tool === "speed" && (
                    <Group title="Playback speed">
                      <div className="grid grid-cols-3 gap-1.5">
                        {SPEEDS.map((sp) => (
                          <button key={sp} type="button" data-active={edit.speed === sp} onClick={() => change({ speed: sp })} className="option py-2.5 text-center">
                            <span className="block font-display text-sm font-bold text-[color:var(--fg)]">{sp}×</span>
                            <span className="block text-[10px] text-[color:var(--muted)] mt-0.5">{sp < 1 ? "Slow motion" : sp === 1 ? "Normal" : "Fast"}</span>
                          </button>
                        ))}
                      </div>
                      <Slider label="Custom" value={edit.speed} min={0.25} max={4} step={0.05} def={1} unit="×" onChange={(v) => change({ speed: v }, "speed")} />
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[color:var(--card-alt)] border border-[color:var(--border)] text-xs">
                        <span className="text-[color:var(--muted)]">New length</span>
                        <span className="font-mono font-semibold text-[color:var(--fg)]">{formatTime(total)}</span>
                      </div>
                      <p className="text-[11px] text-[color:var(--muted)]">The sound keeps its pitch while it speeds up or slows down.</p>
                    </Group>
                  )}
                </div>
              )}
            </aside>

            {/* Stage */}
            <div className="ed-stage relative flex items-center justify-center p-3 sm:p-6 min-h-0 min-w-0">
              {!file && (
                <div className={`w-full max-w-lg rounded-2xl sm:rounded-3xl border bg-[color:var(--card)] p-6 sm:p-10 text-center shadow-[var(--shadow-lg)] transition-colors ${shellDrag ? "border-[color:var(--brand)] ring-4 ring-[color:var(--brand-soft)]" : "border-[color:var(--border)]"}`}>
                  <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl btn-primary">
                    <CloudUpload className="h-6 w-6" />
                  </div>
                  <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-[color:var(--fg)]">{shellDrag ? "Drop it to start" : "Open a video to cut & edit"}</h1>
                  <p className="mt-2 text-sm text-[color:var(--muted)] leading-relaxed">Split into Shorts or parts, trim, resize, add text and music — free, no watermark, in your browser.</p>
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-2.5">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="btn btn-primary h-11 px-6 text-sm w-full sm:w-auto">
                      <Film className="w-4 h-4" /> Choose video
                    </button>
                    <button type="button" disabled={!!loadingSample} onClick={() => loadSample("mp4")} className="btn btn-secondary h-11 px-4 text-[13px] w-full sm:w-auto">
                      {loadingSample === "mp4" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-[color:var(--brand)]" />}
                      Try a sample
                    </button>
                    {SHOW_LOCAL_SAMPLE && (
                      <button type="button" disabled={!!loadingSample} onClick={() => loadSample("multi")} className="btn btn-ghost h-11 px-3 text-[13px] w-full sm:w-auto">
                        {loadingSample === "multi" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Languages className="w-4 h-4" />}
                        Multi-audio
                      </button>
                    )}
                  </div>
                  <p className="mt-5 text-[11px] text-[color:var(--subtle)]">or drag a file anywhere on this screen</p>
                </div>
              )}
              {file && !noPreview && (!edit || !frameReady) && (
                <div className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-3 text-xs text-[color:var(--muted)]">
                  <Loader2 className="w-7 h-7 animate-spin text-[color:var(--brand)]" />
                  <span>Loading your video{file.size > 500 * 1024 * 1024 ? ` (${formatBytes(file.size)}) — big files take a few seconds` : "…"}</span>
                </div>
              )}
              {noPreview && edit && (
                <div className="max-w-xs text-center text-xs text-[color:var(--muted)] leading-relaxed">
                  <Film className="w-8 h-8 mx-auto mb-2 text-[color:var(--subtle)]" />
                  No preview for this format in your browser. You can still split it and export the parts.
                </div>
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={onCanvasDown}
                onPointerMove={onCanvasMove}
                onPointerUp={onCanvasUp}
                onPointerCancel={() => (dragRef.current = null)}
                className={`block max-w-full max-h-full w-auto h-auto rounded-md shadow-[0_18px_50px_-18px_rgba(15,23,42,0.45)] ring-1 ring-black/5 touch-none select-none ${edit && !noPreview ? "" : "hidden"} ${frameReady ? "" : "opacity-0"}`}
                style={{ cursor: selectedText && tool === "text" ? "move" : "pointer" }}
              />
              {edit && !noPreview && frameReady && !playing && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="w-14 h-14 rounded-full bg-black/45 backdrop-blur-md ring-1 ring-white/40 text-white flex items-center justify-center">
                    <Play className="w-5 h-5 fill-white ml-0.5" />
                  </span>
                </div>
              )}
              {multi && currentSeg && (
                <span className="absolute left-4 top-3 hidden lg:inline-flex items-center gap-1.5 rounded-full bg-[color:var(--card)] border border-[color:var(--border)] px-2.5 py-1 text-[11px] font-semibold text-[color:var(--fg)] shadow-sm">
                  Part {segs.indexOf(currentSeg) + 1} of {segs.length}
                </span>
              )}
            </div>

            {/* Inspector */}
            <aside className={`ed-info ed-card ${file ? "" : "ed-info-empty"}`}>
              {edit && (
                <div className="overflow-y-auto min-h-0">
                  <div className="p-4 space-y-3 border-b border-[color:var(--border)]">
                    <div>
                      <div className="label">{activeSeg && multi ? `Part ${segs.indexOf(activeSeg) + 1}` : "Clip"}</div>
                      <div className="mt-1 font-display text-[17px] font-semibold text-[color:var(--fg)] leading-tight truncate">
                        {activeSeg && multi ? activeSeg.title?.trim() || `${niceName(file)} - Part ${segs.indexOf(activeSeg) + 1}` : edit.aspect === "original" ? "Original frame" : `${edit.aspect} · ${FIT_OPTIONS.find((f) => f.key === edit.fit)?.label}`}
                      </div>
                      {activeSeg && multi && (
                        <div className="mt-1 font-mono text-[11px] text-[color:var(--muted)]">
                          {formatTime(activeSeg.start)} – {formatTime(activeSeg.end)} · {formatTime((activeSeg.end - activeSeg.start) / edit.speed)}
                        </div>
                      )}
                    </div>
                    <button onClick={() => openTool(multi ? "parts" : "canvas")} className="btn btn-secondary h-9 w-full text-[13px]">
                      {multi ? <Scissors className="w-3.5 h-3.5" /> : <Smartphone className="w-3.5 h-3.5" />}
                      {multi ? "Edit parts" : "Change frame"}
                    </button>
                  </div>

                  <div className="p-4 space-y-2.5 border-b border-[color:var(--border)]">
                    <div className="flex items-center justify-between">
                      <span className="label">Export check</span>
                      {instant && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600">
                          <Zap className="w-3 h-3" /> Lossless
                        </span>
                      )}
                    </div>
                    {checks.map((c) => (
                      <div key={c.text} className="flex items-start gap-2.5 p-2.5 rounded-xl border border-[color:var(--border)]">
                        {c.ok ? <CircleCheck className="w-4 h-4 mt-px shrink-0 text-emerald-500" /> : <CircleAlert className="w-4 h-4 mt-px shrink-0 text-amber-500" />}
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-[color:var(--fg)]">{c.text}</span>
                          {c.hint && <span className="block text-[11px] text-[color:var(--muted)] leading-snug">{c.hint}</span>}
                        </span>
                        {c.action && (
                          <button onClick={c.action.run} className="text-[11px] font-semibold text-[color:var(--brand-fg)] hover:underline shrink-0">
                            {c.action.label}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="p-4 space-y-2">
                    <span className="label">Shortcuts</span>
                    {SHORTCUTS.map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-3 text-[11px]">
                        <kbd className="font-semibold text-[color:var(--fg)]">{k}</kbd>
                        <span className="text-[color:var(--muted)]">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* Timeline */}
            <div className="ed-time px-2 sm:px-4 pt-2.5 pb-3 space-y-2.5 min-w-0">
              {!file ? (
                <div className="h-14 rounded-xl border border-dashed border-[color:var(--border-strong)] bg-[color:var(--card-alt)] flex items-center justify-center gap-2 text-xs text-[color:var(--muted)]">
                  <Scissors className="w-4 h-4" /> Your timeline and parts show up here
                </div>
              ) : (
              <>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <button onClick={() => seek(segs[0]?.start ?? 0)} className="ed-btn w-8 h-8 hidden sm:inline-flex" aria-label="Go to start" title="Go to start">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button onClick={togglePlay} disabled={noPreview} className="btn btn-primary w-9 h-9 rounded-full p-0 shrink-0" aria-label={playing ? "Pause" : "Play"} title="Play / pause (Space)">
                  {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>
                <button onClick={() => seek((segs[segs.length - 1]?.end ?? duration) - 0.05)} className="ed-btn w-8 h-8 hidden sm:inline-flex" aria-label="Go to end" title="Go to end">
                  <SkipForward className="w-4 h-4" />
                </button>
                <div className="font-mono text-xs tabular-nums text-[color:var(--muted)] mr-1 sm:mr-3">
                  <span className="text-[color:var(--fg)] font-semibold">{formatTimeWithMs(tOut)}</span>
                  <span className="mx-1 opacity-50">/</span>
                  {formatTime(total)}
                </div>

                <button onClick={split} disabled={!currentSeg} className="ed-btn-line h-8 px-3 text-xs" title="Split at the playhead (S)">
                  <Scissors className="w-3.5 h-3.5" />
                  Split
                </button>
                <button onClick={() => setEdge("start")} className="ed-btn-line h-8 px-2.5 text-xs hidden sm:inline-flex" title="Trim: start this part at the playhead (I)">
                  Start here
                </button>
                <button onClick={() => setEdge("end")} className="ed-btn-line h-8 px-2.5 text-xs hidden sm:inline-flex" title="Trim: end this part at the playhead (O)">
                  End here
                </button>
                <button
                  onClick={() => removeSeg(activeSeg?.id ?? null)}
                  disabled={!activeSeg || !multi}
                  className="ed-btn-line h-8 px-2.5 text-xs hover:!text-rose-500"
                  title={!multi ? "Split the video first, then delete a part" : "Delete the selected part (Del)"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Delete part</span>
                </button>

                <div className="flex-1" />
                {edit && edit.speed !== 1 && <span className="font-mono text-[11px] font-semibold text-[color:var(--brand-fg)]">{edit.speed}×</span>}
                <span className="hidden md:inline-flex h-7 items-center rounded-full bg-[color:var(--card-alt)] px-2.5 text-[11px] font-semibold text-[color:var(--muted)] tabular-nums">
                  {segs.length} part{segs.length === 1 ? "" : "s"}
                </span>
                <button onClick={() => edit && change({ muted: !edit.muted })} className="ed-btn w-8 h-8" aria-label={edit?.muted ? "Unmute" : "Mute"} title="Mute original audio">
                  {edit?.muted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
              </div>

              {/* Time ruler: same width as the strip below, so ticks line up with the frames */}
              {duration > 0 && (
                <div className="relative h-4 select-none pointer-events-none" aria-hidden="true">
                  {(() => {
                    // A "nice" step (0.5 s … 10 min) giving at most ~10 ticks, so labels never repeat.
                    const step = [0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300, 600].find((s) => duration / s <= 10) ?? Math.ceil(duration / 10);
                    const ticks: number[] = [];
                    for (let t = 0; t <= duration + 1e-6; t += step) ticks.push(t);
                    return ticks.map((t, i) => {
                      const pct = (t / duration) * 100;
                      const edge = pct < 4 ? "start" : pct > 96 ? "end" : "mid";
                      return (
                        <span
                          key={i}
                          className={`absolute bottom-0 flex flex-col ${edge === "start" ? "items-start" : edge === "end" ? "items-end" : "items-center"}`}
                          style={edge === "end" ? { right: 0 } : { left: `${pct}%`, transform: edge === "mid" ? "translateX(-50%)" : undefined }}
                        >
                          <span className={`font-mono text-[9px] leading-none text-[color:var(--subtle)] tabular-nums ${i % 2 ? "hidden sm:block" : ""}`}>
                            {step < 1 ? `${t.toFixed(1)}s` : formatTime(t)}
                          </span>
                          <span className="mt-0.5 h-1 w-px bg-[color:var(--border-strong)]" />
                        </span>
                      );
                    });
                  })()}
                </div>
              )}
              <div
                ref={timelineRef}
                className="relative !mt-1 h-[60px] sm:h-[72px] rounded-xl overflow-hidden bg-[color:var(--card-alt)] border border-[color:var(--border)] cursor-pointer select-none touch-none"
                onPointerDown={onTimelineDown}
                onPointerMove={onTimelineMove}
                onPointerUp={() => (dragRef.current = null)}
                onPointerCancel={() => (dragRef.current = null)}
              >
                {/* The whole video, faded; kept parts are drawn bright on top */}
                <div className="absolute inset-0 flex pointer-events-none opacity-30 grayscale">
                  {Array.from({ length: 16 }, (_, i) =>
                    thumbs[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={i} src={thumbs[i]} alt="" draggable={false} className="h-full flex-1 min-w-0 object-cover" />
                    ) : (
                      <div key={i} className="h-full flex-1" />
                    ),
                  )}
                </div>
                {duration > 0 &&
                  segs.map((s, i) => {
                    const sel = s.id === activeSeg?.id;
                    const w = s.end - s.start;
                    const pct = (w / duration) * 100;
                    return (
                      <div
                        key={s.id}
                        className={`absolute top-0 bottom-0 rounded-md overflow-hidden ${sel ? "ring-2 ring-inset ring-[color:var(--brand)] z-[2]" : "ring-1 ring-inset ring-white z-[1]"} ${s.off ? "opacity-35" : ""}`}
                        style={{ left: `${(s.start / duration) * 100}%`, width: `${pct}%` }}
                      >
                        <div className="absolute inset-y-0 flex pointer-events-none" style={{ left: `${(-s.start / w) * 100}%`, width: `${(duration / w) * 100}%` }}>
                          {Array.from({ length: 16 }, (_, k) =>
                            thumbs[k] ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img key={k} src={thumbs[k]} alt="" draggable={false} className="h-full flex-1 min-w-0 object-cover" />
                            ) : (
                              <div key={k} className="h-full flex-1 bg-[color:var(--brand-soft)]" />
                            ),
                          )}
                        </div>
                        {pct > 3.5 && (
                          <span className={`absolute ${sel ? "left-5" : "left-2"} bottom-1.5 z-[1] text-[10px] font-mono font-semibold leading-4 text-white bg-black/65 rounded-md px-1.5 pointer-events-none whitespace-nowrap`}>
                            {String(i + 1).padStart(2, "0")}
                            {pct > 9 ? ` · ${formatTime(w / (edit?.speed ?? 1))}` : ""}
                          </span>
                        )}
                        {sel && (
                          <>
                            <div data-handle="start" data-seg={s.id} className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize bg-[color:var(--brand)] flex items-center justify-center" title="Drag to trim the start">
                              <span className="w-0.5 h-5 rounded bg-white/90" />
                            </div>
                            <div data-handle="end" data-seg={s.id} className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize bg-[color:var(--brand)] flex items-center justify-center" title="Drag to trim the end">
                              <span className="w-0.5 h-5 rounded bg-white/90" />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                {/* Playhead */}
                <div ref={playheadRef} className="absolute top-0 bottom-0 w-0.5 -translate-x-1/2 bg-[color:var(--fg)] pointer-events-none z-[3] shadow-[0_0_0_1px_rgba(255,255,255,0.7)]" style={{ left: duration ? `${(time / duration) * 100}%` : 0 }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-2 rounded-b-sm bg-[color:var(--fg)]" />
                </div>
              </div>
              </>
              )}
            </div>
          </div>,
          document.body,
        )
      )}

      {/* ---------------- Export dialog (on <body>, above the studio) ---------------- */}
      {exportOpen &&
        edit &&
        dims &&
        createPortal(
          <div className="ed-theme fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in" role="dialog" aria-modal="true" aria-label="Export">
            <div className="w-full max-w-lg panel !rounded-3xl p-6 sm:p-7 shadow-2xl animate-scale-in max-h-[92vh] overflow-y-auto">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[color:var(--fg)]">{phase === "done" ? (results.length > 1 ? `${results.length} clips ready` : "Your video is ready") : phase === "working" ? "Exporting…" : "Export"}</h3>
                  <p className="text-xs text-[color:var(--muted)] mt-0.5 font-mono">
                    {dims.W}×{dims.H} · MP4 · {mode === "parts" ? `${onCount} part${onCount === 1 ? "" : "s"}` : formatTime(keptDuration(exportSegs) / edit.speed)}
                  </p>
                </div>
                {phase !== "working" && (
                  <button onClick={() => setExportOpen(false)} className="btn btn-ghost w-8 h-8 p-0" aria-label="Close">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {(phase === "idle" || phase === "error") && (
                <div className="mt-5 space-y-5">
                  {multi && (
                    <div className="space-y-2">
                      <span className="label">What to export</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button type="button" data-active={exportMode === "parts"} onClick={() => setExportMode("parts")} className="option p-3 text-left">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--fg)]">
                            <FolderArchive className="w-4 h-4 text-[color:var(--brand)]" /> Separate clips
                          </span>
                          <span className="block text-[11px] text-[color:var(--muted)] mt-0.5">{onCount} files — one per part</span>
                        </button>
                        <button type="button" data-active={exportMode === "single"} onClick={() => setExportMode("single")} className="option p-3 text-left">
                          <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[color:var(--fg)]">
                            <Film className="w-4 h-4 text-[color:var(--brand)]" /> One video
                          </span>
                          <span className="block text-[11px] text-[color:var(--muted)] mt-0.5">The parts joined together</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {mode === "single" && (
                    <label className="block">
                      <span className="label">Title</span>
                      <input value={singleTitle} maxLength={100} onChange={(e) => setSingleTitle(e.target.value)} className={`${inputCls} mt-1 !text-sm !py-2`} />
                    </label>
                  )}

                  {instant ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] text-xs text-[color:var(--fg)] leading-relaxed">
                      <Zap className="w-4 h-4 mt-px shrink-0 text-amber-500" />
                      <span>
                        <b>Lossless & fast.</b> Nothing but cuts, so {mode === "parts" ? "every part is" : "the video is"} saved in its original quality without re-rendering.
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <span className="label">Resolution</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {RESOLUTIONS.map((r) => (
                            <button key={r.res} type="button" data-active={res === r.res} onClick={() => setRes(r.res)} className="option py-2.5 text-center">
                              <span className="block font-display text-sm font-bold text-[color:var(--fg)]">{r.label}</span>
                              <span className="block text-[10px] text-[color:var(--muted)] mt-0.5">{r.hint}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="label">Quality</span>
                        <div className="grid grid-cols-3 gap-1.5">
                          {QUALITIES.map((q) => (
                            <button key={q.crf} type="button" data-active={crf === q.crf} onClick={() => setCrf(q.crf)} className="option py-2.5 !text-center text-xs font-semibold text-[color:var(--fg)]">
                              {q.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-[color:var(--muted)] leading-relaxed">Rendering happens on your device. Many parts or 1080p take longer — 720p is a good balance for Shorts.</p>
                    </>
                  )}

                  {phase === "error" && <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-700 leading-relaxed">{errorText}</div>}

                  <button onClick={runExport} className="btn btn-primary h-11 w-full text-sm">
                    <Download className="w-4 h-4" />
                    {phase === "error" ? "Try again" : mode === "parts" ? `Export ${onCount} clip${onCount === 1 ? "" : "s"}` : "Export video"}
                  </button>
                </div>
              )}

              {phase === "working" && (
                <div className="mt-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[color:var(--brand-soft)]">
                      <Loader2 className="h-6 w-6 animate-spin text-[color:var(--brand)]" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--fg)]">{partLabel || "Rendering your video"}</div>
                      <div className="text-xs text-[color:var(--muted)] truncate">{statusText}</div>
                    </div>
                    <span className="ml-auto font-display text-2xl font-bold tabular-nums text-[color:var(--fg)]">{progress}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-[color:var(--card-alt)] border border-[color:var(--border)] overflow-hidden">
                    <div className="h-full rounded-full progress-stripes" style={{ width: `${Math.max(3, progress)}%`, backgroundColor: "var(--brand)", transition: "width 0.3s var(--ease)" }} />
                  </div>
                  {results.length > 0 && <p className="text-[11px] text-[color:var(--muted)]">{results.length} done — they stay if you cancel.</p>}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-[color:var(--subtle)]">Keep this tab open</span>
                    <button onClick={stopExport} className="btn btn-secondary h-9 px-4 text-xs hover:!text-rose-500">
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {phase === "done" && results.length > 0 && (
                <div className="mt-5 space-y-4">
                  <video key={results[shown]?.url} src={results[shown]?.url} controls playsInline className="w-full max-h-[36vh] rounded-xl bg-black" />
                  {results.length > 1 ? (
                    <div className="max-h-44 overflow-y-auto rounded-xl border border-[color:var(--border)] divide-y divide-[color:var(--border)]">
                      {results.map((r, i) => (
                        <div key={r.name} className={`flex items-center gap-2.5 px-3 py-2 ${i === shown ? "bg-[color:var(--brand-soft)]" : ""}`}>
                          <button type="button" onClick={() => setShown(i)} className="flex-1 min-w-0 text-left">
                            <span className="block text-xs font-semibold text-[color:var(--fg)] truncate">{r.title}</span>
                            <span className="block text-[10px] font-mono text-[color:var(--muted)]">
                              {formatTime(r.duration)} · {formatBytes(r.blob.size)}
                              {r.lossless ? " · original quality" : ""}
                            </span>
                          </button>
                          <button type="button" onClick={() => saveAs(r.blob, r.name)} className="btn btn-ghost w-8 h-8 p-0" aria-label={`Download ${r.name}`}>
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-[color:var(--muted)]">
                      <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span>
                        {formatBytes(results[0].blob.size)}
                        {results[0].lossless ? " · original quality" : ""}
                      </span>
                    </div>
                  )}

                  {sentNote && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-medium text-emerald-700">
                      <CircleCheck className="w-4 h-4 shrink-0" />
                      {sentNote}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => (results.length > 1 ? downloadZip() : saveAs(results[0].blob, results[0].name))}
                      className={`btn ${embedParent ? "btn-secondary w-11 p-0 shrink-0" : "btn-primary flex-1"} h-11 text-sm`}
                      title={results.length > 1 ? "Download ZIP" : "Download MP4"}
                      aria-label={results.length > 1 ? "Download ZIP" : "Download MP4"}
                    >
                      {results.length > 1 ? <FolderArchive className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                      {!embedParent && (results.length > 1 ? "Download ZIP" : "Download MP4")}
                    </button>
                    <button onClick={sendToUtubeflow} disabled={sending} className={`btn ${embedParent ? "btn-primary" : "btn-secondary"} h-11 flex-1 text-sm`} title={embedParent ? undefined : "Opens UTubeFlow and adds the clips to its upload list"}>
                      {sending || (linkStatus === "connecting" && !embedParent) ? <Loader2 className="w-4 h-4 animate-spin" /> : embedParent || linkStatus === "connected" ? <Send className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                      {sending ? "Adding…" : sendLabel}
                    </button>
                  </div>
                  <button onClick={() => setPhase("idle")} className="btn btn-ghost h-9 w-full text-xs">
                    Change settings and export again
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
