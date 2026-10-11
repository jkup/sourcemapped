import { readFileSync } from 'node:fs';

// Resolve against this module, not cwd: this also works in an installed tarball.
const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
  name: string;
  version: string;
};

export const VERSION = manifest.version;
export const USER_AGENT = `${manifest.name}/${VERSION} (+https://github.com/jkup/sourcemapped)`;
