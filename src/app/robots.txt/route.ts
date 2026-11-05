import { SITE } from "@/lib/site";

export const dynamic = "force-static";

/** AI and search crawlers we explicitly welcome. */
const WELCOME_BOTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Google-Extended",
  "Bingbot",
];

export function GET() {
  const body = [
    `# ${SITE.name} (${SITE.url}) is updated often.`,
    "# All pages are open to crawl — search engines and AI crawlers are welcome.",
    "",
    "User-agent: *",
    "Allow: /",
    "",
    ...WELCOME_BOTS.flatMap((bot) => [`User-agent: ${bot}`, "Allow: /", ""]),
    `Sitemap: ${SITE.url}/sitemap.xml`,
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
