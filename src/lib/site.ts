const IS_PROD = process.env.NODE_ENV === "production";

export const SITE = {
  name: "Video Cut Studio",
  shortName: "VideoCut",
  tagline: "Free Video Cutter: Split Videos into Parts & 9:16 Shorts",
  // ≤160 chars so Google shows it in full
  description:
    "Free online video cutter. Split videos into equal parts or 30s 9:16 Shorts with blur background, keep Tamil/Hindi audio, download as ZIP. No upload, no watermark.",
  url: IS_PROD ? "https://videocut.codelove.in" : "http://localhost:3000",
  basePath: "",
  creator: "Gowtham",
  brand: "CodeLove",
  brandUrl: "https://codelove.in",
  email: "support@codelove.in",
  twitter: "@codelove",
} as const;

export const OG_IMAGE = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: "VideoCut by CodeLove — free video cutter: split videos into equal parts or 9:16 Shorts with blur background",
} as const;

export const NAV_LINKS = [
  { label: "Studio", href: "#studio" },
  { label: "UTubeFlow", href: "#utubeflow" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "FAQ", href: "#faq" },
] as const;

/** Sibling video tools, shown in the footer's "More video tools" column. */
export const MORE_VIDEO_TOOLS: readonly { label: string; href: string }[] = [
  { label: "Video to GIF", href: "https://videotogif.codelove.in" },
  { label: "Video to Images", href: "https://videotoimages.codelove.in" },
  { label: "Video to MP3", href: "https://videotoimages.codelove.in/video-to-mp3" },
  { label: "Video Compressor", href: "https://videotoimages.codelove.in/video-compressor" },
  { label: "Video Crop", href: "https://videotoimages.codelove.in/video-crop" },
];

export const FOOTER_LINKS = {
  Product: [
    { label: "Video Cut Studio", href: "#studio" },
    { label: "Shorts Converter", href: "#studio" },
    { label: "Features", href: "#features" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "FAQ", href: "#faq" },
  ],
  Network: [
    { label: "CodeLove Main", href: "https://codelove.in" },
    { label: "Video to GIF", href: "https://videotogif.codelove.in" },
    { label: "Video to Images", href: "https://videotoimages.codelove.in" },
    { label: "Insta Downloader", href: "https://downloader.codelove.in" },
    { label: "Free 3D Models", href: "https://models.codelove.in" },
    { label: "Free 3D Games", href: "https://games.codelove.in" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#privacy" },
    { label: "Terms of Service", href: "#terms" },
  ],
} as const;

export const NETWORK_LINKS: readonly { label: string; href: string; title?: string }[] = [
  { label: "CodeLove", href: "https://codelove.in", title: "CodeLove — Main Hub" },
  { label: "Free 3D Models", href: "https://models.codelove.in", title: "Free 3D model library" },
  { label: "Free 3D Games", href: "https://games.codelove.in", title: "Free 3D games in browser" },
  { label: "Insta Downloader", href: "https://downloader.codelove.in", title: "Free Instagram Reels, video & photo downloader" },
  { label: "Link in Bio", href: "https://linkinbio.codelove.in", title: "Free link-in-bio pages" },
  { label: "Video to GIF", href: "https://videotogif.codelove.in", title: "Convert video to GIF" },
  { label: "Video to Images", href: "https://videotoimages.codelove.in", title: "Extract frames & convert videos" },
  { label: "Free YouTube Automation", href: "https://utubeflow.codelove.in", title: "Bulk upload & schedule YouTube videos" },
  { label: "Free Java Games", href: "https://javaplay.codelove.in", title: "Play old Java J2ME phone games" },
];

