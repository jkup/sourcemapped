import { execFile } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('../', import.meta.url));
const executable = join(root, 'dist/cli.js');
const manifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const original = 'ORIGINAL_CONTENT_SENTINEL_DO_NOT_EXPORT';
const symbol = 'SYMBOL_NAME_SENTINEL_DO_NOT_EXPORT';
const generated = 'GENERATED_CONTENT_SENTINEL_DO_NOT_EXPORT';
const map = JSON.stringify({ version: 3, sources: ['src/app.ts'], sourcesContent: [original], names: [symbol], mappings: 'AAAAA' });
const inline = `data:application/json;base64,${Buffer.from(map).toString('base64')}`;
const requests: string[] = [];
const server = createServer((request, response) => {
  const path = request.url ?? '/';
  requests.push(path);
  const routes: Record<string, [string, string]> = {
    '/': ['text/html', '<script src="/app.js"></script><script src="/inline.js"></script>'],
    '/app.js': ['application/javascript', `/* ${generated} */\n//# sourceMappingURL=app.map`],
    '/inline.js': ['application/javascript', `/* ${generated} */\n//# sourceMappingURL=${inline}`],
    '/app.map': ['application/json', map],
    '/missing-map.js': ['application/javascript', '//# sourceMappingURL=absent.map'],
  };
  const sampling = /^\/sample-(late|none|budget)$/.exec(path);
  if (sampling) {
    const count = sampling[1] === 'budget' ? 65 : 26;
    routes[path] = ['text/html', Array.from({ length: count }, (_, i) =>
      `<script src="/${sampling[1]}-${i}.js"></script>`).join('')];
  }
  const asset = /^\/(late|none|budget)-(\d+)\.js$/.exec(path);
  if (asset) routes[path] = ['application/javascript', asset[1] === 'late' && Number(asset[2]) === 24 ? '//# sourceMappingURL=app.map' : 'run();'];
  const route = routes[path];
  response.writeHead(route ? 200 : 404, { 'content-type': route?.[0] ?? 'text/plain' });
  response.end(route?.[1] ?? 'Not found');
});
let origin: string;
let temporary: string;

// Async children leave the event loop free to serve the synthetic HTTP fixture.
function run(command: string, args: string[], cwd = root) {
  return new Promise<{ code: number; stdout: string; stderr: string }>((resolveResult, reject) => {
    execFile(command, args, {
      cwd, encoding: 'utf8', timeout: 15_000, maxBuffer: 1024 * 1024,
      env: { ...process.env, NO_COLOR: '1' },
    }, (error, stdout, stderr) => {
      if (error && (typeof error.code !== 'number' || error.killed)) {
        reject(new Error(`${command} ${args.join(' ')} ${error.killed ? 'timed out' : 'failed'}\nstdout:\n${stdout}\nstderr:\n${stderr}`, { cause: error }));
      }
      else resolveResult({ code: error?.code as number | undefined ?? 0, stdout, stderr });
    });
  });
}
const cli = (args: string[]) => run(process.execPath, [executable, ...args]);

function expectMetadataOnly(output: string) {
  for (const forbidden of [original, symbol, generated, inline, Buffer.from(map).toString('base64'), 'sourcesContent', '"names"']) {
    expect(output).not.toContain(forbidden);
  }
}

