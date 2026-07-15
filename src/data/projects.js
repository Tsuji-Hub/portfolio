// Shared project metadata. Home grid + project pages read from here.

// `demo` is the specific thing a visitor can drive on that page. Every project
// has an interactive, so the cards invite the action rather than saying "read".
export const projects = [
  {
    slug: 'makimono',
    title: 'Makimono',
    blurb:
      'A feature-driven fork of Mihon, the open-source Android manga reader. 11 releases, real users, updates itself.',
    tags: ['Kotlin', 'Android', 'Release eng'],
    demo: 'drive the reader',
  },
  {
    slug: 'jarvis',
    title: 'Friday & Jarvis',
    blurb:
      'Two self-hosted voice assistants, architecturally isolated. Friday runs my infrastructure. Jarvis is the one strangers are allowed to talk to.',
    tags: ['LLM tooling', 'Home Assistant', 'Threat modeling'],
    demo: 'try to break it',
  },
  {
    slug: 'homelab',
    title: 'Homelab',
    blurb:
      'A Proxmox node run with production discipline: restore-tested backups, network segmentation, self-healing services.',
    tags: ['Proxmox', 'ZFS', 'Linux ops'],
    demo: 'trace the traffic',
  },
  {
    slug: 'mealie',
    title: 'Mealie fork',
    blurb:
      'A fork of Mealie I build, deploy, and extend, plus an upstream fix for the nutrition data it was poisoning into schema.org output.',
    tags: ['CI/CD', 'Docker', 'Python + Vue'],
    demo: 'see the bug',
  },
  {
    slug: 'cloud-security',
    title: 'Cloud security',
    blurb:
      'Sanitized case studies from cloud security work at a Fortune 500 insurer.',
    tags: ['GCP', 'CSPM', 'SOAR'],
    demo: 'run the timeline',
  },
];
