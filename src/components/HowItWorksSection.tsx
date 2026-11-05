import { Upload, SlidersHorizontal, FolderDown } from "lucide-react";
import { SectionHeading } from "./FeaturesSection";
import { HOW_IT_WORKS_STEPS } from "@/lib/content";

export function HowItWorksSection() {
  const icons = [Upload, SlidersHorizontal, FolderDown];
  const steps = HOW_IT_WORKS_STEPS.map((s, i) => ({ ...s, icon: icons[i] }));

  return (
    <section id="how-it-works" className="relative z-10 py-20 sm:py-24 border-t border-[color:var(--border)]">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps, under two minutes"
        text="Turn one long video into a week of short-form content."
      />

      <div className="relative grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Connector line */}
        <div className="hidden md:block absolute top-[52px] left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-[color:var(--brand-line)] to-transparent" />

        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="relative panel p-7 text-center transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <div className="relative mx-auto mb-5 w-12 h-12 rounded-2xl btn-primary flex items-center justify-center">
                <Icon className="w-5 h-5" />
              </div>
              <div className="font-mono text-[11px] font-semibold text-[color:var(--subtle)] mb-1.5">STEP {step.num}</div>
              <h3 className="font-display text-lg font-semibold text-[color:var(--fg)] mb-2">{step.title}</h3>
              <p className="text-sm text-[color:var(--muted)] leading-relaxed">{step.desc}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
