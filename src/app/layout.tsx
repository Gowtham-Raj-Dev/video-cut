import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";
import { SITE, OG_IMAGE } from "@/lib/site";
import { siteJsonLd } from "@/lib/seo";
import { EMBED_BOOT_SCRIPT } from "@/lib/embed";

// Body: Geist (clean, neutral UI text). Headings: Bricolage Grotesque (characterful display).
// Timecodes & numbers: Geist Mono.
const body = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const heading = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const code = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-code",
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    // <=60 chars: fits Google's title width and leads with target head queries
    default: "Video Cut — Free Video Shorts Cutter & Splitter",
    template: `%s | VideoCut`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  authors: [{ name: SITE.creator, url: SITE.creatorUrl }],
  creator: SITE.creator,
  publisher: SITE.brand,
  category: "multimedia",
  formatDetection: { telephone: false, email: false, address: false },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "video cut",
    "videocut",
    "video shorts cutter",
    "free video shorts cutter",
    "video cutter online",
    "free video cutter",
    "youtube shorts cutter",
    "split video into parts",
    "split video into 2 parts",
    "cut video into equal parts",
    "cut video into 30 second clips",
    "video splitter online free",
    "convert video to 9:16",
    "landscape to shorts converter",
    "blur background shorts",
    "youtube shorts maker",
    "reels splitter",
    "cut long video into shorts",
    "extract tamil audio from mkv",
    "multi audio video cutter",
    "free video splitter no watermark",
    "codelove",
    "codelove video cut",
  ],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE.name,
    title: "Video Cut — Free Video Shorts Cutter & Online Splitter",
    description: SITE.description,
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Video Cut — Free Video Shorts Cutter & Online Splitter",
    description: SITE.description,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${body.variable} ${heading.variable} ${code.variable}`}
    >
      <head>
        <link rel="sitemap" type="application/xml" href="https://videocut.codelove.in/sitemap.xml" />
        {/* Google Analytics 4 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-65L0LB1CJT" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-65L0LB1CJT');
            `,
          }}
        />
        {/* Embedded in UTubeFlow? Mark <html data-embed> before paint so the site chrome is hidden without a flash. */}
        <script dangerouslySetInnerHTML={{ __html: EMBED_BOOT_SCRIPT }} />
        {/* CodeLove Analytics (admin.codelove.in) */}
        <script defer src="https://admin.codelove.in/t.js" />
      </head>
      <body className="min-h-screen flex flex-col font-sans bg-[color:var(--bg)] text-[color:var(--fg)]">
        <JsonLd data={siteJsonLd()} />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <a
            href="#main"
            className="site-chrome sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[color:var(--fg)] focus:px-4 focus:py-2 focus:text-[color:var(--bg)]"
          >
            Skip to content
          </a>
          <Header />
          <main id="main" className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
