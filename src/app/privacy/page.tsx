import type { Metadata } from "next";
import { InfoPage, ExtLink } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Video Cut handles your data: videos are cut in your browser and never uploaded. Covers analytics, cookies, Google AdSense, hosting and contact.",
  alternates: { canonical: "/privacy/" },
};

export default function PrivacyPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Privacy Policy"
      updated="November 20, 2026"
      intro={`This Privacy Policy explains how ${SITE.name} ("we", "us") at videocut.codelove.in handles information when you use the site. In short: your videos are cut on your own device and are never uploaded to us.`}
      sections={[
        {
          heading: "Your videos stay on your device",
          body: [
            "Splitting, trimming, 9:16 Shorts with a blurred background, audio-track picking and ZIP export all run inside your browser, using a WebAssembly build of FFmpeg that is served from this site.",
            "We never receive, store or have access to the videos you open or the clips you make. If you choose to send clips to UTubeFlow, they are passed directly between your browser tabs, not through our servers.",
          ],
        },
        {
          heading: "Information we do not collect",
          body: [
            "Video Cut needs no account, login or personal details.",
            "We do not collect, sell or share the contents of your videos, because we never receive them.",
          ],
        },
        {
          heading: "Analytics",
          body: [
            "We use Google Analytics to count visits and see which pages are used: pages viewed, device and browser type, rough location and how you arrived. It sets cookies to do this. We look at the numbers only in total, not to identify you.",
            "We also run CodeLove Analytics, our own simple visit counter. It sets no cookies; it keeps one random ID in your browser's local storage and records page views, time on page and clicks, counted per day. Your videos are never sent to either service.",
            <>
              You can opt out of Google Analytics with{" "}
              <ExtLink href="https://tools.google.com/dlpage/gaoptout">Google&apos;s opt-out add-on</ExtLink>, or by blocking
              cookies and site data for this site.
            </>,
          ],
        },
        {
          heading: "Advertising",
          body: [
            "We use Google AdSense to show advertisements on this site.",
            "Google and other third-party vendors use cookies to serve ads based on your prior visits to this website or to other websites. Google's use of advertising cookies enables it and its partners to serve ads to you based on your visits to this site and/or other sites on the Internet.",
            <>
              You can opt out of personalised advertising in{" "}
              <ExtLink href="https://adssettings.google.com">Google Ads Settings</ExtLink>, and out of third-party vendors&apos;
              cookies for personalised advertising at <ExtLink href="https://www.aboutads.info">www.aboutads.info</ExtLink>.
            </>,
            <>
              To learn more, see{" "}
              <ExtLink href="https://policies.google.com/technologies/partner-sites">
                How Google uses information from sites or apps that use its services
              </ExtLink>
              .
            </>,
            "Ads do not change how the tool works: your videos are still processed in your browser and never uploaded.",
          ],
        },
        {
          heading: "Local storage",
          body: [
            "Your light or dark theme choice is saved in your browser's local storage so the site looks the same next time. It stays on your device.",
          ],
        },
        {
          heading: "Hosting",
          body: [
            <>
              This site is hosted on GitHub Pages. Like any web host, GitHub may log technical details such as your IP
              address when your browser requests a page. See the{" "}
              <ExtLink href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement">
                GitHub Privacy Statement
              </ExtLink>
              .
            </>,
          ],
        },
        {
          heading: "Changes to this policy",
          body: [
            'We may update this policy when a service described here changes. The "Last updated" date at the top shows the latest revision.',
          ],
        },
        {
          heading: "Contact",
          body: [
            <>
              Questions about this policy? Email{" "}
              <a href={`mailto:${SITE.email}`} className="font-medium text-[color:var(--fg)] underline underline-offset-4">
                {SITE.email}
              </a>
              .
            </>,
          ],
        },
      ]}
    />
  );
}
