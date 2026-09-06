import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

/* Brand marks are not in lucide-react v1; small inline paths instead (no icon font, no CDN). */
const Github = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 .5A11.5 11.5 0 0 0 .5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-2.17c-3.2.7-3.87-1.37-3.87-1.37-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.12 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.27 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12 11.5 11.5 0 0 0 12 .5Z" />
  </svg>
);
const Linkedin = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z" />
  </svg>
);

const LINKS = [
  { href: "/#work", label: "Work" },
  { href: "/projects/homelab", label: "Homelab" },
  { href: "/about", label: "About" },
];

/** Floating glass navbar. Transparent at the top, blurs + tightens once the page scrolls. */
export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          "flex w-full max-w-5xl items-center justify-between rounded-full px-4 py-2 transition-all duration-300",
          scrolled ? "glass-strong shadow-[0_10px_40px_-20px_rgba(0,0,0,0.9)]" : "border border-transparent bg-transparent",
        )}
      >
        <a href="/" className="flex items-center gap-2 pl-1 font-mono text-sm tracking-tight text-ink">
          <span className="inline-block size-2 rounded-full bg-accent shadow-[0_0_12px_rgba(46,230,255,0.9)]" aria-hidden />
          ethan.justice
        </a>

        <ul className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="rounded-full px-3.5 py-1.5 text-sm text-ink-muted transition-colors hover:bg-obsidian-700 hover:text-ink"
              >
                {l.label}
              </a>
            </li>
          ))}
          <li className="ml-1 flex items-center gap-1 border-l border-line pl-2">
            <a href="https://github.com/Tsuji-Hub" aria-label="GitHub" className="rounded-full p-2 text-ink-muted hover:text-ink" rel="me">
              <Github className="size-4" />
            </a>
            <a href="https://www.linkedin.com/in/justice-ethan/" aria-label="LinkedIn" className="rounded-full p-2 text-ink-muted hover:text-ink" rel="me">
              <Linkedin className="size-4" />
            </a>
          </li>
        </ul>

        <button
          type="button"
          className="rounded-full p-2 text-ink md:hidden"
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open && (
        <div id="mobile-menu" className="glass-strong absolute inset-x-4 top-[4.25rem] rounded-2xl p-2 md:hidden">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="block rounded-xl px-4 py-3 text-ink-muted hover:bg-obsidian-700 hover:text-ink" onClick={() => setOpen(false)}>
              {l.label}
            </a>
          ))}
          <div className="mt-1 flex gap-1 border-t border-line pt-2">
            <a href="https://github.com/Tsuji-Hub" className="flex items-center gap-2 rounded-xl px-4 py-3 text-ink-muted hover:text-ink"><Github className="size-4" /> GitHub</a>
            <a href="https://www.linkedin.com/in/justice-ethan/" className="flex items-center gap-2 rounded-xl px-4 py-3 text-ink-muted hover:text-ink"><Linkedin className="size-4" /> LinkedIn</a>
          </div>
        </div>
      )}
    </header>
  );
}
