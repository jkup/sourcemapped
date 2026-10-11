// Check local Markdown file links without fetching URLs or adding a parser dependency.
// Deliberately limited to file existence; fragments/remote URLs need ordinary review.
import { readdir, readFile, stat } from 'node:fs/promises';
import { dirname, join, resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
async function markdownFiles(directory, recursive = true) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && recursive) files.push(...await markdownFiles(path));
    else if (entry.isFile() && entry.name.endsWith('.md')) files.push(path);
  }
  return files;
}
const files = [
  ...await markdownFiles(root, false),
  ...await markdownFiles(join(root, 'docs')),
  ...await markdownFiles(join(root, 'research')),
];
let checked = 0;
const failures = [];
for (const file of files) {
  const content = await readFile(file, 'utf8');
  for (const match of content.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^[a-z][a-z\d+.-]*:|^#|^\/\//i.test(target)) continue;
    const path = resolve(dirname(file), decodeURIComponent(target.split('#')[0]));
    try {
      if (!(await stat(path)).isFile()) throw new Error('Not a file');
      checked++;
    } catch {
      failures.push(`${relative(root, file)}: missing file ${target}`);
    }
  }
}
if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else console.log(`Verified ${checked} local file links in ${files.length} Markdown documents.`);
