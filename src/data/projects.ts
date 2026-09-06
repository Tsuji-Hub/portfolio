export type Project = {
  slug: string;
  title: string;
  kicker: string;
  summary: string;
  bullets: string[];
  demonstrates: string;
  stack: string[];
  link?: { href: string; label: string };
  status?: string;
};

/** Content source of truth for /projects/*. Sanitized: no employer name, no hosts, no addresses. */
export const PROJECTS: Project[] = [
  {
    slug: "cloud-security",
    title: "Cloud security, case studies",
    kicker: "Fortune 500 insurer · sanitized",
    summary:
      "Case studies from cloud security work at a Fortune 500 insurer. No employer name, no environment details beyond the tool names.",
    bullets: [
      "Container supply chain: unapproved hardened images were moving toward production. Coordinated vendors and internal teams, stood up a formal image approval process. Gap closed at the source.",
      "Cloud asset governance: 1,100+ GCP projects validated and linked to business applications in the CMDB, 8 new service entries created. Remediation now routes to an owner instead of a mailbox.",
      "SOAR proof of concept: evaluated no-code platforms (Torq, Tines), built workflows that auto-enrich cloud vulnerability alerts, presented to leadership with an adoption roadmap.",
      "Prevention over reaction: turned CSPM findings (Wiz) into GCP Organization Policy constraints that block risky configurations before they exist, and cut weekly metrics reporting from hours to minutes with automation.",
    ],
    demonstrates: "Cloud governance, CSPM operations, SOAR design, ITSM integration, audit-ready documentation.",
    stack: ["GCP", "Wiz", "Torq", "Tines", "ServiceNow", "AquaSec"],
  },
  {
    slug: "makimono",
    title: "Makimono",
    kicker: "Feature-driven fork of Mihon · Kotlin / Android",
    summary:
      "A fork of the open-source Android manga reader that installs alongside stock and updates itself. Eleven releases and counting, with real users.",
    bullets: [
      "Webtoon auto-scroll engine: floating controller, volume-key speed, two-finger toggle, auto pause and resume on touch, chapter-boundary handling.",
      "Similar titles: recommendations merged from five sources (AniList, MyAnimeList, MangaUpdates, MangaDex, Comick), ranked by cross-source agreement.",
      "Discover and For You: tag-based catalog browsing and a personalized feed built from the user's own tracked library.",
      "Reader comments pulled live from three platforms, bulk AniList tracking with a match-review screen, fold-aware reader margins.",
      "Signed release channel with an in-app updater, so nobody sideloads twice.",
    ],
    demonstrates: "Kotlin and Android at feature scale, release engineering, multi-API integration, maintaining a fork against an active upstream.",
    stack: ["Kotlin", "Android", "Compose", "GitHub Releases"],
    link: { href: "https://github.com/Tsuji-Hub/makimono", label: "Releases on GitHub" },
  },
  {
    slug: "homelab",
    title: "Homelab, run like production",
    kicker: "Proxmox VE · ZFS · nftables · Caddy · Netdata",
    summary:
      "A single hypervisor run with production discipline: tested backups, segmented networks, default-deny everywhere, and an infrastructure you can ask questions in English.",
    bullets: [
      "Mirrored ZFS vdevs over RAIDZ: expansion by matched pairs, faster resilver.",
      "Backups are restore-tested. A backup that has never been restored is a hope, not a backup.",
      "Default-deny nftables inside each guest instead of the cluster firewall, so guests stay portable.",
      "Download and indexer traffic lives in a VPN network namespace: apps cannot leak around the tunnel because they have no route that bypasses it.",
      "TLS terminated at a dedicated reverse proxy; services are never exposed directly. systemd recovery units heal the stack after a reboot without a human.",
      "GPU passthrough for hardware transcoding. Netdata monitoring wired into LLM tooling via MCP.",
    ],
    demonstrates: "Virtualization, storage design, network segmentation, backup discipline, Linux operations, AI-augmented ops. Same control mindset as the day job, applied at home.",
    stack: ["Proxmox", "ZFS", "Docker", "nftables", "Caddy", "Netdata", "MCP"],
  },
  {
    slug: "jarvis",
    title: "Jarvis",
    kicker: "Self-hosted voice assistant · in build",
    status: "In build",
    summary:
      "An always-on voice assistant: in-browser wake word, Whisper speech-to-text on a local GPU, an LLM control brain with tool access to my infrastructure, Piper text-to-speech, and a Discord voice interface.",
    bullets: [
      "Two Jarvises by design. The private one knows my infrastructure and can act on it. The public one, which friends reach through Discord, has zero infrastructure knowledge, zero personal context, and exactly three whitelisted capabilities.",
      "The isolation is structural, not textual. A system prompt that says \"don't reveal X\" fails the first time someone says \"ignore your instructions\". The only prompt-injection defense that holds is an agent that does not possess the information or the capability.",
      "Version one got this wrong by inheriting context through a shared integration layer. It was caught in review and redesigned so the public bot talks only to its own tools.",
    ],
    demonstrates: "LLM tool integration, speech pipeline, threat modeling for AI agents, prompt-injection-resistant design, cost engineering (zero-hardware build).",
    stack: ["Home Assistant", "Whisper", "Piper", "Claude", "Discord"],
  },
  {
    slug: "mealie",
    title: "Mealie fork",
    kicker: "Self-hosted recipe platform · Python / Vue",
    summary:
      "A fork of Mealie that I build, deploy, and extend for a nutrition-tracking pipeline. Upstream the generic, fork-carry the opinionated.",
    bullets: [
      "Repaired fork CI: upstream's pipeline was hard-gated to its own repo, built on a paid service, and pushed to a namespace I can't write to. Rewrote it with stock buildx, GHCR publishing, and a dispatch trigger.",
      "Nightly images to GHCR, deployed to the homelab via Portainer.",
      "Backend: nutrition added to the recipe list schema with a batched eager-load instead of an N+1 query.",
      "Frontend: editorial redesign of the recipe UI (image-forward tiles, typographic hierarchy, colored taxonomy tags, dark and light).",
      "Upstream PR #7881: recipe yield display emitted \"0.0\" into schema.org JSON-LD for servings-only recipes, poisoning per-serving data for any consumer. Fix plus parametrized tests.",
    ],
    demonstrates: "CI/CD surgery, container pipelines, Python and Vue across the stack, upstream open-source contribution, running what you build.",
    stack: ["Python", "Vue", "GitHub Actions", "GHCR", "Docker"],
    link: { href: "https://github.com/mealie-recipes/mealie/pull/7881", label: "Upstream PR #7881" },
  },
];
