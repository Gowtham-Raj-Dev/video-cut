"use client";

import { useEffect, useState } from "react";
import { Scissors } from "lucide-react";
import { SITE, NAV_LINKS } from "@/lib/site";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`site-chrome sticky top-0 z-50 w-full transition-all duration-300 ${
        scrolled
          ? "border-b border-[color:var(--border)] bg-[color:var(--bg)]/80 backdrop-blur-xl shadow-[var(--shadow-sm)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <a href="/" className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl btn-primary flex items-center justify-center transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-105">
            <Scissors className="w-[18px] h-[18px]" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="font-display font-bold text-[17px] tracking-tight text-[color:var(--fg)]">
              Video<span className="text-gradient">Cut</span>
            </span>
            <span className="text-[10px] font-medium text-[color:var(--subtle)] mt-0.5">by {SITE.brand}</span>
          </div>
        </a>

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 p-1 rounded-full">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-[color:var(--muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--card-alt)] transition-colors"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />

          <a href="#studio" className="hidden sm:inline-flex btn btn-primary h-9 px-4 text-[13px]">
            Start cutting
          </a>
        </div>
      </div>
    </header>
  );
}
