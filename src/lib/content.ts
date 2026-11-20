/**
 * Visible page copy that is also used in structured data (JSON-LD).
 * Keep it in one place so the FAQ / HowTo schema always matches what users see.
 */

export const HOW_IT_WORKS_STEPS = [
  {
    num: "01",
    title: "Drop your video",
    desc: "Load any MP4, WebM, MOV or MKV file from your computer, up to 4K.",
  },
  {
    num: "02",
    title: "Choose cut & audio",
    desc: "Pick equal parts or 30s Shorts, a frame style, and the language track to keep.",
  },
  {
    num: "03",
    title: "Download the ZIP",
    desc: "Export every part in one ZIP, ready for YouTube, Instagram and TikTok.",
  },
] as const;

export type FaqItem = { readonly q: string; readonly a: string };

export const FAQS: readonly FaqItem[] = [
  {
    q: "How do I cut a long video into Shorts with this YouTube Shorts cutter?",
    a: "Drop your long MP4, MKV or MOV file into Video Cut, select Shorts clips (15s, 30s, 45s or 60s), pick 9:16 vertical blur fill or center crop, choose your audio language track, and click Export ZIP. All clips are created right in your browser with no watermark.",
  },
  {
    q: "Can I cut a video into 30 second clips?",
    a: "Yes. Choose Shorts clips and pick 30s: Video Cut chops the whole video into back-to-back 30-second clips (15s, 45s and 60s work the same way). The last clip keeps whatever is left (a leftover under 1.5 seconds is added to it). Every clip is in the ZIP, numbered in order.",
  },
  {
    q: "How do I split a video into parts?",
    a: "Under “Equal parts”, choose how many parts you want, from 2 to 20. A 20-minute video split into 2 gives two 10-minute halves; split into 4 gives four 5-minute parts. In Original mode the parts are cut without re-encoding, so they keep the full quality.",
  },
  {
    q: "Is Video Cut a free video splitter online?",
    a: "Yes. It is a free video cutter and splitter that runs in your web browser: no app to install, no sign-up, no watermark and no file size limit set by us.",
  },
  {
    q: "How does the multi-audio picker work (Tamil, Telugu, Hindi, English)?",
    a: "If your MKV or MP4 has several audio tracks or dubs, VideoCut scans and lists them all. Pick a language, listen to it in the live preview, and your exported parts keep only that track.",
  },
  {
    q: "How do I turn a landscape video into Shorts (9:16)?",
    a: "Pick a 9:16 frame style. Placing a 16:9 video into a 9:16 frame normally leaves empty bars, so Blur fill enlarges the video behind itself with a soft blur and vignette while the original stays sharp and centred: the style popular on Shorts and Reels. You can also choose letterbox (plain bars) or zoom fill (crop to fill the frame).",
  },
  {
    q: "Is there any quality loss?",
    a: "Not in Original mode: the video stream is copied losslessly without re-encoding, usually in about a second. 9:16 formats are rendered on canvas at 1080p with a high bitrate.",
  },
  {
    q: "Are my videos uploaded anywhere?",
    a: "Never by VideoCut. Cutting, framing and ZIP packaging all happen inside your browser. Clips only leave your computer if you choose Send to UTubeFlow and then upload them to your own YouTube channel from there.",
  },
  {
    q: "Can I send my clips straight to YouTube?",
    a: "Yes, with UTubeFlow, our free YouTube bulk uploader and scheduler. Press Connect UTubeFlow in VideoCut's bottom bar, cut your video, then press Send to UTubeFlow. The clips land in UTubeFlow's upload list with titles, ready to upload and schedule. Inside UTubeFlow you can also open VideoCut from the Upload page with Cut into Shorts.",
  },
  {
    q: "Which formats and sizes are supported?",
    a: "MP4, WebM, MOV, MKV, AVI and M4V. There is no artificial size limit, since processing runs on your own device.",
  },
  {
    q: "Is VideoCut free? Does it add a watermark?",
    a: "VideoCut is completely free, needs no sign-up, and never adds a watermark to your clips.",
  },
] as const;

export const FEATURE_LIST = [
  "Split a video into 2 to 20 equal parts",
  "Cut videos into 15, 30, 45 or 60 second Shorts clips",
  "9:16 vertical output with blurred background, letterbox or zoom fill",
  "Lossless original-ratio cutting without re-encoding",
  "Pick one audio language track (Tamil, Telugu, Hindi, English) from multi-audio MKV/MP4",
  "Batch download all parts as one ZIP",
  "Runs 100% in the browser: no uploads, no watermark, no sign-up",
] as const;
