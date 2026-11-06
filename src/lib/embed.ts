/**
 * Embed bridge: VideoCut running inside UTubeFlow (utubeflow.codelove.in) as an iframe.
 *
 * Protocol (window.postMessage, origins checked on both sides):
 *   VideoCut  → parent : { type: "videocut:ready" }                          (sent to "*", carries no data)
 *   UTubeFlow → VideoCut: { type: "utubeflow:init", kind: "short" | "video", theme?: "dark" | "light" }
 *   VideoCut  → parent : { type: "videocut:clips", clips: EmbedClip[] }       (only to the verified parent origin)
 *   UTubeFlow → VideoCut: { type: "utubeflow:received", count: number }
 */

export const EMBED_PARAM = "embed";
export const EMBED_PARTNER = "utubeflow";

/** Only these sites may receive cut clips. */
export const ALLOWED_PARENT_ORIGINS = [
  "https://utubeflow.codelove.in",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4173",
];

/**
 * Second way in: on the VideoCut site itself, "Connect UTubeFlow" opens UTubeFlow's upload page in a named tab.
 * That tab (window.opener = us) says hello; we answer and later send it the clips.
 *   UTubeFlow tab → VideoCut: { type: "utubeflow:hello", kind }
 *   VideoCut → UTubeFlow tab: { type: "videocut:linked" }
 *   VideoCut → UTubeFlow tab: { type: "videocut:clips", kind, clips: EmbedClip[] }
 *   UTubeFlow tab → VideoCut: { type: "utubeflow:received", count }
 * For local testing of both apps: NEXT_PUBLIC_UTUBEFLOW_URL=http://localhost:5173
 */
export const UTUBEFLOW_URL = (process.env.NEXT_PUBLIC_UTUBEFLOW_URL || "https://utubeflow.codelove.in").replace(/\/$/, "");
export const UTUBEFLOW_TAB = "utubeflow";

export type EmbedClip = {
  name: string;
  type: string;
  blob: Blob;
  title: string;
  index: number;
  duration: number;
};

export type EmbedInit = { kind: "short" | "video"; theme?: "dark" | "light" };

/** True when the page was opened as an embed (URL flag + actually inside a frame). */
export function isEmbedRequested(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const flag = new URLSearchParams(window.location.search).get(EMBED_PARAM) === EMBED_PARTNER;
    return flag && window.self !== window.top;
  } catch {
    // Cross-origin access to window.top throws only when framed.
    return new URLSearchParams(window.location.search).get(EMBED_PARAM) === EMBED_PARTNER;
  }
}

export function isAllowedParent(origin: string): boolean {
  return ALLOWED_PARENT_ORIGINS.includes(origin);
}

/**
 * Inline script for <head>: marks <html data-embed> before first paint, so the site header,
 * hero, landing sections and footer are hidden without a flash.
 */
export const EMBED_BOOT_SCRIPT = `try{var q=new URLSearchParams(location.search);if(q.get("${EMBED_PARAM}")==="${EMBED_PARTNER}"&&window.self!==window.top){document.documentElement.setAttribute("data-embed","${EMBED_PARTNER}")}}catch(e){document.documentElement.setAttribute("data-embed","${EMBED_PARTNER}")}`;
