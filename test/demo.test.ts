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

it.each(['mapped', 'unmapped'])('scans the real %s build through the CLI', async mode => {
  if (!demo) throw new Error('Demo server did not start');
  demo.requests.length = 0;
  const result = await promisify(execFile)(process.execPath, [
    fileURLToPath(new URL('../dist/cli.js', import.meta.url)), `${demo.origin}/${mode}/`, '--json',
  ], { timeout: 15_000, maxBuffer: 1024 * 1024 });
  expect(result.stderr).toBe('');
  const report = JSON.parse(result.stdout);
  expect(report.error).toBeUndefined();
  expect(report.summary).toMatchObject({ discovered: 1, inspected: 1, skipped: 0, scriptFailures: 0 });
  if (mode === 'mapped') {
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
  expect(demo.requests).toEqual([
    `/${mode}/`, `/${mode}/app.js`, ...(mode === 'mapped' ? ['/mapped/app.js.map'] : []),
  ]);
});
