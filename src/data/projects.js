// Shared project metadata. Home grid + project pages read from here.

export const projects = [
  {
    slug: 'makimono',
    title: 'Makimono',
    blurb:
      'A feature-driven fork of Mihon, the open-source Android manga reader. 11 releases, real users, updates itself.',
    tags: ['Kotlin', 'Android', 'Release eng'],
  },
  {
    slug: 'jarvis',
    title: 'Jarvis',
    blurb:
      'A self-hosted voice assistant with two architecturally isolated brains: one runs my infrastructure, one is safe for strangers to talk to.',
    tags: ['LLM tooling', 'Home Assistant', 'Threat modeling'],
  },
  {
    slug: 'homelab',
    title: 'Homelab',
    blurb:
      'A Proxmox node run with production discipline: restore-tested backups, network segmentation, self-healing services.',
    tags: ['Proxmox', 'ZFS', 'Linux ops'],
  },
  {
    slug: 'mealie',
    title: 'Mealie fork',
    blurb:
      'A fork of Mealie I build, deploy, and extend, plus an upstream fix for the nutrition data it was poisoning into schema.org output.',
    tags: ['CI/CD', 'Docker', 'Python + Vue'],
  },
  {
    slug: 'cloud-security',
    title: 'Cloud security',
    blurb:
      'Sanitized case studies from cloud security work at a Fortune 500 insurer.',
    tags: ['GCP', 'CSPM', 'SOAR'],
  },
];
