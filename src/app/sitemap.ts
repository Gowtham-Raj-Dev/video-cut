import fs from "node:fs";
import path from "node:path";
import { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/seo";

export const dynamic = "force-static";

/**
 * Every public page under src/app, found at build time, so new pages land in
 * the sitemap automatically. Skips private (`_x`), dynamic (`[x]`), route-group
 * (`(x)`) and non-page folders such as `robots.txt` or `api`.
 */
function findPagePaths(dir: string, route = ""): string[] {
  const found: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some((e) => e.isFile() && /^page\.(tsx|ts|jsx|js|mdx)$/.test(e.name))) {
    found.push(route || "/");
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (/^[_[(@]/.test(e.name) || e.name.includes(".") || e.name === "api") continue;
    found.push(...findPagePaths(path.join(dir, e.name), `${route}/${e.name}`));
  }
  return found;
}

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const paths = findPagePaths(path.join(process.cwd(), "src", "app")).sort((a, b) =>
    a === "/" ? -1 : b === "/" ? 1 : a.localeCompare(b),
  );

  return paths.map((p) => ({
    url: absoluteUrl(p),
    lastModified,
    changeFrequency: "daily" as const,
    priority: 1.0,
  }));
}
