/**
 * Video Editor engine: the edit state, the live canvas preview and the FFmpeg export.
 * The preview (drawFrame) and the export (buildGraph) read the same EditState and the same
 * framing maths, so what is on screen is what gets rendered.
 */
import { getFFmpegInstance, sliceVideoLossless, terminateFFmpeg } from "@/lib/ffmpeg-processor";

export type Aspect = "original" | "9:16" | "1:1" | "4:5" | "16:9";
export type Fit = "blur" | "color" | "fill";
export type Look = "none" | "mono" | "sepia";
export type TextStyle = "plain" | "box" | "outline";

/** A kept range of the source video, in source seconds. Each one is also a "part" when exporting separate clips. */
export interface Seg {
  id: string;
  start: number;
  end: number;
  /** Title / description used when the part is exported as its own clip (e.g. sent to UTubeFlow). */
  title?: string;
  description?: string;
  /** Left out of the export. */
  off?: boolean;
}

export interface TextLayer {
  id: string;
  text: string;
  /** Centre of the text, 0..1 of the frame. */
  x: number;
  y: number;
  /** Font size as % of the frame height. */
  size: number;
  color: string;
  style: TextStyle;
  bold: boolean;
  /** Visible range in output seconds; null = from the start / until the end. */
  from: number | null;
  to: number | null;
}

export interface EditState {
  segs: Seg[];
  aspect: Aspect;
  fit: Fit;
  bgColor: string;
  blur: number;
  zoom: number;
  panX: number;
  panY: number;
  rotate: 0 | 90 | 180 | 270;
  flipH: boolean;
  flipV: boolean;
  /** Percent, 100 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  look: Look;
  texts: TextLayer[];
  /** Percent, 100 = unchanged. */
  volume: number;
  muted: boolean;
  fadeIn: number;
  fadeOut: number;
  speed: number;
  /** Percent. The music file itself lives outside the state (a File cannot go in history). */
  musicVolume: number;
  /** Audio stream to keep (0, 1, 2…) for multi-language files; -1 = the file's own default / all tracks. */
  audioTrack: number;
}

export const defaultEdit = (duration: number): EditState => ({
  segs: [{ id: "s0", start: 0, end: duration }],
  aspect: "original",
  fit: "blur",
  bgColor: "#000000",
  blur: 25,
  zoom: 1,
  panX: 0,
  panY: 0,
  rotate: 0,
  flipH: false,
  flipV: false,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  look: "none",
  texts: [],
  volume: 100,
  muted: false,
  fadeIn: 0,
  fadeOut: 0,
  speed: 1,
  musicVolume: 60,
  audioTrack: -1,
});

export const LOOKS: { key: string; label: string; set: Pick<EditState, "brightness" | "contrast" | "saturation" | "look"> }[] = [
  { key: "none", label: "Original", set: { brightness: 100, contrast: 100, saturation: 100, look: "none" } },
  { key: "vivid", label: "Vivid", set: { brightness: 104, contrast: 112, saturation: 140, look: "none" } },
  { key: "soft", label: "Soft", set: { brightness: 108, contrast: 90, saturation: 92, look: "none" } },
  { key: "drama", label: "Dramatic", set: { brightness: 94, contrast: 135, saturation: 85, look: "none" } },
  { key: "fade", label: "Faded", set: { brightness: 110, contrast: 82, saturation: 70, look: "none" } },
  { key: "mono", label: "B & W", set: { brightness: 100, contrast: 110, saturation: 100, look: "mono" } },
  { key: "sepia", label: "Sepia", set: { brightness: 102, contrast: 100, saturation: 100, look: "sepia" } },
];

const ASPECTS: Record<Exclude<Aspect, "original">, number> = { "9:16": 9 / 16, "1:1": 1, "4:5": 4 / 5, "16:9": 16 / 9 };

const evenDown = (v: number) => Math.max(2, Math.floor(v / 2) * 2);
const evenUp = (v: number) => Math.max(2, Math.ceil(v / 2) * 2);

