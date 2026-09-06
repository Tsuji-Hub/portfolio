import { useEffect, useRef } from "react";

/**
 * Animated node graph of a homelab topology. Purposeful, not decorative:
 * the nodes are the real roles in the stack (sanitized: no hosts, no addresses).
 * Pulses travel along edges to suggest traffic. Static frame under reduced motion.
 */
type Node = { id: string; label: string; x: number; y: number; r: number; hub?: boolean; vx: number; vy: number; bx: number; by: number };
type Edge = [string, string];

const LAYOUT: Omit<Node, "vx" | "vy" | "bx" | "by">[] = [
  { id: "pve", label: "hypervisor", x: 0.5, y: 0.5, r: 7, hub: true },
  { id: "zfs", label: "zfs mirrors", x: 0.5, y: 0.86, r: 5 },
  { id: "media", label: "media vm · gpu", x: 0.2, y: 0.28, r: 5 },
  { id: "docker", label: "docker lxc", x: 0.78, y: 0.3, r: 5 },
  { id: "vpn", label: "vpn netns", x: 0.9, y: 0.55, r: 4 },
  { id: "proxy", label: "tls proxy", x: 0.16, y: 0.68, r: 4 },
  { id: "req", label: "requests", x: 0.76, y: 0.76, r: 4 },
  { id: "mon", label: "monitoring", x: 0.3, y: 0.9, r: 4 },
  { id: "llm", label: "llm · mcp", x: 0.08, y: 0.48, r: 4 },
  { id: "dash", label: "dashboard", x: 0.34, y: 0.1, r: 3.5 },
  { id: "bak", label: "nightly backups", x: 0.66, y: 0.94, r: 3.5 },
];

const EDGES: Edge[] = [
  ["pve", "zfs"], ["pve", "media"], ["pve", "docker"], ["pve", "proxy"], ["pve", "req"],
  ["pve", "mon"], ["pve", "dash"], ["docker", "vpn"], ["proxy", "media"], ["proxy", "req"],
  ["req", "docker"], ["mon", "llm"], ["zfs", "bak"], ["media", "zfs"], ["docker", "zfs"],
];

export default function TopologyCanvas({ className = "" }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const accent = "46, 230, 255";

    const nodes: Node[] = LAYOUT.map((n) => ({ ...n, bx: n.x, by: n.y, vx: 0, vy: 0 }));
    const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
    const pulses = EDGES.map((_, i) => ({ edge: i, t: Math.random(), speed: 0.0018 + Math.random() * 0.0022 }));

    let w = 0, h = 0, dpr = 1, raf = 0, t0 = performance.now();

    const px = (n: Node) => ({ x: n.x * w, y: n.y * h });

    const draw = (now: number) => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, w, h);

      // gentle drift around each node's home position
      if (!reduce) {
        for (const n of nodes) {
          const k = n.hub ? 0.004 : 0.012;
          n.x = n.bx + Math.sin(t * 0.6 + n.bx * 9) * k;
          n.y = n.by + Math.cos(t * 0.5 + n.by * 7) * k;
        }
      }

      // edges
      ctx.lineWidth = 1;
      for (const [a, b] of EDGES) {
        const A = px(byId[a]!), B = px(byId[b]!);
        ctx.strokeStyle = `rgba(${accent}, 0.14)`;
        ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke();
      }

      // pulses along edges
      if (!reduce) {
        for (const p of pulses) {
          p.t += p.speed; if (p.t > 1) p.t = 0;
          const [a, b] = EDGES[p.edge]!;
          const A = px(byId[a]!), B = px(byId[b]!);
          const x = A.x + (B.x - A.x) * p.t, y = A.y + (B.y - A.y) * p.t;
          const g = ctx.createRadialGradient(x, y, 0, x, y, 8);
          g.addColorStop(0, `rgba(${accent}, 0.9)`); g.addColorStop(1, `rgba(${accent}, 0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.fill();
        }
      }

      // nodes
      for (const n of nodes) {
        const P = px(n);
        const halo = ctx.createRadialGradient(P.x, P.y, 0, P.x, P.y, n.r * 4);
        halo.addColorStop(0, `rgba(${accent}, ${n.hub ? 0.35 : 0.18})`); halo.addColorStop(1, `rgba(${accent}, 0)`);
        ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(P.x, P.y, n.r * 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = n.hub ? `rgb(${accent})` : "#e8ebef";
        ctx.beginPath(); ctx.arc(P.x, P.y, n.r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "rgba(141,149,161,0.95)";
        ctx.font = `500 11px ui-monospace, "JetBrains Mono Variable", monospace`;
        ctx.textBaseline = "middle";
        const tx = P.x + n.r + 8;
        ctx.textAlign = tx + 90 > w ? "right" : "left";
        ctx.fillText(n.label, tx + 90 > w ? P.x - n.r - 8 : tx, P.y);
      }

      if (!reduce) raf = requestAnimationFrame(draw);
    };

    // Setting canvas.width clears the bitmap, so under reduced motion (no animation loop)
    // every resize must redraw the static frame itself.
    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (reduce) draw(performance.now());
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (!reduce) raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, []);

  return (
    <canvas
      ref={ref}
      role="img"
      aria-label="Animated diagram of a self-hosted homelab: hypervisor at the center linked to storage, media, containers, VPN, proxy, monitoring, and backups."
      className={className}
    />
  );
}
