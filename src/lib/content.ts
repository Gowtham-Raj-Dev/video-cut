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

export const FAQS = [
  {
    q: "Can I cut a 20-minute video into 2 parts, or into twenty 30-second Shorts?",
    a: "Yes. Under “Equal parts”, choose 2 to split the video into two 10-minute halves. Under “Shorts clips”, pick 30s or 60s to chop it into vertical 9:16 clips with a blurred background. You can preview every part and download them all in one ZIP.",
  },
  {
    q: "How does the multi-audio picker work (Tamil, Telugu, Hindi, English)?",
    a: "If your MKV or MP4 has several audio tracks or dubs, VideoCut scans and lists them all. Pick a language, listen to it in the live preview, and your exported parts keep only that track.",
  },
  {
    q: "How does the blurred background work for landscape videos?",
    a: "Placing a 16:9 video into a 9:16 frame normally leaves empty bars. Blur fill enlarges the video behind itself with a soft blur and vignette, while the original stays sharp and centred: the style popular on Shorts and Reels.",
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
