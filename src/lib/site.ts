const IS_PROD = process.env.NODE_ENV === "production";

export const SITE = {
  name: "Video Cut",
  shortName: "VideoCut",
  tagline: "Free Video Shorts Cutter & Online Video Splitter",
  // ≤160 chars so Google shows it in full
  description:
    "Video Cut is a free video shorts cutter & online splitter. Split videos into equal parts or 30s 9:16 Shorts with blur fill and ZIP export — zero watermark.",
  url: IS_PROD ? "https://videocut.codelove.in" : "http://localhost:3000",
  basePath: "",
  creator: "Gowtham",
  creatorUrl: "https://gowtham.codelove.in",
  brand: "CodeLove",
  brandUrl: "https://codelove.in",
  email: "support@codelove.in",
  twitter: "@codelove",
} as const;

export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "Video Cut by CodeLove — free video shorts cutter: split videos into equal parts or 9:16 Shorts",
} as const;

export const NAV_LINKS = [
  { label: "Studio", href: "/cutter/" },
  { label: "Shorts Cutter", href: "/video-shorts-cutter/" },
  { label: "UTubeFlow", href: "/#utubeflow" },
  { label: "Features", href: "/#features" },

  { label: "FAQ", href: "/#faq" },
] as const;

/** Sibling video tools, shown in the footer's "More video tools" column. */
export const MORE_VIDEO_TOOLS: readonly { label: string; href: string }[] = [
  { label: "Video Shorts Cutter", href: "/video-shorts-cutter/" },
  { label: "Video Cutter", href: "/video-cutter/" },
  { label: "Video to GIF", href: "https://videotogif.codelove.in" },
  { label: "Video to Images", href: "https://videotoimages.codelove.in" },
  { label: "Video to MP3", href: "https://videotoimages.codelove.in/video-to-mp3" },
  { label: "Video Compressor", href: "https://videotoimages.codelove.in/video-compressor" },
  { label: "Video Crop", href: "https://videotoimages.codelove.in/video-crop" },
];

export const FOOTER_LINKS = {
  Product: [
    { label: "Video Cut Studio", href: "/cutter/" },
    { label: "Video Shorts Cutter", href: "/video-shorts-cutter/" },
    { label: "Video Cutter", href: "/video-cutter/" },
    { label: "Features", href: "/#features" },
    { label: "How It Works", href: "/#how-it-works" },
    { label: "FAQ", href: "/#faq" },
  ],
  Network: [
    { label: "CodeLove Main", href: "https://codelove.in" },
    { label: "Gowtham (Maker)", href: "https://gowtham.codelove.in" },
    { label: "Video to GIF", href: "https://videotogif.codelove.in" },
    { label: "Video to Images", href: "https://videotoimages.codelove.in" },
    { label: "Insta Downloader", href: "https://downloader.codelove.in" },
    { label: "Free 3D Models", href: "https://models.codelove.in" },
    { label: "Free 3D Games", href: "https://games.codelove.in" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "https://codelove.in/legal/privacy" },
    { label: "Terms of Service", href: "https://codelove.in/legal/terms" },
  ],
} as const;

export const NETWORK_LINKS: readonly { label: string; href: string; title?: string }[] = [
  { label: "CodeLove", href: "https://codelove.in", title: "CodeLove — Main Hub" },
  { label: "Gowtham", href: "https://gowtham.codelove.in", title: "Gowtham — Developer portfolio" },
  { label: "Free 3D Models", href: "https://models.codelove.in", title: "Free 3D model library" },
  { label: "Free 3D Games", href: "https://games.codelove.in", title: "Free 3D games in browser" },
  { label: "Insta Downloader", href: "https://downloader.codelove.in", title: "Free Instagram Reels, video & photo downloader" },
  { label: "Link in Bio", href: "https://linkinbio.codelove.in", title: "Free link-in-bio pages" },
  { label: "Video to GIF", href: "https://videotogif.codelove.in", title: "Convert video to GIF" },
  { label: "Video to Images", href: "https://videotoimages.codelove.in", title: "Extract frames, compress & convert videos" },
  { label: "Free AI Video Maker", href: "https://videomaker.codelove.in", title: "Free AI video maker: script to talking cartoon or text video" },
  { label: "Free YouTube Automation", href: "https://utubeflow.codelove.in", title: "Bulk upload & schedule YouTube videos" },
  { label: "Free Java Games", href: "https://javaplay.codelove.in", title: "Play old Java J2ME phone games" },
];

