import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowDown, FileText } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import TopologyCanvas from "@/components/TopologyCanvas";

/** Split-screen hero: typographic hook left, live topology canvas right. Staggered reveal on load. */
export default function Hero() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.to("[data-reveal]", {
          opacity: 1,
          y: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.09,
          delay: 0.1,
        });
        gsap.fromTo(
          "[data-canvas]",
          { opacity: 0, scale: 0.98 },
          { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out", delay: 0.4 },
        );
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-reveal], [data-canvas]", { opacity: 1, y: 0, scale: 1 });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative mx-auto grid min-h-[92dvh] max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-28 pb-16 md:grid-cols-12 md:pt-32">
      <div className="md:col-span-7">
        <p data-reveal className="label mb-6">
          Cloud Security Analyst · GRC · Security Automation
        </p>
        <h1 data-reveal className="text-balance text-5xl font-semibold leading-[1.02] tracking-[-0.03em] md:text-7xl">
          I govern cloud environments by day, and run my own{" "}
          <span className="text-accent text-glow">like production</span> by night.
        </h1>
        <p data-reveal className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
          Ethan Justice. Cloud security at a Fortune 500 insurer: governance, risk-based controls,
          and the automation that keeps environments configured right. Off the clock: a Proxmox homelab,
          an Android fork with real users, and an upstream contributor's habit.
        </p>
        <div data-reveal className="mt-9 flex flex-wrap items-center gap-3">
          <ButtonLink href="#work" variant="accent" size="lg">
            See the work <ArrowDown />
          </ButtonLink>
          <ButtonLink href="/resume.pdf" variant="outline" size="lg">
            <FileText /> Resume
          </ButtonLink>
        </div>
        <dl data-reveal className="mt-12 grid grid-cols-2 gap-x-8 gap-y-5 font-mono text-sm sm:grid-cols-4">
          {[
            ["1,100+", "GCP projects governed"],
            ["11", "releases shipped"],
            ["13", "containers, tested restores"],
            ["5th / 160", "DOE CyberForce"],
          ].map(([n, l]) => (
            <div key={l}>
              <dt className="text-2xl text-ink">{n}</dt>
              <dd className="mt-1 text-xs uppercase tracking-[0.12em] text-ink-faint">{l}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div data-canvas className="relative md:col-span-5">
        <div className="glass rounded-xl2 relative aspect-[4/5] w-full overflow-hidden md:aspect-[5/6]">
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
            <span className="label">homelab · live topology</span>
            <span className="flex items-center gap-1.5 font-mono text-[11px] text-ink-faint">
              <span className="size-1.5 rounded-full bg-accent shadow-[0_0_10px_rgba(46,230,255,0.9)]" aria-hidden />
              sanitized
            </span>
          </div>
          <TopologyCanvas className="absolute inset-0 h-full w-full" />
        </div>
      </div>
    </section>
  );
}
