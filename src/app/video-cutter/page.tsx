import type { Metadata } from "next";
import { VideoCutLanding } from "@/components/VideoCutLanding";
import { homeJsonLd } from "@/lib/seo";
import { FAQS } from "@/lib/content";
import { OG_IMAGE } from "@/lib/site";

const TITLE = "Video Cut Online — Free Video Cutter & Equal-Parts Splitter";
const DESCRIPTION =
  "Video Cut splits large MP4, MKV and MOV videos into equal parts or timed clips with lossless quality, audio track picking and ZIP download. Zero uploads, zero watermark.";

export const metadata: Metadata = {
  title: { absolute: `${TITLE} | CodeLove` },
  description: DESCRIPTION,
  alternates: { canonical: "/video-cutter/" },
  keywords: [
    "video cut",
    "video cutter online free",
    "split video into parts",
    "cut video online",
    "lossless video splitter",
    "video shorts cutter",
    "codelove",
  ],
  openGraph: {
    type: "website",
    url: "/video-cutter/",
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

export default function VideoCutterPage() {
  return (
    <VideoCutLanding
      badge="Video Cut — Free Online Splitter"
      headlineStart="Video Cut: split any clip"
      headlineHighlight="without losing quality"
      lead="Divide any video into 2 to 20 equal parts or timed Shorts clips right on your device. Keep Tamil, Hindi, Telugu or English dubs and download all parts in one ZIP."
      faqs={FAQS}
      jsonLd={homeJsonLd({
        pageName: "Video Cut Online",
        pageDescription: DESCRIPTION,
        path: "/video-cutter/",
        breadcrumbName: "Video Cut",
        faqs: FAQS,
      })}
    />
  );
}

