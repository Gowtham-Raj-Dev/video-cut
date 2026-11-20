import type { Metadata } from "next";
import { InfoPage, ExtLink } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "About Video Cut",
  description:
    "About Video Cut, the free video shorts cutter by CodeLove: what it does, why it runs in your browser, and who makes it.",
  alternates: { canonical: "/about/" },
};

export default function AboutPage() {
  return (
    <InfoPage
      eyebrow="About"
      title="About Video Cut"
      intro={`${SITE.name} is a free tool for cutting long videos into equal parts or vertical 9:16 Shorts and Reels. It is part of ${SITE.brand}, a set of free web tools made by one developer.`}
      sections={[
        {
          heading: "What it does",
          body: [
            "Open an MP4, MKV, MOV or WebM file, choose how long each part should be, and Video Cut splits it for you. For Shorts it can turn landscape video into 9:16 with a blurred background, crop or letterbox, and for multi-audio files you can pick the audio language.",
            "When it is done you download every clip at once as a ZIP, with no watermark.",
          ],
        },
        {
          heading: "Why it runs in your browser",
          body: [
            "Video Cut uses a WebAssembly build of FFmpeg that runs on your own computer or phone. Your videos are never uploaded, so there is no waiting for uploads, no file-size fee and nothing for us to store.",
          ],
        },
        {
          heading: "Works with UTubeFlow",
          body: [
            <>
              Clips can go straight to{" "}
              <ExtLink href="https://utubeflow.codelove.in">UTubeFlow</ExtLink>, CodeLove&apos;s free YouTube automation
              tool, to schedule them as Shorts.
            </>,
          ],
        },
        {
          heading: "Who makes it",
          body: [
            <>
              Video Cut is designed and built by <ExtLink href={SITE.creatorUrl}>{SITE.creator}</ExtLink>, a solo
              developer from India, as part of <ExtLink href={SITE.brandUrl}>CodeLove</ExtLink>. The site is paid for
              by ads, so the tool stays free.
            </>,
            <>
              Ideas, bugs or feedback? See the <a href="/contact/" className="font-medium text-[color:var(--fg)] underline underline-offset-4">contact page</a>.
            </>,
          ],
        },
      ]}
    />
  );
}
