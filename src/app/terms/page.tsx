import type { Metadata } from "next";
import { InfoPage } from "@/components/InfoPage";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms for using Video Cut, the free in-browser video shorts cutter and splitter by CodeLove: acceptable use, your content, no warranty and contact.",
  alternates: { canonical: "/terms/" },
};

export default function TermsPage() {
  return (
    <InfoPage
      eyebrow="Legal"
      title="Terms of Service"
      updated="November 20, 2026"
      intro={`These Terms apply to your use of ${SITE.name} at videocut.codelove.in (the "Service"), made by ${SITE.creator} under ${SITE.brand}. By using the Service you agree to them.`}
      sections={[
        {
          heading: "The Service",
          body: [
            "Video Cut is a free tool that splits videos into parts or 9:16 Shorts inside your browser. There is no account and no paid plan.",
          ],
        },
        {
          heading: "Acceptable use",
          body: [
            "Only cut videos that you own or have permission to use. You are responsible for respecting copyright and the rules of any platform where you post your clips.",
            "Do not try to disrupt the site, overload it or use it for anything unlawful.",
          ],
        },
        {
          heading: "Your content",
          body: [
            "You keep all rights to the videos you open and the clips you make. We claim no ownership, and because processing happens on your device, we never receive your files.",
          ],
        },
        {
          heading: "No warranty",
          body: [
            'The Service is provided "as is" and "as available", without warranties of any kind.',
            "We work to keep it reliable, but we do not guarantee that every video will process without errors. Always keep your original files.",
          ],
        },
        {
          heading: "Limitation of liability",
          body: [
            "To the maximum extent permitted by law, we are not liable for any indirect, incidental or consequential damages, or for any loss of data, arising from your use of the Service.",
          ],
        },
        {
          heading: "Ads and third parties",
          body: [
            "The site shows ads from Google AdSense and links to other websites. We are not responsible for the content of ads or of other sites. See the Privacy Policy for how ads use cookies.",
          ],
        },
        {
          heading: "Changes",
          body: [
            "We may update these Terms from time to time. Using the Service after a change means you accept the updated Terms.",
          ],
        },
        {
          heading: "Contact",
          body: [`Questions about these Terms can be sent to ${SITE.email}.`],
        },
      ]}
    />
  );
}
