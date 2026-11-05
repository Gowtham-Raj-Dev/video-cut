"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { SectionHeading } from "./FeaturesSection";
import { FAQS } from "@/lib/content";

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = FAQS;

  return (
    <section id="faq" className="relative z-10 py-20 sm:py-24 border-t border-[color:var(--border)]">
      <SectionHeading
        eyebrow="FAQ"
        title="Frequently asked questions"
        text="Everything about cutting, audio tracks and converting videos for Shorts."
      />

      <div className="max-w-3xl mx-auto panel !rounded-3xl divide-y divide-[color:var(--border)] overflow-hidden">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="w-full px-5 sm:px-6 py-5 text-left flex items-center justify-between gap-4 hover:bg-[color:var(--card-alt)] transition-colors"
              >
                <span className="font-display font-semibold text-[15px] text-[color:var(--fg)]">{faq.q}</span>
                <span
                  className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all duration-300 ${
                    isOpen
                      ? "rotate-45 bg-[color:var(--brand)] border-[color:var(--brand)] text-white"
                      : "border-[color:var(--border-strong)] text-[color:var(--muted)]"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </span>
              </button>

              <div className="accordion" data-open={isOpen}>
                <div>
                  <p className="px-5 sm:px-6 pb-5 -mt-1 text-sm text-[color:var(--muted)] leading-relaxed max-w-[62ch]">{faq.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
