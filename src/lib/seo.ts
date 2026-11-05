import { SITE, OG_IMAGE } from "@/lib/site";
import { FAQS, FEATURE_LIST, HOW_IT_WORKS_STEPS } from "@/lib/content";

/** Same @ids every CodeLove site uses, so Google links all sites to one organisation and founder. */
const ORG_ID = `${SITE.brandUrl}/#organization`;
const PERSON_ID = "https://gowtham.codelove.in/#person";
const WEBSITE_ID = `${SITE.url}/#website`;
const APP_ID = `${SITE.url}/#app`;

/** Absolute URL for a site path. The export uses trailing slashes (`/about` -> `/about/`). */
export function absoluteUrl(path: string): string {
  if (path === "/" || path === "") return `${SITE.url}/`;
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${SITE.url}${clean.endsWith("/") ? clean : `${clean}/`}`;
}

/* ------------------------------------------------------------------ */
/*  JSON-LD builders: every value mirrors content visible on the page */
/* ------------------------------------------------------------------ */

/** Site-wide graph: the WebSite and its publisher, CodeLove. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": ORG_ID,
        name: SITE.brand,
        url: SITE.brandUrl,
        founder: { "@id": PERSON_ID },
      },
      {
        "@type": "WebSite",
        "@id": WEBSITE_ID,
        url: `${SITE.url}/`,
        name: SITE.name,
        alternateName: [`VideoCut by ${SITE.brand}`, `${SITE.brand} Video Cutter`, "videocut.codelove.in"],
        description: SITE.description,
        inLanguage: "en",
        publisher: { "@id": ORG_ID },
      },
    ],
  };
}

/** Home page graph: the web app, its visible 3 steps and its visible FAQ. */
export function homeJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": APP_ID,
        name: SITE.name,
        alternateName: "VideoCut",
        url: `${SITE.url}/`,
        description: SITE.description,
        image: `${SITE.url}${OG_IMAGE.url}`,
        applicationCategory: "MultimediaApplication",
        applicationSubCategory: "Video Editor",
        operatingSystem: "Any",
        browserRequirements: "Requires JavaScript and a modern web browser.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        featureList: [...FEATURE_LIST],
        inLanguage: "en",
        isPartOf: { "@id": WEBSITE_ID },
        publisher: { "@id": ORG_ID },
        creator: { "@id": PERSON_ID },
      },
      {
        "@type": "HowTo",
        name: "How to cut a video into parts or 9:16 Shorts online",
        totalTime: "PT2M",
        tool: { "@type": "HowToTool", name: SITE.name },
        step: HOW_IT_WORKS_STEPS.map((s, i) => ({
          "@type": "HowToStep",
          position: i + 1,
          name: s.title,
          text: s.desc,
          url: `${SITE.url}/#how-it-works`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };
}
