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
  expect(result.stdout.match(/◇ sourcemapped/g)).toHaveLength(all ? 3 : 1);
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
