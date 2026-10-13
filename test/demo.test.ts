import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { buildDemo, serveDemo } from '../examples/demo/fixture.mjs';

let files: Awaited<ReturnType<typeof buildDemo>>;
let demo: Awaited<ReturnType<typeof serveDemo>> | undefined;
beforeAll(async () => {
  files = await buildDemo();
  demo = await serveDemo(files);
});
afterAll(async () => { await demo?.close(); });

it.each([false, true])('keeps demo output compact (all=%s)', async all => {
  const result = await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../examples/demo/run.mjs', import.meta.url)), ...(all ? ['--all'] : []),
  ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
  expect(result.stderr).toBe('');
  expect(result.stdout.match(/◇ sourcemapped/g)).toHaveLength(all ? 4 : 1);
  expect(result.stdout).toContain('/mixed/');
  expect(result.stdout).not.toContain('Expect ');
  if (!all) {
    expect(result.stdout.trim().split('\n')).toHaveLength(6);
    expect(result.stdout).not.toContain('/mapped/');
  }
});

it.each(['mapped', 'unmapped', 'mixed'])('scans the real %s build through the CLI', async mode => {
  if (!demo) throw new Error('Demo server did not start');
  demo.requests.length = 0;
  const result = await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../dist/cli.js', import.meta.url)), `${demo.origin}/${mode}/`, '--json',
  ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.error).toBeUndefined();
  expect(report.summary).toMatchObject({ discovered: mode === 'mixed' ? 2 : 1, inspected: mode === 'mixed' ? 2 : 1, skipped: 0, scriptFailures: 0 });
  if (mode !== 'unmapped') {
    // Establish that the input really contains source text before checking its omission.
    const map = JSON.parse(files.get('/mapped/app.js.map')!.body);
    expect(map.sources).toHaveLength(2);
    expect(map.sourcesContent.join('\n')).toContain('DEMO_ORIGINAL_SOURCE_SENTINEL');
    expect(report.summary).toMatchObject({ mapsChecked: 1, sourceEntries: 2, embeddedSources: 2, languages: { TypeScript: 2 } });
    expect(report.bundles[0].map).toMatchObject({ status: 'checked', referenceKind: 'annotation', httpStatus: 200 });
    expect(report.bundles[0].map.analysis.mappingCount).toBeGreaterThan(0);
    for (const source of map.sourcesContent) expect(result.stdout).not.toContain(source);
  } else {
    expect(files.has('/unmapped/app.js.map')).toBe(false);
    expect(report.summary).toMatchObject({ mapsChecked: 0, noReference: 1, sourceEntries: 0, embeddedSources: 0 });
    expect(report.bundles[0].status).toBe('no-reference');
  }
  for (const forbidden of ['DEMO_ORIGINAL_SOURCE_SENTINEL', 'sourcesContent', '"names"']) {
    expect(result.stdout).not.toContain(forbidden);
  }
  expect([...demo.requests].sort()).toEqual((mode === 'mixed'
    ? ['/mixed/', '/mapped/app.js', '/mixed/extra.js', '/mapped/app.js.map']
    : [`/${mode}/`, `/${mode}/app.js`, ...(mode === 'mapped' ? ['/mapped/app.js.map'] : [])]).sort());
  if (mode === 'mixed') expect(report.summary.noReference).toBe(1);
});

it('keeps two good maps when maplint rejects a third map in the same page', async () => {
  if (!demo) throw new Error('Demo server did not start');
  const good = JSON.parse(files.get('/validation/extra.js.map')!.body);
  const bad = JSON.parse(files.get('/validation/bad.js.map')!.body);
  expect(good.sources).toHaveLength(1);
  expect(bad).toEqual({ ...good, file: 'bad.js', mappings: 'ACAA' });
  expect(good.sourcesContent.join('\n')).toContain('export function describeCount');
  demo.requests.length = 0;
  const cli = fileURLToPath(new URL('../dist/cli.js', import.meta.url));
  const url = `${demo.origin}/validation/`;
  const result = await promisify(execFile)(process.execPath, [cli, url, '--json'], { timeout: 15_000 });
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.summary).toMatchObject({
    discovered: 3, inspected: 3, mapsRetrieved: 3, mapsChecked: 2, mapsInvalid: 1,
    noReference: 0, scriptFailures: 0, skipped: 0, sourceEntries: 3, embeddedSources: 3,
  });
  expect(report.bundles.map((bundle: { map: { status: string } }) => bundle.map.status)).toEqual(['checked', 'checked', 'invalid']);
  expect(report.bundles[2].map.analysis.errors).toEqual([expect.stringContaining('referencing "sources[1]"')]);
  expect([...demo.requests].sort()).toEqual([
    '/validation/', '/mapped/app.js', '/mapped/app.js.map', '/validation/extra.js',
    '/validation/extra.js.map', '/validation/bad.js', '/validation/bad.js.map',
  ].sort());
  for (const forbidden of ['DEMO_ORIGINAL_SOURCE_SENTINEL', 'sourcesContent', '"names"']) {
    expect(result.stdout).not.toContain(forbidden);
  }
  for (const source of good.sourcesContent) expect(result.stdout).not.toContain(source);
  const verbose = await promisify(execFile)(process.execPath, [cli, url, '--verbose'], { timeout: 15_000 });
  expect(verbose.stdout).toContain('Analyzed maps for 2 of 3 discovered assets.');
  expect(verbose.stdout).toContain('1 map failed basic validation');
  expect(verbose.stdout).toContain('referencing "sources[1]"');
});
