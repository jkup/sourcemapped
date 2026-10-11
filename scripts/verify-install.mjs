// Manual release check. Installs only production dependencies into a fresh prefix/cache.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { buildDemo, serveDemo } from '../examples/demo/fixture.mjs';

const input = process.argv[2];
if (!input || process.argv.length !== 3) throw new Error('Usage: node scripts/verify-install.mjs <tarball-or-package@version>');
const spec = input.endsWith('.tgz') ? await realpath(resolve(input)) : input;
const temporary = await realpath(await mkdtemp(join(tmpdir(), 'sourcemapped-release-')));
const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const env = { ...process.env, NO_COLOR: '1', npm_config_cache: join(temporary, 'cache'), npm_config_update_notifier: 'false' };
const run = (command, args) => promisify(execFile)(command, args, { cwd: temporary, env, timeout: 60_000, maxBuffer: 1024 * 1024 });
let demo;
try {
  await run('npm', ['install', '--prefix', temporary, '--omit=dev', '--ignore-scripts', '--no-audit', '--no-fund', '--fetch-retries=0', spec]);
  const binary = join(temporary, 'node_modules/.bin/sourcemapped');
  const installed = JSON.parse(await readFile(join(temporary, 'node_modules', manifest.name, 'package.json'), 'utf8'));
  assert.equal(installed.name, manifest.name);
  assert.equal(installed.version, manifest.version);
  assert.equal((await run(binary, ['--version'])).stdout.trim(), manifest.version);
  assert.match((await run(binary, ['--help'])).stdout, /Usage: sourcemapped/);
  const tree = JSON.parse((await run('npm', ['ls', '--omit=dev', '--all', '--json'])).stdout);
  assert(!JSON.stringify(tree).includes('esbuild'));
  demo = await serveDemo(await buildDemo());
  for (const mode of ['mapped', 'unmapped', 'mixed']) {
    const { stdout, stderr } = await run(binary, [`${demo.origin}/${mode}/`, '--json']);
    const report = JSON.parse(stdout);
    assert.equal(stderr, '');
    assert.equal(report.summary.mapsChecked, mode === 'unmapped' ? 0 : 1);
    assert.equal(report.summary.noReference, mode === 'mapped' ? 0 : 1);
    assert.equal(report.summary.sourceEntries, mode === 'unmapped' ? 0 : 2);
    assert(!/DEMO_ORIGINAL_SOURCE_SENTINEL|sourcesContent|"names"/.test(stdout));
  }
  const terminal = await run(binary, [`${demo.origin}/mixed/`]);
  assert.equal(terminal.stdout.trim().split('\n').length, 6);
  assert.match(terminal.stdout, /with embedded source/);
  await assert.rejects(run(binary, [`${demo.origin}/missing`, '--json']), error => {
    assert.equal(error.code, 1);
    assert.match(JSON.parse(error.stdout).error, /404/);
    return true;
  });
  if (!input.endsWith('.tgz')) {
    const result = await run('npx', ['--yes', `--package=${spec}`, 'sourcemapped', `${demo.origin}/mixed/`, '--json']);
    assert.equal(JSON.parse(result.stdout).summary.mapsChecked, 1);
  }
  console.log(`Verified ${installed.name}@${installed.version}: fresh production install, help/version, mapped/unmapped/mixed, metadata-only JSON, compact output and HTTP failure${input.endsWith('.tgz') ? '' : ', plus npx'}.`);
} finally {
  await demo?.close();
  await rm(temporary, { recursive: true, force: true });
}