// ---------- Time ----------

export const sortedSegs = (segs: Seg[]) => [...segs].sort((a, b) => a.start - b.start);
export const keptDuration = (segs: Seg[]) => segs.reduce((n, s) => n + Math.max(0, s.end - s.start), 0);
export const outDuration = (e: EditState) => keptDuration(e.segs) / e.speed;
export const segAt = (segs: Seg[], t: number) => segs.find((s) => t >= s.start && t < s.end) ?? null;

let segCounter = 0;
const newId = () => `p${Date.now().toString(36)}${(segCounter++).toString(36)}`;

/** The span the current parts cover (keeps an earlier trim of the start / end). */
function span(segs: Seg[]): [number, number] {
  const s = sortedSegs(segs);
  return [s[0]?.start ?? 0, s[s.length - 1]?.end ?? 0];
}

/** N equal parts over the current span. */
export function splitEqual(segs: Seg[], count: number): Seg[] {
  const [a, b] = span(segs);
  const n = Math.max(1, Math.min(100, Math.round(count)));
  const len = (b - a) / n;
  return Array.from({ length: n }, (_, i) => ({ id: newId(), start: a + i * len, end: i === n - 1 ? b : a + (i + 1) * len }));
}

/** Parts of `len` seconds over the current span; a leftover under 1.5 s joins the last part. */
export function splitEvery(segs: Seg[], len: number): Seg[] {
  const [a, b] = span(segs);
  const out: Seg[] = [];
  for (let t = a; t < b - 0.01; t += len) {
    const end = Math.min(b, t + len);
    if (end - t < 1.5 && out.length) out[out.length - 1].end = end;
    else out.push({ id: newId(), start: t, end });
  }
  return out.length ? out : [{ id: newId(), start: a, end: b }];
}

/** Source time → output time (removed parts collapse, speed applied). */
export function srcToOut(e: EditState, t: number): number {
  let acc = 0;
  for (const s of sortedSegs(e.segs)) {
    if (t >= s.end) acc += s.end - s.start;
    else {
      if (t > s.start) acc += t - s.start;
      break;
    }
  }
  return acc / e.speed;
}

/**
 * True when the only edit is a single trim — that can be saved instantly by copying the streams.
 * Several kept parts always re-encode: stream copies can only start on keyframes, and joining
 * such pieces drifts by seconds.
 */
export function isCutOnly(e: EditState, hasMusic: boolean): boolean {
  const d = defaultEdit(0);
  const same = (k: keyof EditState) => e[k] === d[k];
  return (
    !hasMusic &&
    e.segs.length === 1 &&
    e.aspect === "original" &&
    e.texts.length === 0 &&
    (["zoom", "panX", "panY", "rotate", "flipH", "flipV", "brightness", "contrast", "saturation", "look", "volume", "muted", "fadeIn", "fadeOut", "speed"] as const).every(same)
  );
}

// ---------- Geometry ----------

/** Source size after rotation. */
export function sourceDims(vw: number, vh: number, rotate: number): [number, number] {
  return rotate % 180 !== 0 ? [vh, vw] : [vw, vh];
}

/** Output frame size. `res` is the short side in px (never upscales an "original" frame). */
export function outputDims(e: EditState, vw: number, vh: number, res: number): { W: number; H: number } {
  const [sw, sh] = sourceDims(vw || 1920, vh || 1080, e.rotate);
  const ratio = e.aspect === "original" ? sw / sh : ASPECTS[e.aspect];
  const short = e.aspect === "original" ? Math.min(res, Math.min(sw, sh)) : res;
  return ratio >= 1 ? { W: evenDown(short * ratio), H: evenDown(short) } : { W: evenDown(short), H: evenDown(short / ratio) };
}

type Framing =
  | { mode: "fill"; dw: number; dh: number; x: number; y: number }
  | { mode: "blur" | "color"; fw: number; fh: number };

