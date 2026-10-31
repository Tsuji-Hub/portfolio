// Shared project metadata. Home grid + project pages read from here.

// `demo` is the specific thing a visitor can drive on that page. Every project
// has an interactive, so the cards invite the action rather than saying "read".
export const projects = [
  {
    slug: 'makimono',
    title: 'Makimono',
    blurb:
      'My fork of Mihon, the open-source Android manga reader: 21 releases, and drop rates for 342 titles that tell real quitting from catching up.',
    tags: ['Kotlin', 'Android', 'Statistics'],
    demo: 'read a drop map',
  },
  {
    slug: 'jarvis',
    title: 'Atlas & Jarvis',
    blurb:
      'Two self-hosted voices with a hard trust boundary. Atlas tells me what my homelab needs; Jarvis, the Discord bot my friends talk to, holds no Home Assistant or Seerr credential.',
    tags: ['LLM tooling', 'Home Assistant', 'Threat modeling'],
    demo: 'try to break it',
  },
  {
    slug: 'homelab',
    title: 'Homelab',
    blurb:
      'A Proxmox node run like production: timed restores, a watchdog for anything that goes quiet, probes that repair what is safe to repeat.',
    tags: ['Proxmox', 'ZFS', 'Linux ops'],
    demo: 'run the watchdog',
  },
  {
    slug: 'security',
    title: 'Homelab security',
    blurb:
      'Every control in front of and inside the homelab, tested by attacking it. Four weaknesses my own testing caught, fixed and re-tested.',
    tags: ['CrowdSec', 'OWASP CRS', 'Wazuh', 'nftables'],
    demo: 'see what testing caught',
    // Shown on the home page's full-width security tile. Each line is a
    // recorded result on /projects/security/, not a new claim.
    highlights: [
      'Every guest default-deny on IPv4 and IPv6, re-tested from outside the admin set',
      'OWASP CRS in blocking mode: 8 of 8 attack payloads stopped with 403',
      'Four weaknesses caught by my own testing, all fixed and re-tested',
      '0 secrets in 245 of my commits',
    ],
  },
  {
    slug: 'mealie',
    title: 'Mealie fork',
    blurb:
      'A fork of Mealie I build and run: a fix merged upstream in v3.27.0, a TLS bug in my own scraper found and fixed with tests, and a runtime image slimmed from 147 to 100 Python packages.',
    tags: ['Python + Vue', 'Supply chain', 'Open source'],
    demo: 'see the bug',
  },
  {
    slug: 'cloud-security',
    title: 'Cloud security',
    blurb:
      'Cloud security at a Fortune 500 insurer: GCP governance, Wiz findings routed to owners, SOAR, and prevention through policy.',
    tags: ['GCP', 'CSPM', 'SOAR'],
    demo: 'map the estate',
    // Shown only on the home page's feature tile, which is twice the size of
    // the others and needs more than a one-line blurb. These are the case
    // studies that page actually contains, not new claims.
    highlights: [
      'A 46-control container security RACI, agreed with three teams',
      '1,100+ GCP projects validated and mapped to an owning application',
      'Wiz findings open ServiceNow tickets that already name the owner',
      'Organization Policy recommended to block risky configs at creation',
    ],
  },
];
