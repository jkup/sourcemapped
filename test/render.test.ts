import { describe, expect, it } from 'vitest';
import { analyzeMap } from '../src/analyze.js';
import { DEFAULT_LIMITS } from '../src/network.js';
import { render, safeText } from '../src/render.js';
import { scan, type Report } from '../src/scan.js';

function emptyReport(): Report {
  return {
    schemaVersion: 1, target: 'https://example.com/', scannedAt: '2026-10-10T12:00:00.000Z',
    scope: 'static-html', limits: { ...DEFAULT_LIMITS }, warnings: [], inlineScripts: 0,
    bundles: [], requests: [],
    summary: {
      discovered: 0, inspected: 0, skipped: 0, scriptFailures: 0, noReference: 0,
      mapsRetrieved: 0, mapsChecked: 0, mapsInvalid: 0, mapsUnsupported: 0, mapsUnavailable: 0,
      mapsLimited: 0, sourceEntries: 0, embeddedSources: 0, languages: {}, downloadedBytes: 0,
    },
  };
}

describe('terminal report', () => {
  it('leads with useful mixed results without treating no reference as a failure', async () => {
    const report = await scanFixture(['https://page.example/a.js', 'https://page.example/b.js'], {
      'https://page.example/a.js': script('a.map'),
      'https://page.example/a.map': () => new Response(JSON.stringify({ version: 3, sources: ['app.ts'], sourcesContent: ['PRIVATE_DEMO_TEXT'], names: [], mappings: 'AAAA' })),
      'https://page.example/b.js': script(),
    });
    const output = render(report, { color: true });
    expect(output).toContain('✓ 1 asset mapped');
    expect(output.trim().split('\n')).toHaveLength(6);
    expect(output).toContain('1 asset without a map reference');
    expect(output).not.toContain('0 failed');
    expect(output).not.toContain('HTTP requests');
    expect(output).not.toContain('PRIVATE_DEMO_TEXT');
    expect(output).toContain('\x1b[36m');
    expect(output).toContain('\x1b[39m○ 1 asset without a map reference\x1b[0m');
    expect(output).toContain('1 with embedded source');
    expect(output.split('\n').find(line => line.includes('--verbose for details'))).toBe('  Static scan · --verbose for details');
    expect(render(report)).not.toContain('\x1b');
  });

  it.each([[0, '0 B'], [900, '900 B'], [1536, '1.5 KiB'], [1572864, '1.5 MiB']] as const)('formats %i decoded bytes readably', (bytes, expected) => {
    const report = emptyReport();
    report.summary.downloadedBytes = bytes;
    expect(render(report, { verbose: true })).toContain(`${expected} decoded`);
  });

  it('does not call inaccessible JavaScript a no-map result', () => {
    const report = emptyReport();
    Object.assign(report.summary, { discovered: 1, scriptFailures: 1 });
    expect(render(report)).toContain('Scan incomplete');
    expect(render(report, { color: true })).toContain('\x1b[33m');
    expect(render(report)).not.toContain('No source maps advertised');
  });
  it('presents zero observations without inventing a source tree or configuration problem', () => {
    const output = render(emptyReport());
    expect(output).toContain('No external JavaScript discovered');
    expect(output).toContain('Static scan');
    expect(output).not.toContain('No source maps advertised');
    expect(output).not.toContain('Original sources');
    expect(output).not.toContain('misconfigured');
    expect(output).not.toContain('\x1b');
  });

  it('distinguishes missing references, inaccessible maps, invalid maps and limits', () => {
    const report = emptyReport();
    Object.assign(report.summary, {
      discovered: 5, inspected: 5, noReference: 1, mapsUnavailable: 1, mapsInvalid: 1, mapsUnsupported: 1, mapsLimited: 1,
    });
    report.warnings.push('Static HTML only: lazy chunks are not inspected.');
    const output = render(report);
    expect(output).toContain('1 asset without a map reference');
    expect(output).toContain('1 map failed basic validation');
    expect(output).toContain('1 map could not be analyzed: unsupported');
    expect(output).toContain('1 bundle/map relationship limited');
    expect(render(report, { verbose: true })).toContain('Maps may be private or unlinked.');
    expect(output).toContain('1 advertised map could not be retrieved');
    expect(output).toContain('Static scan');
  });

  it('reports request failure without claiming a complete absence of maps', () => {
    const report = emptyReport();
    report.error = 'Request timed out';
    const output = render(report);
    expect(output).toContain('Could not inspect this target');
    expect(output).toContain('Request timed out');
    expect(render(report, { color: true })).toContain('\x1b[31m');
    expect(output).not.toContain('No analyzable public maps found');
  });

  it.each([false, true])('puts failures before successes with clear labels (verbose=%s)', verbose => {
    const report = emptyReport();
    Object.assign(report.summary, { discovered: 3, inspected: 3, mapsChecked: 2, mapsInvalid: 1, sourceEntries: 3, embeddedSources: 3, languages: { TypeScript: 3 } });
    const before = JSON.stringify(report);
    const output = render(report, { verbose });
    const error = '× ERROR: 1 map failed basic validation.';
    expect(output).toContain(error);
    expect(output.indexOf(error)).toBeLessThan(output.indexOf('✓'));
    expect(output.match(/failed basic validation/g)).toHaveLength(1);
    expect(output).not.toContain('\x1b');
    expect(render(report, { verbose, color: true })).toContain(`\x1b[31m\x1b[1m${error}`);
    expect(JSON.stringify(report)).toBe(before);
  });

  it('distinguishes warning outcomes from validation errors and neutral missing references', () => {
    const report = emptyReport();
    Object.assign(report.summary, { mapsInvalid: 2, mapsUnavailable: 1, mapsUnsupported: 1, skipped: 1 });
    const output = render(report, { color: true });
    expect(output).toContain('\x1b[31m\x1b[1m× ERROR: 2 maps failed basic validation.');
    expect(output).toContain('\x1b[33m\x1b[1m! WARNING: 1 advertised map could not be retrieved.');
    expect(output).toContain('! WARNING: 1 map could not be analyzed: unsupported');
    expect(output).toContain('! WARNING: Scan limits:');
    const neutral = emptyReport();
    Object.assign(neutral.summary, { discovered: 1, inspected: 1, noReference: 1 });
    expect(render(neutral)).not.toMatch(/ERROR|WARNING/);
  });

  it('identifies same-origin, external and inline invalid maps under the error summary', async () => {
    const report = await scanFixture(['https://page.example/a.js', 'https://page.example/b.js', 'https://page.example/c.js'], {
      'https://page.example/a.js': script('/maps/bad.map?build=1'),
      'https://page.example/maps/bad.map?build=1': () => new Response('{}'),
      'https://page.example/b.js': script('https://cdn.example/bad.map'),
      'https://cdn.example/bad.map': () => new Response('{}'),
      'https://page.example/c.js': script('data:application/json,%7B%7D'),
    });
    const before = JSON.stringify(report);
    const output = render(report);
    expect(output).toContain('× ERROR: 3 maps failed basic validation.\n    → /maps/bad.map?build=1\n    → https://cdn.example/bad.map\n    → inline map in /c.js');
    expect(output).not.toContain('data:application');
    expect(output).not.toContain('and 0 more');
    expect(JSON.stringify(report)).toBe(before);
  });

  it('bounds distinct map locations, uses redirects and keeps hostile text safe', () => {
    const report = emptyReport();
    report.finalUrl = 'https://redirect.example/';
    report.summary.mapsInvalid = 6;
    report.bundles = Array.from({ length: 6 }, (_, index) => ({
      url: `https://example.com/${index}.js`, kind: 'script', status: 'map-found',
      map: { url: '/old.map', finalUrl: `https://redirect.example/${Math.min(index, 4)}.map`, status: 'invalid', referenceKind: 'annotation', retrieved: true },
    }));
    const output = render(report);
    expect(output.match(/→ /g)).toHaveLength(3);
    expect(output).toContain('→ /0.map');
    expect(output).not.toContain('/3.map');
    expect(output).toContain('and 2 more · --verbose for details');
    const map = report.bundles[0]!.map!;
    map.finalUrl = 'http://[invalid\n\x1b[31m' + 'x'.repeat(200);
    const hostile = render(report);
    expect(hostile).not.toContain('\x1b');
    expect(hostile).not.toContain('x'.repeat(110));
    expect(hostile).toContain('http://[invalid��[31m');
  });

  it('sanitizes remote terminal, line-break and bidi controls in all evidence fields', async () => {
    const hostile = '\x1b]0;owned\x07\n\r\u009b\u2028\u2029\u202e\u2066';
    const report = emptyReport();
    report.target += hostile;
    report.error = hostile;
    report.warnings.push(hostile);
    report.requests.push({ url: `https://example.com/${hostile}`, bytes: 1, error: hostile });
    const analysis = await analyzeMap(JSON.stringify({
      version: 3, sources: [`webpack:///node_modules/pkg${hostile}/index.ts`], names: [], mappings: 'AAAA', sourcesContent: ['private source sentinel'],
    }), 'https://example.com/a.map');
    analysis.errors.push(hostile);
    analysis.warnings.push(hostile);
    report.bundles.push({
      url: `https://example.com/a.js${hostile}`, finalUrl: `https://cdn.example.com/a.js${hostile}`,
      kind: 'script', status: 'map-found', error: hostile,
      map: { url: `/a.map${hostile}`, finalUrl: `https://cdn.example.com/a.map${hostile}`, status: 'checked', referenceKind: 'annotation', retrieved: true, error: hostile, analysis },
    });
    Object.assign(report.summary, { discovered: 1, inspected: 1, mapsRetrieved: 1, mapsChecked: 1, sourceEntries: 1, embeddedSources: 1, languages: { TypeScript: 1 } });
    const output = render(report, { verbose: true });
    expect(output).not.toMatch(/[\x00-\x09\x0b-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    expect(output).not.toContain('\n\r');
    expect(output).toContain('Package path: pkg�]0;owned');
    expect(output).toContain('webpack:///node_modules/pkg�]0;owned');
    expect(output).not.toContain('private source sentinel');
    expect(JSON.stringify(report)).not.toContain('private source sentinel');
    expect(output).toContain('1 source entry');
    expect(output).toContain('1 JavaScript asset inspected');
    expect(output).toContain('Analyzed maps for 1 of 1 discovered asset');
    expect(output).toContain('1 entry · 1 distinct resolved path in this map · 1 mapping segment');
    expect(output).toContain('Source text is omitted from this report');
    expect(output).toContain('not full conformance');
  });

  it('only adds intentional terminal escapes when color is enabled', () => {
    expect(render(emptyReport(), { color: true })).toContain('\x1b[1m');
    expect(render(emptyReport(), { color: false })).not.toContain('\x1b');
    expect(safeText('src/שלום/日本語.ts')).toBe('src/שלום/日本語.ts');
  });
});

// Exercise presentation using real scan reports and synthetic native responses.
async function scanFixture(assets: string[], responses: Record<string, () => Response>, limits: Partial<Report['limits']> = {}) {
  const unexpectedRequests: string[] = [];
  const report = await scan('https://page.example/', {
    limits: { concurrency: 1, ...limits },
    fetchImpl: (async input => {
      const url = String(input);
      if (url === 'https://page.example/') return new Response(assets.map(url => `<script src="${url}"></script>`).join(''), { headers: { 'content-type': 'text/html' } });
      const response = responses[url];
      if (!response) {
        unexpectedRequests.push(url);
        throw new Error(`Unexpected request: ${url}`);
      }
      return response();
    }) as typeof fetch,
  });
  expect(unexpectedRequests).toEqual([]);
  return report;
}

const script = (map?: string) => () => new Response(map ? `//# sourceMappingURL=${map}` : 'run();', { headers: { 'content-type': 'application/javascript' } });

describe('grouped retrieval evidence', () => {
  it('distinguishes an HTTP 429 from a pre-request pause without interpreting error text', () => {
    const report = emptyReport();
    report.bundles = [
      { url: 'https://example.com/a.js', kind: 'script', status: 'fetch-failed', errorCode: 'rate-limited', httpStatus: 429, error: 'Origin paused after a rate-limit response' },
      { url: 'https://example.com/b.js', kind: 'script', status: 'fetch-failed', error: 'Origin paused after a rate-limit response' },
    ];
    // Historical reports without a code remain readable; no pause is inferred from prose.
    expect(render(report)).not.toContain('Origin pause blocked');
    report.bundles.push({ url: 'https://example.com/c.js', kind: 'script', status: 'fetch-failed', errorCode: 'rate-limited', error: 'Different human wording' });
    expect(render(report)).toContain('Origin pause blocked 1 JavaScript asset and 0 bundle/map relationships');
  });

  it('groups actual 403/404 attempts by responding host, preserving shared-map and redirect evidence', async () => {
    const report = await scanFixture(['https://page.example/a.js', 'https://page.example/b.js', 'https://page.example/c.js', 'https://page.example/d.js', 'https://other.example/missing.js', 'https://page.example/none.js'], {
      'https://page.example/a.js': script('https://maps.example/shared.map'),
      'https://page.example/b.js': script('https://maps.example/shared.map'),
      'https://page.example/c.js': script('https://maps.example/other.map'),
      'https://page.example/d.js': () => new Response(null, { status: 302, headers: { location: 'https://maps.example/missing.js' } }),
      'https://maps.example/shared.map': () => new Response(null, { status: 403 }),
      'https://maps.example/other.map': () => new Response(null, { status: 403 }),
      'https://maps.example/missing.js': () => new Response(null, { status: 404 }),
      'https://other.example/missing.js': () => new Response(null, { status: 404 }),
      'https://page.example/none.js': script(),
    });
    const jsonBefore = JSON.stringify(report);
    const output = render(report);
    expect(output).toContain('2 × HTTP 403 · maps.example');
    expect(output).toContain('1 × HTTP 404 · maps.example');
    expect(output).toContain('1 × HTTP 404 · other.example');
    expect(output).not.toContain('HTTP 302');
    expect(output).not.toContain('HTTP 404 · page.example');
    expect(output).toContain('3 advertised maps could not be retrieved');
    expect(render(report, { verbose: true })).toContain('Maps may be private or unlinked.');
    expect(output).not.toContain('shared.map');
    const verbose = render(report, { verbose: true });
    for (const bundle of report.bundles) expect(verbose).toContain(bundle.url);
    expect(verbose.match(/annotation → https:\/\/maps.example\/shared.map · unavailable · HTTP 403/g)).toHaveLength(2);
    expect(verbose).toContain('404 https://maps.example/missing.js · HTTP 404');
    expect(JSON.stringify(report)).toBe(jsonBefore);
    const json = JSON.parse(jsonBefore) as Report;
    expect(json.schemaVersion).toBe(1);
    expect(json.bundles[0]?.map).toMatchObject({ httpStatus: 403, error: 'HTTP 403', status: 'unavailable' });
    expect(json.bundles[1]?.map?.url).toBe('https://maps.example/shared.map');
    expect(json.bundles[3]).toMatchObject({ status: 'fetch-failed', error: 'HTTP 404' });
  });

  it.each([429, 503])('separates HTTP %i from later origin pauses for scripts and maps', async status => {
    const report = await scanFixture(['https://page.example/a.js', 'https://page.example/b.js', 'https://maps.example/c.js'], {
      'https://page.example/a.js': script('https://maps.example/a.map'),
      'https://page.example/b.js': script('https://maps.example/b.map'),
      'https://maps.example/a.map': () => new Response(null, { status, headers: { 'retry-after': '60' } }),
    });
    const output = render(report);
    expect(output).toContain(`1 × HTTP ${status} · maps.example`);
    expect(output).toContain('Origin pause blocked 1 JavaScript asset and 1 bundle/map relationship');
    expect(output).not.toContain(`2 × HTTP ${status}`);
    expect(report.requests).toHaveLength(4);
    expect(report.bundles[1]?.map).toMatchObject({ status: 'unavailable', errorCode: 'rate-limited', error: 'Origin paused after a rate-limit response' });
    expect(report.bundles[2]).toMatchObject({ status: 'fetch-failed', errorCode: 'rate-limited' });
    expect(report.bundles[0]?.map?.httpStatus).toBe(status);
    expect(report.bundles[1]?.map?.httpStatus).toBeUndefined();
    const verbose = render(report, { verbose: true });
    expect(verbose.match(/Origin paused after a rate-limit response/g)).toHaveLength(2);
    expect(verbose).toContain('https://maps.example/b.map');
    expect(JSON.parse(JSON.stringify(report)).bundles[2].error).toBe('Origin paused after a rate-limit response');
  });

  it('shows request and sampling limits without inventing HTTP attempts or missing references', async () => {
    const report = await scanFixture(['https://page.example/a.js', 'https://page.example/b.js', 'https://page.example/c.js'], {
      'https://page.example/a.js': script('a.map'),
    }, { maxRequests: 2, maxScripts: 2 });
    const output = render(report);
    expect(output).toContain('Scan limits: 2 JavaScript assets skipped · 1 bundle/map relationship limited.');
    expect(output).not.toContain('0 no reference');
    expect(output).not.toContain('No source maps advertised');
    expect(render(report, { verbose: true })).toContain('first 2 of 3 static references');
    expect(output).not.toContain('Failed HTTP attempts');
    expect(report.requests).toHaveLength(2);
    expect(render(report, { verbose: true })).toContain('Request limit reached');
  });

  it('does not present an HTTP 200 byte-limit failure as an HTTP rejection', async () => {
    const report = await scanFixture(['https://page.example/a.js'], {
      'https://page.example/a.js': script('a.map'),
      'https://page.example/a.map': () => new Response('x'.repeat(300)),
    }, { maxResponseBytes: 200 });
    expect(render(report)).toContain('1 × resource limit (HTTP 200) · page.example');
    expect(render(report)).toContain('1 bundle/map relationship limited');
    expect(render(report, { verbose: true })).toContain('Download byte limit reached');
  });

  it.each([
    [0, 0, '0 JavaScript assets', '0 bundle/map relationships'],
    [0, 1, '0 JavaScript assets', '1 bundle/map relationship'],
    [1, 0, '1 JavaScript asset', '0 bundle/map relationships'],
    [1, 1, '1 JavaScript asset', '1 bundle/map relationship'],
    [2, 2, '2 JavaScript assets', '2 bundle/map relationships'],
  ] as const)('uses singular/plural pause and limit counts for %i scripts and %i maps', (scripts, maps, scriptText, mapText) => {
    const paused = emptyReport();
    const error = 'Display wording can change independently';
    const errorCode = 'rate-limited' as const;
    paused.bundles = [
      ...Array.from({ length: scripts }, (_, index) => ({ url: `https://example.com/${index}.js`, kind: 'script' as const, status: 'fetch-failed' as const, error, errorCode })),
      ...Array.from({ length: maps }, (_, index) => ({ url: `https://example.com/map-${index}.js`, kind: 'script' as const, status: 'map-found' as const, map: { url: `https://example.com/${index}.map`, referenceKind: 'annotation' as const, status: 'unavailable' as const, retrieved: false, error, errorCode } })),
    ];
    const limited = emptyReport();
    limited.summary.skipped = scripts;
    limited.summary.mapsLimited = maps;
    if (scripts || maps) {
      expect(render(paused)).toContain(`Origin pause blocked ${scriptText} and ${mapText}; see --verbose.`);
      expect(render(limited)).toContain(`Scan limits: ${scriptText} skipped · ${mapText} limited.`);
    } else {
      expect(render(paused)).not.toContain('Origin pause blocked');
      expect(render(limited)).not.toContain('Scan limits:');
    }
  });

  it.each([
    [6, undefined],
    [7, '1 more outcome group; see --verbose or --json.'],
    [8, '2 more outcome groups; see --verbose or --json.'],
  ] as const)('uses singular/plural overflow wording for %i groups', (groups, expected) => {
    const report = emptyReport();
    report.requests = Array.from({ length: groups }, (_, index) => ({ url: `https://host${index}.example/a.js`, status: 404, bytes: 0, error: 'HTTP 404' }));
    const output = render(report);
    expect(output.match(/ × /g)).toHaveLength(6);
    if (expected) expect(output).toContain(expected);
    else expect(output).not.toContain('more outcome group');
  });

  it('bounds groups, preserves all detailed attempts, and sanitizes fallback/long hosts', () => {
    const report = emptyReport();
    report.requests = Array.from({ length: 9 }, (_, index) => ({ url: `https://host${index}.example/a.js`, status: 404, bytes: 0, error: 'HTTP 404' }));
    report.requests.push({ url: 'invalid\n\x1b[31m', bytes: 0, error: 'untrusted\n\x1b[31m', code: 'network' });
    report.requests.push({ url: `https://${'a'.repeat(150)}.example/a.js`, status: 403, bytes: 0, error: 'HTTP 403' });
    const output = render(report);
    expect(output.match(/ × /g)).toHaveLength(6);
    expect(output).toContain('5 more outcome groups; see --verbose or --json.');
    expect(output).toContain('(unknown host)');
    expect(output).not.toContain('a'.repeat(100));
    expect(output).not.toMatch(/[\x00-\x09\x0b-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    const verbose = render(report, { verbose: true });
    for (const request of report.requests) expect(verbose).toContain(safeText(request.url));
  });
});
