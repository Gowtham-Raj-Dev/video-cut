# VideoCut Studio 🎬✂️

> **Split Long Videos into 9:16 Shorts & Reels with Blur Background or Letterbox in Seconds.**  
> Built by **Gowtham** for the **CodeLove** creator network ([codelove.in](https://codelove.in)).

---

## ✨ Features

- **⚡ Auto Video Segmenting**:
  - Split any long video (e.g. a 10-minute landscape video) into **20 equal 30-second Shorts clips** (or custom intervals like 15s, 40s, 60s, 90s).
  - Custom cut range scrubber (trim start and end times).
- **📱 9:16 Shorts Framing Studio**:
  - **Dynamic Blur Background**: Enlarges the video in the background with a cinematic blur + vignette while keeping your original video sharp and centered (CapCut / TikTok viral style).
  - **Letterbox Bars**: Centered original video with clean pitch-black or custom-color letterbox bars.
  - **Zoom & Fill Crop**: Full vertical 9:16 crop with adjustable horizontal center slider (-50% to +50%).
  - **Keep Original Ratio**: Slices without altering original aspect ratio.
- **🏷️ Part Badge Overlay**:
  - Optional badge overlay (e.g. `PART 1`, `PART 2`) positioned at top or bottom with custom text template.
- **👁️ Live Interactive 9:16 Mockup Preview**:
  - Real-time smartphone frame preview that shows the exact live blurred background or letterbox effect as you play and scrub the timeline!
  - Loop and preview individual segments before exporting.
- **📦 Batch All ZIP Download**:
  - Generate and package all 20+ Shorts clips into a single ZIP file (`video_9-16_Shorts_All_Parts.zip`) with one click.
  - Individual clip download also supported.
- **🔒 100% Client-Side Privacy**:
  - Videos never leave the user's device. Rendering runs directly in the browser's GPU via HTML5 Canvas 2D + Web Audio API + MediaRecorder.
  - Zero server uploads, zero watermarks, 100% free forever.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Static Export `output: 'export'`)
- **UI Library**: [React 19](https://react.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) with custom design tokens (Dark/Light mode)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Video & Audio Processing**:
  - HTML5 Canvas 2D Context (`drawImage`, `ctx.filter = blur(...)`)
  - Web Audio API (`AudioContext`, `createMediaElementSource`)
  - MediaRecorder API (High-bitrate VP9 / H.264 / WebM / MP4)
  - Optional `@ffmpeg/ffmpeg` wasm integration
- **Packaging & Delivery**:
  - `jszip` & `file-saver` (Instant client-side ZIP packaging)
  - `canvas-confetti` (Celebratory export animation)

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
pnpm install
# or
npm install
```

### 2. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Build for Production (Static Export)
```bash
pnpm build
```
The production-ready static assets will be compiled into the `out/` folder, ready to deploy to Firebase Hosting, Vercel, Netlify, Cloudflare Pages, or any static web host.

---

## 🌐 CodeLove Network

- [CodeLove Main](https://codelove.in)
- [Video to Images](https://videotoimages.codelove.in)
- [Video to GIF](https://videotogif.codelove.in)
- [Insta Downloader](https://downloader.codelove.in)
- [Free 3D Models](https://models.codelove.in)
- [Free 3D Games](https://games.codelove.in)
- [Free YouTube Automation](https://utubeflow.codelove.in)
- [Free Java Games](https://javaplay.codelove.in)

---

© 2026 **VideoCut Studio** — Part of CodeLove. Built by **Gowtham**.

