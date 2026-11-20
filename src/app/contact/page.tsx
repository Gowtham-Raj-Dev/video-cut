import type { Metadata } from "next";
import { InfoPage, ExtLink } from "@/components/InfoPage";
import { CONTACT_EMAIL, WHATSAPP_URL } from "@/components/ContactLinks";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact the maker of Video Cut: email or WhatsApp for questions, bug reports, feature ideas and partnerships.",
  alternates: { canonical: "/contact/" },
};

const mail = (addr: string) => (
  <a href={`mailto:${addr}`} className="font-medium text-[color:var(--fg)] underline underline-offset-4">
    {addr}
  </a>
);

export default function ContactPage() {
  return (
    <InfoPage
      eyebrow="Contact"
      title="Contact us"
      intro={`${SITE.name} is made by ${SITE.creator}. Messages go straight to him.`}
      sections={[
        {
          heading: "Email",
          body: [
            <>Questions, bug reports and feature ideas: {mail(CONTACT_EMAIL)}</>,
            <>General support for all CodeLove tools: {mail(SITE.email)}</>,
          ],
        },
        {
          heading: "WhatsApp",
          body: [
            <>
              For a quick chat, message on <ExtLink href={WHATSAPP_URL}>WhatsApp</ExtLink>.
            </>,
          ],
        },
        {
          heading: "Reporting a bug",
          body: [
            "Tell us the browser and device you used, the video format (MP4, MKV, MOV…) and what happened. A screenshot helps. Please don't send the video itself unless we ask.",
          ],
        },
      ]}
    />
  );
}
