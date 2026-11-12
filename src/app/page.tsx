import type { Metadata } from "next";
import { VideoCutLanding } from "@/components/VideoCutLanding";
import { homeJsonLd } from "@/lib/seo";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Home() {
  return <VideoCutLanding jsonLd={homeJsonLd()} />;
}