export function framing(e: EditState, sw: number, sh: number, W: number, H: number): Framing {
  if (e.aspect === "original" || e.fit === "fill") {
    const s = Math.max(W / sw, H / sh) * e.zoom;
    const dw = Math.max(W, evenUp(sw * s));
    const dh = Math.max(H, evenUp(sh * s));
    return { mode: "fill", dw, dh, x: Math.round((dw - W) * (0.5 + e.panX / 2)), y: Math.round((dh - H) * (0.5 + e.panY / 2)) };
  }
  const s = Math.min(W / sw, H / sh);
  return { mode: e.fit, fw: Math.min(W, evenDown(sw * s)), fh: Math.min(H, evenDown(sh * s)) };
}

// ---------- Preview ----------

function colorFilter(e: EditState): string {
  const f: string[] = [];
  if (e.brightness !== 100) f.push(`brightness(${e.brightness / 100})`);
  if (e.contrast !== 100) f.push(`contrast(${e.contrast / 100})`);
  if (e.saturation !== 100) f.push(`saturate(${e.saturation / 100})`);
  if (e.look === "mono") f.push("grayscale(1)");
  if (e.look === "sepia") f.push("sepia(1)");
  return f.join(" ");
}

type Drawable = HTMLVideoElement | HTMLCanvasElement | ImageBitmap;

/** Draws the source into a destination rectangle, rotated and flipped. */
function drawSrc(ctx: CanvasRenderingContext2D, src: Drawable, e: EditState, dx: number, dy: number, dw: number, dh: number) {
  const rot = e.rotate % 180 !== 0;
  const w = rot ? dh : dw;
  const h = rot ? dw : dh;
  ctx.save();
  ctx.translate(dx + dw / 2, dy + dh / 2);
  ctx.scale(e.flipH ? -1 : 1, e.flipV ? -1 : 1);
  ctx.rotate((e.rotate * Math.PI) / 180);
  ctx.drawImage(src, -w / 2, -h / 2, w, h);
  ctx.restore();
}

const FONT_STACK = `system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans", "Noto Sans Tamil", sans-serif`;

/** Layout of a text layer in frame pixels (also used for hit-testing when dragging). */
/** "{n}" in a text becomes the part number (for "PART 1", "PART 2"… labels). */
export const resolveText = (text: string, n: number) => text.replace(/\{n\}/gi, String(n));

export function textLayout(ctx: CanvasRenderingContext2D, W: number, H: number, t: TextLayer, n = 1) {
  const px = Math.max(6, (t.size / 100) * H);
  ctx.font = `${t.bold ? 800 : 600} ${px}px ${FONT_STACK}`;
  const lines = (resolveText(t.text, n) || " ").split("\n");
  const lineH = px * 1.22;
  const textW = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const padX = t.style === "box" ? px * 0.55 : px * 0.15;
  const padY = t.style === "box" ? px * 0.32 : px * 0.1;
  const w = textW + padX * 2;
  const h = lineH * lines.length + padY * 2;
  return { px, lines, lineH, w, h, left: t.x * W - w / 2, top: t.y * H - h / 2 };
}

export function drawText(ctx: CanvasRenderingContext2D, W: number, H: number, t: TextLayer, n = 1) {
  if (!t.text.trim()) return;
  ctx.save();
  const L = textLayout(ctx, W, H, t, n);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (t.style === "box") {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.beginPath();
    ctx.roundRect(L.left, L.top, L.w, L.h, L.px * 0.35);
    ctx.fill();
  }
  L.lines.forEach((line, i) => {
    const cy = t.y * H - ((L.lines.length - 1) * L.lineH) / 2 + i * L.lineH;
    if (t.style === "outline") {
      ctx.lineJoin = "round";
      ctx.lineWidth = L.px * 0.16;
      ctx.strokeStyle = "#000000";
      ctx.strokeText(line, t.x * W, cy);
    } else if (t.style === "plain") {
      ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
      ctx.shadowBlur = L.px * 0.18;
      ctx.shadowOffsetY = L.px * 0.04;
    }
    ctx.fillStyle = t.color;
    ctx.fillText(line, t.x * W, cy);
  });
  ctx.restore();
}

