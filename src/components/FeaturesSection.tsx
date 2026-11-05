import { Scissors, Smartphone, Layers, FolderArchive, ShieldCheck, Languages } from "lucide-react";

export function SectionHeading({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-14 space-y-3">
      <div className="label !text-[color:var(--brand-fg)]">{eyebrow}</div>
      <h2 className="font-display text-3xl sm:text-[40px] font-bold tracking-[-0.02em] leading-tight text-[color:var(--fg)]">
        {title}
      </h2>
      <p className="text-[15px] text-[color:var(--muted)] leading-relaxed">{text}</p>
    </div>
  );
}

export function FeaturesSection() {
  const features = [
    {
      icon: Scissors,
      title: "Equal parts & timed clips",
      description:
        "Split long videos into 2 equal halves (10 min each) or slice them into 30-second clips for TikTok, Reels and YouTube Shorts.",
    },
    {
      icon: Smartphone,
      title: "Blurred 9:16 background",
      description:
        "Landscape footage stays sharp and centred while an enlarged, softly blurred copy fills the vertical frame.",
    },
    {
      icon: Layers,
      title: "Letterbox, crop or original",
      description:
        "Switch between clean solid bars, a full-bleed centre crop, or the exact original widescreen ratio.",
    },
    {
      icon: FolderArchive,
      title: "Batch ZIP download",
      description:
        "No downloading 20 files one by one. Export every selected part in a single, neatly named ZIP.",
    },
    {
      icon: ShieldCheck,
      title: "Private, in your browser",
      description:
        "Your videos never touch a server. Cutting, framing and packaging all happen on your own device.",
    },
    {
      icon: Languages,
      title: "Multi-audio track picker",
      description:
        "Detects every dub in MKV and MP4 files. Choose Tamil, Telugu, Hindi or English and preview it live.",
    },
  ];

  return (
    <section id="features" className="relative z-10 py-20 sm:py-24 border-t border-[color:var(--border)]">
      <SectionHeading
        eyebrow="Features"
        title="Everything you need to repurpose long videos"
        text="Skip the heavy desktop editor. Splitting, 9:16 framing, audio selection and batch export all happen in one place."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px rounded-3xl overflow-hidden border border-[color:var(--border)] bg-[color:var(--border)]">
        {features.map((feat) => {
          const Icon = feat.icon;
          return (
            <div
              key={feat.title}
              className="group relative p-7 sm:p-8 bg-[color:var(--card)] transition-colors duration-300 hover:bg-[color:var(--card-alt)]"
            >
              <div className="w-11 h-11 rounded-xl bg-[color:var(--brand-soft)] border border-[color:var(--brand-line)] text-[color:var(--brand-fg)] flex items-center justify-center mb-5 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:scale-105">
                <Icon className="w-5 h-5" />
              </div>
              <h3 className="font-display text-[17px] font-semibold text-[color:var(--fg)] mb-2">{feat.title}</h3>
              <p className="text-sm text-[color:var(--muted)] leading-relaxed">{feat.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
