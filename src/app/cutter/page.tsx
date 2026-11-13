import type { Metadata } from "next";
import { VideoEditor } from "@/components/VideoEditor";
import { OG_IMAGE } from "@/lib/site";

const TITLE = "VideoCut Studio — Cut, Split & Edit Videos Online";
const DESCRIPTION =
  "Open VideoCut Studio: split videos into Shorts or equal parts, trim, resize to 9:16, add text, music and speed, then export every part. Free, in your browser.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/cutter/" },
  openGraph: {
    type: "website",
    url: "/cutter/",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.alt }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }] },
};

/** The studio as a full-screen app — opens straight into the editor. UTubeFlow embeds this page. */
export default function CutterPage() {
  return (
    <>
      <h1 className="sr-only">VideoCut Studio — free online video cutter and editor</h1>
      <VideoEditor app />
    </>
  );
}