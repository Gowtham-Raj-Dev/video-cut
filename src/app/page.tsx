import { VideoCutLanding } from "@/components/VideoCutLanding";
import { homeJsonLd } from "@/lib/seo";

export default function Home() {
  return <VideoCutLanding jsonLd={homeJsonLd()} />;
}
