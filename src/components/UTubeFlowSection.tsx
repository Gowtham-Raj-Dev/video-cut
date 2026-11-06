import { ArrowRight, CalendarClock, ExternalLink, Link2, Scissors, Send } from "lucide-react";
import { SectionHeading } from "./FeaturesSection";
import { UTUBEFLOW_URL } from "@/lib/embed";

/** "Works with UTubeFlow": cut here, then send the clips straight to UTubeFlow to upload and schedule on YouTube. */
export function UTubeFlowSection() {
  const steps = [
    {
      icon: Link2,
      title: "Connect UTubeFlow",
      desc: "Load your video, then press Connect UTubeFlow in the bar at the bottom. UTubeFlow opens in a new tab and links to VideoCut.",
    },
    {
      icon: Scissors,
      title: "Cut into parts or Shorts",
      desc: "Pick equal parts or 30-second 9:16 Shorts, choose the audio language, and preview every clip.",
    },
    {
      icon: Send,
      title: "Send to UTubeFlow",
      desc: "One click sends every clip, already titled Part 1, Part 2…, straight into your UTubeFlow upload list.",
    },
    {
      icon: CalendarClock,
      title: "Upload & schedule",
      desc: "UTubeFlow uploads them to your YouTube channel and schedules one per day, or whenever you like.",
    },
  ];

  return (
    <section id="utubeflow" className="relative z-10 py-20 sm:py-24 border-t border-[color:var(--border)]">
      <SectionHeading
        eyebrow="Works with UTubeFlow"
        title="Cut here, schedule on YouTube there"
        text="Connect VideoCut to UTubeFlow, our free YouTube bulk uploader and scheduler. Your clips go from cutting to a scheduled YouTube upload without downloading a single file."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, i) => {
          const Icon = step.icon;
          return (
            <div key={step.title} className="panel p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl btn-primary flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px]" />
                </div>
                <span className="font-mono text-[11px] font-semibold text-[color:var(--subtle)]">STEP {i + 1}</span>
              </div>
              <h3 className="font-display text-base font-semibold text-[color:var(--fg)] mb-1.5">{step.title}</h3>
              <p className="text-sm text-[color:var(--muted)] leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="mt-6 panel p-5 sm:p-6 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="font-display font-semibold text-[color:var(--fg)]">Already using UTubeFlow?</div>
          <p className="text-sm text-[color:var(--muted)] leading-relaxed mt-1">
            Press <b className="text-[color:var(--fg)]">Cut into Shorts</b> or <b className="text-[color:var(--fg)]">Cut into parts</b> on its
            Upload page. VideoCut opens right inside UTubeFlow, and the clips land in your list when you are done.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a href="#studio" className="btn btn-primary h-11 px-5 text-sm">
            <Scissors className="w-4 h-4" />
            Start cutting
            <ArrowRight className="w-4 h-4" />
          </a>
          <a href={UTUBEFLOW_URL} target="_blank" rel="noopener" className="btn btn-secondary h-11 px-5 text-sm">
            Open UTubeFlow
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