export const textVisible = (t: TextLayer, tOut: number) => tOut >= (t.from ?? 0) - 0.001 && tOut <= (t.to ?? Infinity) + 0.001;

/** One preview frame: framing, colour, text and fades — the same picture the export produces. */
export function drawFrame(ctx: CanvasRenderingContext2D, src: Drawable, vw: number, vh: number, W: number, H: number, e: EditState, tOut: number, partNo = 1) {
  const [sw, sh] = sourceDims(vw, vh, e.rotate);
  const color = colorFilter(e);
  const f = framing(e, sw, sh, W, H);

  ctx.filter = "none";
  ctx.fillStyle = f.mode === "color" ? e.bgColor : "#000000";
  ctx.fillRect(0, 0, W, H);

  if (f.mode === "fill") {
    ctx.filter = color || "none";
    drawSrc(ctx, src, e, -f.x, -f.y, f.dw, f.dh);
  } else {
    if (f.mode === "blur") {
      const s = Math.max(W / sw, H / sh);
      const bw = sw * s + 60;
      const bh = sh * s + 60;
      ctx.filter = `blur(${Math.max(1, (e.blur * W) / 1080)}px) brightness(0.7) ${color}`;
      drawSrc(ctx, src, e, (W - bw) / 2, (H - bh) / 2, bw, bh);
    }
    ctx.filter = color || "none";
    drawSrc(ctx, src, e, (W - f.fw) / 2, (H - f.fh) / 2, f.fw, f.fh);
  }
  ctx.filter = "none";

  for (const t of e.texts) if (textVisible(t, tOut)) drawText(ctx, W, H, t, partNo);

  const total = outDuration(e);
  let dark = 0;
  if (e.fadeIn > 0 && tOut < e.fadeIn) dark = 1 - tOut / e.fadeIn;
  if (e.fadeOut > 0 && tOut > total - e.fadeOut) dark = Math.max(dark, 1 - (total - tOut) / e.fadeOut);
  if (dark > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${Math.min(1, Math.max(0, dark))})`;
    ctx.fillRect(0, 0, W, H);
  }
}

// ---------- Export ----------

export interface ExportOptions {
  file: File;
  edit: EditState;
  width: number;
  height: number;
  /** Short side of the output in px. */
  res: number;
  /** x264 quality: lower = better and bigger (18–30). */
  crf: number;
  music?: File | null;
  /** Number that "{n}" in texts becomes. */
  partNo?: number;
  /** Lossless cuts start on a keyframe, so they can run a little long. Strict = re-render unless the length is exact. */
  strict?: boolean;
  onProgress?: (percent: number) => void;
  onStatus?: (text: string) => void;
}

export interface ExportResult {
  blob: Blob;
  /** True when the clip was cut without re-encoding. */
  lossless: boolean;
}

const f3 = (n: number) => n.toFixed(3);

function atempoChain(speed: number): string[] {
  const out: string[] = [];
  let s = speed;
  while (s > 2) {
    out.push("atempo=2");
    s /= 2;
  }
  while (s < 0.5) {
    out.push("atempo=0.5");
    s /= 0.5;
  }
  if (Math.abs(s - 1) > 0.001) out.push(`atempo=${s.toFixed(4)}`);
  return out;
}

/** The -filter_complex graph and maps for an edit. Exported for testing. */
export function buildGraph(e: EditState, vw: number, vh: number, res: number, o: { hasAudio: boolean; textInputs: number[]; musicInput: number | null }) {
  const segs = sortedSegs(e.segs);
  const n = segs.length;
  const total = outDuration(e);
  const { W, H } = outputDims(e, vw, vh, res);
  const [sw, sh] = sourceDims(vw, vh, e.rotate);
  const parts: string[] = [];
  const useSrcAudio = o.hasAudio && !e.muted && e.volume > 0;
  const trk = Math.max(0, e.audioTrack);

  // 1. Join the kept ranges (each range is its own fast-seeked input).
  let v = "0:v:0";
  let a = `0:a:${trk}`;
  if (n > 1) {
    const ins = segs.map((_, i) => `[${i}:v:0]${useSrcAudio ? `[${i}:a:${trk}]` : ""}`).join("");
    parts.push(`${ins}concat=n=${n}:v=1:a=${useSrcAudio ? 1 : 0}[cv]${useSrcAudio ? "[ca]" : ""}`);
    v = "cv";
    a = "ca";
  }

  // 2. Rotate / flip / colour on the source picture.
  const pre: string[] = [];
  if (e.rotate === 90) pre.push("transpose=1");
  if (e.rotate === 180) pre.push("hflip", "vflip");
  if (e.rotate === 270) pre.push("transpose=2");
  if (e.flipH) pre.push("hflip");
  if (e.flipV) pre.push("vflip");
  if (e.brightness !== 100) pre.push(`lutyuv=y=val*${(e.brightness / 100).toFixed(3)}`);
  if (e.contrast !== 100 || e.saturation !== 100) pre.push(`eq=contrast=${(e.contrast / 100).toFixed(3)}:saturation=${(e.saturation / 100).toFixed(3)}`);
  if (e.look === "mono") pre.push("hue=s=0");
  if (e.look === "sepia") pre.push("colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131");
  pre.push("setsar=1");

  // 3. Fit into the output frame.
  const f = framing(e, sw, sh, W, H);
  if (f.mode === "fill") {
    parts.push(`[${v}]${pre.join(",")},scale=${f.dw}:${f.dh},crop=${W}:${H}:${f.x}:${f.y}[fr]`);
  } else if (f.mode === "color") {
    parts.push(`[${v}]${pre.join(",")},scale=${f.fw}:${f.fh},pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x${e.bgColor.replace("#", "")}[fr]`);
  } else {
    // Blur on a quarter-size copy: looks the same, renders several times faster.
    const qw = evenUp(W / 4);
    const qh = evenUp(H / 4);
    const r = Math.max(1, Math.min(Math.floor(Math.min(qw, qh) / 4) - 1, Math.round((e.blur * W) / 1080 / 4)));
    parts.push(`[${v}]${pre.join(",")},split[b0][f0]`);
    parts.push(`[b0]scale=${qw}:${qh}:force_original_aspect_ratio=increase,crop=${qw}:${qh},boxblur=${r}:2,lutyuv=y=val*0.7,scale=${W}:${H}[bg]`);
    parts.push(`[f0]scale=${f.fw}:${f.fh}[fg]`);
    parts.push(`[bg][fg]overlay=(W-w)/2:(H-h)/2[fr]`);
  }
  let cur = "fr";

  // 4. Speed.
  if (e.speed !== 1) {
    parts.push(`[${cur}]setpts=PTS/${e.speed}[sp]`);
    cur = "sp";
  }

  // 5. Text layers (pre-rendered transparent PNGs, one input each).
  e.texts
    .filter((t) => t.text.trim())
    .forEach((t, i) => {
      const from = Math.max(0, t.from ?? 0);
      const to = Math.min(total, t.to ?? total);
      parts.push(`[${cur}][${o.textInputs[i]}:v]overlay=0:0:enable='between(t,${f3(from)},${f3(to)})'[t${i}]`);
      cur = `t${i}`;
    });

  // 6. Fades and pixel format.
  const tail: string[] = [];
  if (e.fadeIn > 0) tail.push(`fade=t=in:st=0:d=${f3(e.fadeIn)}`);
  if (e.fadeOut > 0) tail.push(`fade=t=out:st=${f3(Math.max(0, total - e.fadeOut))}:d=${f3(e.fadeOut)}`);
  // Scaling the quarter-size blur back up can leave non-square pixels; the frame is always square-pixel.
  tail.push("setsar=1", "format=yuv420p");
  parts.push(`[${cur}]${tail.join(",")}[vout]`);

  // 7. Audio: source (speed, volume, fades) and/or music.
  const fades: string[] = [];
  if (e.fadeIn > 0) fades.push(`afade=t=in:st=0:d=${f3(e.fadeIn)}`);
  if (e.fadeOut > 0) fades.push(`afade=t=out:st=${f3(Math.max(0, total - e.fadeOut))}:d=${f3(e.fadeOut)}`);
  let audio: string | null = null;
  if (useSrcAudio) {
    const chain = [...atempoChain(e.speed), ...(e.volume !== 100 ? [`volume=${(e.volume / 100).toFixed(2)}`] : []), "aresample=44100"];
    parts.push(`[${a}]${chain.join(",")}[a0]`);
    audio = "a0";
  }
  if (o.musicInput !== null) {
    parts.push(`[${o.musicInput}:a:0]volume=${(e.musicVolume / 100).toFixed(2)},aresample=44100,atrim=0:${f3(total)},asetpts=PTS-STARTPTS[mu]`);
    if (audio) {
      parts.push(`[${audio}][mu]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[mx]`);
      audio = "mx";
    } else audio = "mu";
  }
  if (audio && fades.length) {
    parts.push(`[${audio}]${fades.join(",")}[aout]`);
    audio = "aout";
  }

  return { graph: parts.join(";"), videoMap: "[vout]", audioMap: audio ? `[${audio}]` : null, W, H, total };
}

async function textPng(W: number, H: number, t: TextLayer, n: number): Promise<Uint8Array> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  drawText(c.getContext("2d")!, W, H, t, n);
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
  if (!blob) throw new Error("Could not render the text layer");
  return new Uint8Array(await blob.arrayBuffer());
}

/**
 * The source file is copied into the engine once and reused for every part of an export
 * (a 1 GB file would otherwise be copied again for each of 40 Shorts).
 */
let cache: { ff: unknown; file: File; name: string; hasAudio: boolean | null } | null = null;

async function ensureInput(ffmpeg: any, file: File, status: (t: string) => void): Promise<NonNullable<typeof cache>> {
  if (cache && cache.ff === ffmpeg && cache.file === file) return cache;
  if (cache && cache.ff === ffmpeg) await ffmpeg.deleteFile(cache.name).catch(() => {});
  status("Reading the video…");
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const name = `ed_src_${Date.now()}.${ext}`;
  await ffmpeg.writeFile(name, new Uint8Array(await file.arrayBuffer()));
  cache = { ff: ffmpeg, file, name, hasAudio: null };
  return cache;
}

/** Frees the copy of the source video held by the engine. */
export async function releaseInput() {
  if (!cache) return;
  const c = cache;
  cache = null;
  try {
    const ffmpeg = await getFFmpegInstance();
    if (c.ff === ffmpeg) await ffmpeg.deleteFile(c.name).catch(() => {});
  } catch {}
}

/** Stops a running export. */
export const cancelExport = () => {
  cache = null;
  terminateFFmpeg();
};

export async function exportEdit(o: ExportOptions): Promise<ExportResult> {
  const { file, edit: e } = o;
  const status = (t: string) => o.onStatus?.(t);
  const segs = sortedSegs(e.segs).filter((s) => s.end - s.start >= 0.05);
  if (!segs.length) throw new Error("Nothing to export — every part of the video was removed.");
  const partNo = o.partNo ?? 1;

  status("Loading the video engine…");
  const ffmpeg = await getFFmpegInstance();
  const src = await ensureInput(ffmpeg, file, status);

  // Only trimmed: copy the streams, no re-encode (seconds instead of minutes).
  if (segs.length === 1 && isCutOnly(e, !!o.music)) {
    try {
      status("Saving in original quality…");
      const s = segs[0];
      const r = await sliceVideoLossless(
        file,
        { id: s.id, index: partNo, title: "Clip", startTime: s.start, endTime: s.end, duration: s.end - s.start, selected: true, status: "idle" },
        e.audioTrack,
        undefined,
        true,
        src.name,
      );
      const got = await blobDuration(r.blob);
      const off = Math.abs(got - (s.end - s.start));
      if (got <= 0 || (o.strict !== false && off > 0.35)) throw new Error(`length ${got.toFixed(2)}s, wanted ${(s.end - s.start).toFixed(2)}s`);
      o.onProgress?.(100);
      return { blob: r.blob, lossless: true };
    } catch (err) {
      console.warn("Lossless cut not used, re-encoding instead:", err);
    }
  }

  const stamp = Date.now();
  const output = `ed_out_${stamp}.mp4`;
  const temp: string[] = [output];
  const logs: string[] = [];
  let total = 1;
  const onLog = ({ message }: { message: string }) => {
    logs.push(message);
    if (logs.length > 400) logs.shift();
    const m = /time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(message);
    if (m) o.onProgress?.(Math.min(99, Math.round(((+m[1] * 3600 + +m[2] * 60 + +m[3]) / total) * 100)));
  };

  ffmpeg.on("log", onLog);
  try {
    // Does the file have sound? (`-i` alone prints the streams and exits.)
    if (src.hasAudio === null) {
      try {
        await ffmpeg.exec(["-hide_banner", "-i", src.name]);
      } catch {}
      src.hasAudio = logs.some((l) => /Stream #0:\d+.*Audio:/.test(l));
      logs.length = 0;
    }

    const args: string[] = ["-hide_banner", "-y"];
    for (const s of segs) args.push("-ss", f3(s.start), "-t", f3(s.end - s.start), "-i", src.name);
    let next = segs.length;

    const { W, H } = outputDims(e, o.width, o.height, o.res);
    const textInputs: number[] = [];
    const texts = e.texts.filter((t) => t.text.trim());
    for (let i = 0; i < texts.length; i++) {
      const name = `ed_txt_${stamp}_${i}.png`;
      await ffmpeg.writeFile(name, await textPng(W, H, texts[i], partNo));
      temp.push(name);
      args.push("-i", name);
      textInputs.push(next++);
    }

    let musicInput: number | null = null;
    if (o.music) {
      const mext = (o.music.name.split(".").pop() || "mp3").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp3";
      const name = `ed_music_${stamp}.${mext}`;
      await ffmpeg.writeFile(name, new Uint8Array(await o.music.arrayBuffer()));
      temp.push(name);
      args.push("-stream_loop", "-1", "-i", name);
      musicInput = next++;
    }

    const g = buildGraph({ ...e, segs }, o.width, o.height, o.res, { hasAudio: !!src.hasAudio, textInputs, musicInput });
    total = Math.max(0.1, g.total);
    args.push("-filter_complex", g.graph, "-map", g.videoMap);
    if (g.audioMap) args.push("-map", g.audioMap, "-c:a", "aac", "-b:a", "160k");
    else args.push("-an");
    args.push("-c:v", "libx264", "-preset", "ultrafast", "-crf", String(o.crf), "-movflags", "+faststart", "-t", f3(total), output);

    status(`Rendering ${W}×${H}…`);
    const code = await ffmpeg.exec(args);
    if (code !== 0) throw new Error(logs.filter((l) => /error|invalid|no such|unable|failed/i.test(l)).slice(-2).join(" · ") || "The video engine could not render this edit.");

    status("Finishing…");
    const data = await ffmpeg.readFile(output);
    o.onProgress?.(100);
    return { blob: new Blob([data as BlobPart], { type: "video/mp4" }), lossless: false };
  } finally {
    try {
      ffmpeg.off("log", onLog);
      for (const name of temp) await ffmpeg.deleteFile(name).catch(() => {});
    } catch {}
  }
}

/** Playable length of a rendered clip, as a browser sees it. */
function blobDuration(blob: Blob): Promise<number> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(blob);
    const v = document.createElement("video");
    let settled = false;
    const done = (d: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(d);
    };
    v.preload = "metadata";
    v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : -1);
    v.onerror = () => done(-1);
    setTimeout(() => done(-1), 8000);
    v.src = url;
  });
}