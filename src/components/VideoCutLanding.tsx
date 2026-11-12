import Link from "next/link";
import { ArrowRight, FolderArchive, Languages, Scissors, ShieldCheck, Smartphone } from "lucide-react";
import { VideoCutStudio } from "@/components/VideoCutStudio";
import { FeaturesSection } from "@/components/FeaturesSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { FaqSection } from "@/components/FaqSection";
import { UTubeFlowSection } from "@/components/UTubeFlowSection";
import { JsonLd } from "@/components/JsonLd";
import type { FaqItem } from "@/lib/content";

export function VideoCutLanding({
  badge = "Free Video Shorts Cutter & Splitter",
  headlineStart = "Video Cut: split long videos into",
  headlineHighlight = "parts & Shorts",
  lead = "Free online video shorts cutter and splitter. Cut any video into equal halves or 30-second vertical 9:16 Shorts with a blurred background, choose Tamil, Telugu, Hindi or English audio, and download as ZIP.",
  faqs,
  jsonLd,
}: {
  badge?: string;
  headlineStart?: string;
  headlineHighlight?: string;
  lead?: string;
  faqs?: readonly FaqItem[];
  jsonLd: Record<string, unknown>;
}) {
  return (
    <div className="relative">
      <JsonLd data={jsonLd} />

      {/* Ambient backdrop */}
      <div className="site-chrome hero-grid" />
      <div className="site-chrome studio-glow" />

      {/* Hero */}
      <section className="site-chrome relative z-10 text-center max-w-3xl mx-auto pt-14 sm:pt-20 pb-10 sm:pb-12 space-y-6 stagger">
        <div className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1 rounded-full text-xs font-semibold bg-[color:var(--card)] text-[color:var(--muted)] border border-[color:var(--border)] shadow-[var(--shadow-sm)]">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)]">
            Free
          </span>
          {badge}
        </div>

        <h1 className="font-display text-[40px] leading-[1.05] sm:text-6xl lg:text-[68px] font-bold tracking-[-0.03em] text-[color:var(--fg)]">
          {headlineStart}
          <br className="hidden sm:block" /> <span className="text-gradient">{headlineHighlight}</span>
        </h1>

        <p className="text-base sm:text-lg text-[color:var(--muted)] max-w-2xl mx-auto leading-relaxed">
          {lead}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          {[
            { icon: Scissors, text: "Equal parts" },
            { icon: Smartphone, text: "9:16 blur fill" },
            { icon: Languages, text: "Multi-audio" },
            { icon: FolderArchive, text: "One-click ZIP" },
            { icon: ShieldCheck, text: "No watermark" },
          ].map(({ icon: Icon, text }) => (
            <span key={text} className="chip !text-xs !py-1.5 !px-3">
              <Icon className="w-3.5 h-3.5 text-[color:var(--brand)]" />
              {text}
            </span>
          ))}
        </div>

        <Link
          href="#utubeflow"
          className="inline-flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-[color:var(--brand-soft)] text-[color:var(--brand-fg)] border border-[color:var(--brand-line)] transition hover:-translate-y-0.5"
        >
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white bg-gradient-to-r from-[var(--brand)] to-[var(--brand-2)]">
            New
          </span>
          <span className="sm:hidden">Send clips straight to UTubeFlow</span>
          <span className="hidden sm:inline">Connect UTubeFlow: send clips straight to YouTube scheduling</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </section>

      {/* Studio */}
      <div className="studio-wrap relative z-10 pb-16">
        <VideoCutStudio />
      </div>

      <div className="site-chrome">
        <UTubeFlowSection />
        <FeaturesSection />
        <HowItWorksSection />
        <FaqSection faqs={faqs} />
      </div>
    </div>
  );
}

