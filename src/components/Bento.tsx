import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowUpRight, Cloud, Server, Smartphone, Mic, Utensils, ShieldCheck, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

gsap.registerPlugin(ScrollTrigger);

type Tile = {
  href?: string;
  title: string;
  blurb: string;
  tags: string[];
  icon: React.ReactNode;
  span?: string;
  accent?: boolean;
};

const TILES: Tile[] = [
  {
    href: "/projects/cloud-security",
    title: "Cloud security, case studies",
    blurb: "Container supply chain gap closed at the source. 1,100+ GCP projects brought under CMDB governance. SOAR proof of concept that auto-enriches alerts. Sanitized, no employer name.",
    tags: ["GCP", "Wiz", "Torq / Tines", "ServiceNow"],
    icon: <Cloud />,
    span: "md:col-span-2 md:row-span-2",
    accent: true,
  },
  {
    href: "/projects/makimono",
    title: "Makimono",
    blurb: "Feature-driven Android fork of Mihon: auto-scroll engine, five-source recommendations, signed in-app updates. 11 releases, real users.",
    tags: ["Kotlin", "Android", "Release eng"],
    icon: <Smartphone />,
  },
  {
    href: "/projects/homelab",
    title: "Homelab, run like production",
    blurb: "Mirrored ZFS with restore-tested backups, default-deny firewalls in every guest, VPN network namespaces, TLS proxy, monitoring wired to LLM tooling.",
    tags: ["Proxmox", "ZFS", "nftables", "MCP"],
    icon: <Server />,
  },
  {
    href: "/projects/jarvis",
    title: "Jarvis",
    blurb: "Self-hosted voice assistant with two isolated brains: one that knows my infrastructure, one that provably cannot. Prompt injection handled by architecture, not prompts.",
    tags: ["Home Assistant", "Whisper", "LLM tools"],
    icon: <Mic />,
  },
  {
    href: "/projects/mealie",
    title: "Mealie fork",
    blurb: "Repaired fork CI, nightly GHCR images, an editorial UI redesign, and an upstream bugfix PR with tests. Upstream the generic, fork-carry the opinionated.",
    tags: ["Python", "Vue", "GHCR", "OSS"],
    icon: <Utensils />,
  },
  {
    title: "This site",
    blurb: "Static, self-hosted fonts, zero third-party requests, hashed CSP, motion gated on reduced-motion. The portfolio is also the exhibit.",
    tags: ["Astro", "CSP A+"],
    icon: <Lock />,
  },
];

export default function Bento() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-card]").forEach((el, i) => {
          gsap.to(el, {
            opacity: 1,
            y: 0,
            duration: 0.8,
            ease: "power3.out",
            delay: (i % 3) * 0.08,
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          });
        });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-card]", { opacity: 1, y: 0 });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section id="work" ref={root} className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
      <div className="mb-10 flex items-end justify-between gap-6">
        <div>
          <p className="label mb-3">Selected work</p>
          <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">Things I built, and what they prove.</h2>
        </div>
        <ShieldCheck className="hidden size-8 text-accent md:block" aria-hidden />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[minmax(190px,auto)]">
        {TILES.map((t) => {
          const inner = (
            <Card
              data-card
              className={cn(
                "bento-card group relative flex h-full flex-col justify-between overflow-hidden",
                t.accent && "bg-gradient-to-br from-obsidian-700 to-obsidian-900",
              )}
            >
              <CardContent className="flex h-full flex-col p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="flex size-9 items-center justify-center rounded-full border border-line bg-obsidian-900 text-accent [&_svg]:size-4">
                    {t.icon}
                  </span>
                  {t.href && (
                    <ArrowUpRight className="size-4 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-accent" aria-hidden />
                  )}
                </div>
                <CardTitle className={cn(t.accent && "text-2xl md:text-3xl")}>{t.title}</CardTitle>
                <CardDescription className={cn("mt-3", t.accent && "max-w-lg text-base")}>{t.blurb}</CardDescription>
                <ul className="mt-auto flex flex-wrap gap-1.5 pt-6">
                  {t.tags.map((tag) => (
                    <li key={tag} className="rounded-full border border-line px-2.5 py-1 font-mono text-[11px] text-ink-muted">
                      {tag}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
          return t.href ? (
            <a key={t.title} href={t.href} className={cn("block rounded-xl2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60", t.span)}>
              {inner}
            </a>
          ) : (
            <div key={t.title} className={t.span}>{inner}</div>
          );
        })}
      </div>
    </section>
  );
}
