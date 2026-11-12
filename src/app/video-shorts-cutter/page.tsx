import type { Metadata } from "next";
import { VideoCutLanding } from "@/components/VideoCutLanding";
import { homeJsonLd } from "@/lib/seo";
import { FAQS, type FaqItem } from "@/lib/content";
import { OG_IMAGE } from "@/lib/site";

const TITLE = "Video Shorts Cutter — Cut Long Videos into 9:16 Shorts Free";
const DESCRIPTION =
  "Free online video shorts cutter. Automatically slice long movies, podcasts and gameplay into 15s, 30s or 60s 9:16 vertical Shorts and Reels with blur fill & multi-audio.";

const SHORTS_FAQS: readonly FaqItem[] = [
  {
    q: "How does this video shorts cutter convert horizontal videos to 9:16?",
    a: "Upload any 16:9 video, switch the cut mode to 30s or 60s Shorts, and pick Blur fill, Letterbox or Center crop. Every clip is framed for YouTube Shorts, Instagram Reels and TikTok and packaged into one ZIP.",
  },
  ...FAQS.slice(1),
];

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | VideoCut` },
  description: DESCRIPTION,
  alternates: { canonical: "/video-shorts-cutter/" },
  keywords: [
    "video shorts cutter",
    "free video shorts cutter",
    "youtube shorts cutter online",
    "cut long video into shorts",
    "reels cutter online free",
    "9:16 video cutter",
    "video cut",
  ],
  openGraph: {
    type: "website",
    url: "/video-shorts-cutter/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
};

export default function VideoShortsCutterPage() {
  return (
    <VideoCutLanding
      badge="Free 9:16 Video Shorts Cutter"
      headlineStart="Free video shorts cutter for"
      headlineHighlight="YouTube Shorts & Reels"
      lead="Turn long horizontal videos into clean 15s, 30s or 60s vertical Shorts with blurred backgrounds, multi-audio track selection and one-click ZIP export — 100% free in your browser."
      faqs={SHORTS_FAQS}
      jsonLd={homeJsonLd({
        pageName: "Video Shorts Cutter — Video Cut",
        pageDescription: DESCRIPTION,
        path: "/video-shorts-cutter/",
        breadcrumbName: "Video Shorts Cutter",
        faqs: SHORTS_FAQS,
      })}
    />
  );
}

