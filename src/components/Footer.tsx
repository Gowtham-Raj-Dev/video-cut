import { Scissors, ShieldCheck, Zap, ArrowUpRight, Mail } from "lucide-react";
import { HeartButton } from "@/components/HeartButton";
import { ContactLinks, CONTACT_EMAIL } from "@/components/ContactLinks";
import { SITE, FOOTER_LINKS, NETWORK_LINKS, MORE_VIDEO_TOOLS } from "@/lib/site";

const linkCls =
  "group inline-flex items-center gap-1 text-sm text-[color:var(--muted)] transition-colors hover:text-[color:var(--fg)]";

export function Footer() {
  return (
    <footer className="site-chrome relative z-10 w-full border-t border-[color:var(--border)] bg-[color:var(--bg-alt)]">
      {/* Soft brand line along the top edge */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color:var(--brand-line)] to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Top: brand + link columns */}
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Brand */}
          <div className="max-w-sm sm:col-span-2 lg:col-span-1">
            <a href="#" className="inline-flex items-center gap-2.5 group">
              <span className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-8deg]">
                <Scissors className="w-[18px] h-[18px]" />
              </span>
              <span className="font-display font-bold text-lg tracking-tight text-[color:var(--fg)]">
                Video<span className="text-gradient">Cut</span> Studio
              </span>
            </a>
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              Cut long videos into equal parts or vertical 9:16 Shorts with a blurred background, pick the audio
              language, and download everything as one ZIP. Free, private, no watermark.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> 100% Private
              </span>
              <span className="chip">
                <Zap className="h-3.5 w-3.5 text-amber-500" /> No uploads
              </span>
            </div>
          </div>

          <FooterCol title="Product" links={FOOTER_LINKS.Product} />
          <FooterCol title="More video tools" links={MORE_VIDEO_TOOLS} />

          <div>
            <h3 className="label !text-[color:var(--fg)]">Get in touch</h3>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a href={`mailto:${CONTACT_EMAIL}`} className={linkCls}>
                  <Mail className="w-3.5 h-3.5" /> Email us
                </a>
              </li>
              <li>
                <a href="https://gowtham.codelove.in" target="_blank" rel="noopener noreferrer" className={linkCls}>
                  About the maker
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </a>
              </li>
              <li>
                <a href={SITE.brandUrl} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  CodeLove home
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* CodeLove network: full-width multi-column row, same as every CodeLove site */}
        <div className="mt-12 grid gap-10 border-t border-[color:var(--border)] pt-8 lg:grid-cols-[1fr_auto] lg:items-start">
          <nav aria-label="CodeLove network">
            <h3 className="label !text-[color:var(--fg)]">CodeLove network</h3>
            <ul className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3 lg:grid-cols-4">
              {NETWORK_LINKS.map((l) => (
                <li key={l.href}>
                  <a href={l.href} title={l.title} target="_blank" rel="noopener" className={linkCls}>
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="max-w-[260px] lg:justify-self-end">
            <a
              href="https://codelove.in"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="CodeLove — codelove.in"
              className="block w-fit shrink-0 transition-opacity hover:opacity-85"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/codelove/codelove-footer-on-light.png"
                alt="CodeLove"
                width={704}
                height={144}
                loading="lazy"
                className="h-12 w-auto [.dark_&]:hidden"
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/codelove/codelove-footer-on-dark.png"
                alt="CodeLove"
                width={704}
                height={144}
                loading="lazy"
                className="hidden h-12 w-auto [.dark_&]:block"
              />
            </a>
            {/* What CodeLove is, in one line — same text on every CodeLove site. */}
            <p className="mt-4 text-sm leading-relaxed text-[color:var(--muted)]">
              CodeLove makes free web tools, apps and games for creators, students and developers — simple to use, no
              hidden fees.
            </p>
          </div>
        </div>

        {/* Credit line */}
        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-[color:var(--border)] pt-6 text-sm text-[color:var(--muted)] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
          <p className="inline-flex items-center gap-1.5 flex-wrap justify-center">
            Built with <HeartButton /> by{" "}
            <a
              href="https://gowtham.codelove.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[color:var(--fg)] transition-colors hover:text-[color:var(--brand-fg)]"
            >
              Gowtham
            </a>
            <span className="opacity-50 hidden sm:inline">•</span>
            <a
              href="https://codelove.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-[color:var(--fg)] transition-colors hover:text-[color:var(--brand-fg)]"
            >
              CodeLove
            </a>
            <span className="opacity-50">•</span>
            <ContactLinks className="text-[color:var(--fg)]" />
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: readonly { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="label !text-[color:var(--fg)]">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => {
          const external = l.href.startsWith("http");
          return (
            <li key={l.href + l.label}>
              <a
                href={l.href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className={linkCls}
              >
                {l.label}
                {external && (
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
