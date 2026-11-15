import { SectionHeading } from "./FeaturesSection";

/** The VideoCut walkthrough on the CodeLove YouTube channel. */
export const GUIDE_VIDEO_ID = "vhU1lr_AF-o";

/** "Watch the guide": the full VideoCut walkthrough, embedded from YouTube. */
export function GuideVideoSection() {
  return (
    <section id="guide" className="relative z-10 py-20 sm:py-24 border-t border-[color:var(--border)] scroll-mt-20">
      <SectionHeading
        eyebrow="Video guide"
        title="See VideoCut in two minutes"
        text="Watch a long video become Shorts: load it, pick the parts, add text and music, and send the clips to UTubeFlow for YouTube."
      />
      <div className="panel p-2 sm:p-2.5 max-w-4xl mx-auto">
        <iframe
          className="block w-full aspect-video rounded-xl bg-black"
          src={`https://www.youtube.com/embed/${GUIDE_VIDEO_ID}?rel=0`}
          title="VideoCut guide: cut a long video into YouTube Shorts"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    </section>
  );
}
