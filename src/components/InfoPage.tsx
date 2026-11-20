import type { ReactNode } from "react";

export interface InfoSection {
  heading: string;
  /** One entry per paragraph — plain text, or JSX when a paragraph needs links. */
  body: ReactNode[];
}

/** Shared layout for the About, Contact, Privacy and Terms pages. */
export function InfoPage({
  eyebrow,
  title,
  updated,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated?: string;
  intro: ReactNode;
  sections: InfoSection[];
}) {
  return (
    <div className="mx-auto w-full max-w-3xl py-14 sm:py-16">
      <p className="label">{eyebrow}</p>
      <h1 className="mt-3 font-display text-4xl font-bold tracking-tight text-[color:var(--fg)] sm:text-5xl">{title}</h1>
      {updated ? <p className="mt-4 text-sm text-[color:var(--muted)]">Last updated: {updated}</p> : null}
      <p className="mt-8 text-base leading-relaxed text-[color:var(--muted)]">{intro}</p>
      <div className="mt-10 space-y-10">
        {sections.map((s, i) => (
          <section key={s.heading}>
            <h2 className="font-display text-xl font-bold tracking-tight text-[color:var(--fg)]">
              <span className="mr-2 text-[color:var(--muted)]">{i + 1}.</span>
              {s.heading}
            </h2>
            <div className="mt-3 space-y-3">
              {s.body.map((p, j) => (
                <p key={j} className="text-sm leading-relaxed text-[color:var(--muted)]">
                  {p}
                </p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-[color:var(--fg)] underline underline-offset-4"
    >
      {children}
    </a>
  );
}