beforeAll(async () => {
  temporary = await mkdtemp(join(tmpdir(), 'sourcemapped-cli-'));
  await new Promise<void>((resolveListen, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected a loopback TCP address');
  origin = `http://127.0.0.1:${address.port}`;
});
afterAll(async () => {
  server.closeAllConnections();
  await new Promise<void>(resolveClose => server.close(() => resolveClose()));
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

describe('built CLI', () => {
  it.each(['--help', '-h'])('prints help for %s without starting a scan', async flag => {
    const result = await cli([flag]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Usage: sourcemapped');
    expect(result.stdout).toContain('--json');
    expect(result.stdout).toContain('--max-assets N');
    expect(result.stdout).toContain('default: 24');
  });

  it.each(['--version', '-v'])('matches the package version for %s', async flag => {
    expect(await cli([flag])).toEqual({ code: 0, stdout: `${manifest.version}\n`, stderr: '' });
  });

  it.each([['--unknown'], ['--json=false'], [], ['one', 'two'], ['file:///tmp/never-read.js', '--json']])('rejects invalid invocation %j on stderr only', async (...args) => {
    const result = await cli(args);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toMatch(/^sourcemapped: .+\n$/);
  });

  it.each(['', '0', '-1', '1.5', 'NaN', 'Infinity', '1e2', '0x10', '+1', ' 2', '2 ', '9007199254740992', '999999999999999999999'])('rejects invalid asset limit %j before requesting the target', async value => {
    requests.length = 0;
    const result = await cli([origin, '--json', `--max-assets=${value}`]);
    expect(result).toEqual({ code: 1, stdout: '', stderr: 'sourcemapped: --max-assets must be a decimal integer from 1 to 9007199254740991.\n' });
    expect(requests).toEqual([]);
  });

  it('rejects a missing asset-limit value before a scan', async () => {
    requests.length = 0;
    const result = await cli([origin, '--max-assets']);
    expect(result.code).toBe(1);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('--max-assets');
    expect(requests).toEqual([]);
  });

  it.each(['1', '0001', '9007199254740991'])('accepts decimal boundary %s without changing direct-JavaScript semantics', async value => {
    requests.length = 0;
    const result = await cli([`${origin}/app.js`, '--max-assets', value, '--json']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({ scope: 'direct-javascript', limits: { maxScripts: Number(value), maxRequests: 60 }, summary: { discovered: 1, inspected: 1, mapsChecked: 1 } });
    expect(requests).toEqual(['/app.js', '/app.map']);
  });

  it.each(['late', 'none'])('extends document-order selection with %s maps', async scenario => {
    const baseline = await cli([`${origin}/sample-${scenario}`, '--json']);
    const expanded = await cli([`${origin}/sample-${scenario}`, '--max-assets=25', '--json']);
    expect([baseline.code, expanded.code]).toEqual([0, 0]);
    expect(baseline.stderr + expanded.stderr).toBe('');
    const before = JSON.parse(baseline.stdout);
    const after = JSON.parse(expanded.stdout);
    expect(before.summary).toMatchObject({ discovered: 26, inspected: 24, skipped: 2, mapsChecked: 0 });
    expect(after.summary).toMatchObject({ discovered: 26, inspected: 25, skipped: 1, mapsChecked: scenario === 'late' ? 1 : 0 });
    expect(after.limits).toEqual({ ...before.limits, maxScripts: 25 });
    expect(after.bundles.map((bundle: { url: string }) => bundle.url)).toEqual(before.bundles.map((bundle: { url: string }) => bundle.url));
    expect(after.bundles[25].status).toBe('skipped');
    expect(before.requests).toHaveLength(25);
    expect(after.requests).toHaveLength(scenario === 'late' ? 27 : 26);
    expectMetadataOnly(expanded.stdout);
  });

  it('keeps the shared request cap when selected assets exceed it', async () => {
    requests.length = 0;
    const result = await cli([`${origin}/sample-budget`, '--max-assets=64', '--json']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout);
    expect(report.summary).toMatchObject({ discovered: 65, inspected: 59, skipped: 6, noReference: 59, mapsChecked: 0 });
    expect(report.limits).toMatchObject({ maxScripts: 64, maxRequests: 60 });
    expect(report.requests).toHaveLength(60);
    expect(requests).toHaveLength(60);
    expect(report.bundles.slice(59, 64)).toEqual(Array.from({ length: 5 }, () => expect.objectContaining({ status: 'skipped', error: 'Request limit reached' })));
    expect(report.bundles[64]).not.toHaveProperty('error');
    expect(report.warnings.join(' ')).toContain('first 64 of 65');
  });

  it('emits a single metadata JSON report with clean stderr and no original-source requests', async () => {
    requests.length = 0;
    const result = await cli([origin, '--json', '--verbose']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    const report = JSON.parse(result.stdout);
    expect(report).toMatchObject({ schemaVersion: 1, target: `${origin}/`, scope: 'static-html', summary: { mapsChecked: 2, sourceEntries: 2, embeddedSources: 2 } });
    expect(report.bundles[1].map.url).toBe('(inline data URL)');
    expectMetadataOnly(result.stdout + result.stderr);
    expect(requests.sort()).toEqual(['/', '/app.js', '/app.map', '/inline.js']);
  });

  it.each<string[]>([[], ['--verbose']])('keeps terminal output metadata-only with flags %j', async (...args) => {
    const result = await cli([origin, '--no-color', ...args]);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('Analyzed maps for 2 of 2 discovered assets');
    expect(result.stdout).not.toContain('\x1b');
    expectMetadataOnly(result.stdout);
    if (args.includes('--verbose')) {
      expect(result.stdout).toContain('Evidence');
      expect(result.stdout).toContain(`${origin}/app.js`);
      expect(result.stdout).toContain(`annotation → ${origin}/app.map · checked · HTTP 200`);
      expect(result.stdout).toContain('src/app.ts');
      expect(result.stdout).toContain('HTTP requests');
    } else expect(result.stdout).not.toContain('Evidence');
  });

  it.each<string[]>([[], ['--json']])('returns exit 1 and report evidence for target failure %j', async (...args) => {
    const result = await cli([`${origin}/absent`, ...args]);
    expect(result.code).toBe(1);
    expect(result.stderr).toBe('');
    if (args.includes('--json')) {
      const report = JSON.parse(result.stdout);
      expect(report.error).toContain('404');
      expect(report.requests).toEqual([expect.objectContaining({ url: `${origin}/absent`, status: 404 })]);
    } else expect(result.stdout).toContain('Could not inspect this target');
  });

  it('exits successfully for a completed scan with an unavailable advertised map', async () => {
    const result = await cli([`${origin}/missing-map.js`, '--json']);
    expect(result.code).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({ scope: 'direct-javascript', summary: { mapsUnavailable: 1 }, bundles: [{ map: { status: 'unavailable', httpStatus: 404 } }] });
  });

  it('runs the declared entry point from the packed artifact outside the checkout', async () => {
    // npm test already built dist; suppress prepack to avoid a second compilation.
    // npm's background update check can outlive an otherwise completed offline pack.
    const packed = await run('npm', ['pack', '--ignore-scripts', '--offline', '--update-notifier=false', '--json', '--cache', join(temporary, 'npm-cache'), '--pack-destination', temporary]);
    expect(packed.code, packed.stderr).toBe(0);
    const [artifact] = JSON.parse(packed.stdout);
    expect(artifact.files.map((file: { path: string }) => file.path)).toContain('dist/cli.js');
    const unpacked = await run('tar', ['-xzf', join(temporary, artifact.filename), '-C', temporary]);
    expect(unpacked.code, unpacked.stderr).toBe(0);
    const packageRoot = join(temporary, 'package');
    const packaged = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
    // Reuse installed dependencies without registry access; execute only packaged project code.
    await symlink(join(root, 'node_modules'), join(packageRoot, 'node_modules'), 'dir');
    const entry = resolve(packageRoot, packaged.bin.sourcemapped);
    expect(dirname(entry)).toBe(join(packageRoot, 'dist'));
    expect(await readFile(entry, 'utf8')).toMatch(/^#!\/usr\/bin\/env node\n/);
    expect(await run(process.execPath, [entry, '--version'], temporary)).toEqual({ code: 0, stdout: `${packaged.version}\n`, stderr: '' });
    const result = await run(process.execPath, [entry, `${origin}/app.js`, '--json'], temporary);
    expect(result.code, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    expect(JSON.parse(result.stdout)).toMatchObject({ scope: 'direct-javascript', summary: { mapsChecked: 1, sourceEntries: 1 } });
    expectMetadataOnly(result.stdout);
  }, 30_000);
});
