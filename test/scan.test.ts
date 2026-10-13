import { afterEach, describe, expect, it, vi } from 'vitest';
import { scan } from '../src/scan.js';

const sourceMap = JSON.stringify({ version: 3, sources: ['src/app.ts'], sourcesContent: ['const PRIVATE_SOURCE_SENTINEL = 42;'], names: [], mappings: 'AAAA' });
const unexpectedRequests: string[] = [];
afterEach(() => expect(unexpectedRequests.splice(0)).toEqual([]));
function routes(entries: Record<string, () => Response>): typeof fetch {
  return vi.fn(async (input: string | URL | Request) => {
    const url = String(input);
    const entry = entries[url];
    if (!entry) {
      unexpectedRequests.push(url); // scan catches errors; also fail outside its catch boundary.
      throw new Error(`Unexpected request: ${url}`);
    }
    return entry();
  }) as typeof fetch;
}
function js(body: string, headers: Record<string, string> = {}) {
  return new Response(body, { headers: { 'content-type': 'application/javascript', ...headers } });
}
function html(body: string) { return new Response(body, { headers: { 'content-type': 'text/html' } }); }

describe('scan integration', () => {
  it('reports maplint failures as retrieved invalid maps without aggregating their sources', async () => {
    const report = await scan('https://example.com/app.js', { fetchImpl: routes({
      'https://example.com/app.js': () => js('//# sourceMappingURL=app.map'),
      'https://example.com/app.map': () => new Response(JSON.stringify({
        version: 3, sources: ['src/app.ts'], sourcesContent: ['PRIVATE_SOURCE'],
        names: ['PRIVATE_NAME'], mappings: 'ACAA',
      })),
    }) });
    expect(report.bundles[0]?.map).toMatchObject({
      status: 'invalid', retrieved: true,
      analysis: { status: 'invalid', errors: [expect.stringContaining('referencing "sources[1]"')] },
    });
    expect(report.summary).toMatchObject({ inspected: 1, mapsRetrieved: 1, mapsInvalid: 1, mapsChecked: 0, sourceEntries: 0, embeddedSources: 0 });
    expect(report.requests).toHaveLength(2);
    expect(JSON.stringify(report)).not.toContain('PRIVATE_');
  });

  it.each([404, 429])('retains received HTTP %i separately from an origin pause', async status => {
    const report = await scan('example.com', { fetchImpl: routes({
      'https://example.com/': () => html('<script src="app.js"></script>'),
      'https://example.com/app.js': () => new Response(null, { status }),
    }) });
    const serialized = JSON.parse(JSON.stringify(report));
    expect(serialized.bundles[0]).toMatchObject({
      status: 'fetch-failed', httpStatus: status, errorCode: status === 429 ? 'rate-limited' : 'http',
    });
    expect(serialized.requests).toHaveLength(2);
  });

  it('fetches a shared map once when references differ only by fragment', async () => {
    const fetchImpl = routes({
      'https://example.com/': () => html('<script src="a.js"></script><script src="b.js"></script>'),
      'https://example.com/a.js': () => js('//# sourceMappingURL=shared.map#first'),
      'https://example.com/b.js': () => js('//# sourceMappingURL=shared.map#second'),
      'https://example.com/shared.map': () => new Response(sourceMap),
    });
    const report = await scan('example.com', { fetchImpl, limits: { maxRequests: 4, concurrency: 1 } });
    expect(report.summary).toMatchObject({ mapsChecked: 2, mapsLimited: 0 });
    expect(report.requests.filter(request => request.url.endsWith('/shared.map'))).toHaveLength(1);
    expect(report.bundles.map(bundle => bundle.map?.url)).toEqual([
      'https://example.com/shared.map#first', 'https://example.com/shared.map#second',
    ]);
  });

  it('preserves direct-JavaScript intent across opaque redirects and strips HTTP anti-XSSI', async () => {
    const report = await scan('https://example.com/app.js', { fetchImpl: routes({
      'https://example.com/app.js': () => new Response(null, { status: 302, headers: { location: '/opaque/download' } }),
      'https://example.com/opaque/download': () => new Response('run();\n//# sourceMappingURL=map'),
      'https://example.com/opaque/map': () => new Response(")]}'anything\n" + sourceMap, { status: 201 }),
    }) });
    expect(report.scope).toBe('direct-javascript');
    expect(report.summary.mapsChecked).toBe(1);
    expect(report.bundles[0]?.map).toMatchObject({ httpStatus: 201, url: 'https://example.com/opaque/map' });
  });

  it('resolves redirect and base URLs, external scripts, header precedence, and metadata-only results', async () => {
    const fetchImpl = routes({
      'https://example.com/': () => new Response(null, { status: 302, headers: { location: '/app/page' } }),
      'https://example.com/app/page': () => html('<base href="https://cdn.example/assets/"><script src="app.js"></script><script>inline()</script>'),
      'https://cdn.example/assets/app.js': () => js('run();\n//# sourceMappingURL=wrong.map', { SourceMap: 'correct.map', 'X-SourceMap': 'also-wrong.map' }),
      'https://cdn.example/assets/correct.map': () => new Response(sourceMap),
    });
    const report = await scan('example.com', { fetchImpl });
    expect(report.finalUrl).toBe('https://example.com/app/page');
    expect(report.inlineScripts).toBe(1);
    expect(report.summary).toMatchObject({ discovered: 1, inspected: 1, mapsChecked: 1, sourceEntries: 1, embeddedSources: 1, languages: { TypeScript: 1 } });
    expect(report.bundles[0]?.map).toMatchObject({ url: 'https://cdn.example/assets/correct.map', referenceKind: 'header', status: 'checked' });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toContain('PRIVATE_SOURCE_SENTINEL');
    expect(serialized).not.toContain('sourcesContent');
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('keeps no-reference, unavailable, invalid and unsupported results distinct', async () => {
    const fetchImpl = routes({
      'https://example.com/': () => html(['none', 'missing', 'bad', 'indexed'].map(name => `<script src="/${name}.js"></script>`).join('')),
      'https://example.com/none.js': () => js('run();'),
      'https://example.com/missing.js': () => js('//# sourceMappingURL=missing.map'),
      'https://example.com/missing.map': () => new Response('', { status: 404 }),
      'https://example.com/bad.js': () => js('//# sourceMappingURL=bad.map'),
      'https://example.com/bad.map': () => new Response('not JSON'),
      'https://example.com/indexed.js': () => js('//# sourceMappingURL=indexed.map'),
      'https://example.com/indexed.map': () => new Response(JSON.stringify({ version: 3, sections: [] })),
    });
    const report = await scan('example.com', { fetchImpl });
    expect(report.summary).toMatchObject({ noReference: 1, mapsUnavailable: 1, mapsInvalid: 1, mapsUnsupported: 1, mapsRetrieved: 2, mapsChecked: 0 });
    expect(report.bundles[1]?.map).toMatchObject({ status: 'unavailable', httpStatus: 404, errorCode: 'http', retrieved: false });
  });

  it.each(['text/html', 'application/xhtml+xml'])('does not classify a %s asset fallback as missing map references', async contentType => {
    const report = await scan('example.com', { fetchImpl: routes({
      'https://example.com/': () => html('<script src="/app.js"></script>'),
      'https://example.com/app.js': () => new Response('challenge', { headers: { 'content-type': contentType } }),
    }) });
    expect(report.summary).toMatchObject({ scriptFailures: 1, noReference: 0 });
    expect(report.bundles[0]?.error).toContain('received HTML');
  });

  it('explains empty static discovery without inventing scripts or failures', async () => {
    const report = await scan('example.com', { fetchImpl: routes({ 'https://example.com/': () => html('<html><h1>Hello</h1></html>') }) });
    expect(report.bundles).toEqual([]);
    expect(report.summary).toMatchObject({ discovered: 0, mapsInvalid: 0, scriptFailures: 0 });
    expect(report.warnings.join(' ')).toContain('No external JavaScript');
  });

  it.each(['percent', 'base64'])('analyzes %s inline maps without downloading or exposing payloads', async encoding => {
    const reference = encoding === 'percent' ? `data:application/json,${encodeURIComponent(sourceMap)}` : `data:application/json;base64,${Buffer.from(sourceMap).toString('base64')}`;
    const fetchImpl = routes({ 'https://example.com/app.js': () => js(`run();\n//# sourceMappingURL=${reference}`) });
    const report = await scan('https://example.com/app.js', { fetchImpl });
    expect(report.scope).toBe('direct-javascript');
    expect(report.summary).toMatchObject({ mapsChecked: 1, mapsRetrieved: 1 });
    expect(report.bundles[0]?.map?.url).toBe('(inline data URL)');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(report)).not.toContain(reference);
    expect(JSON.stringify(report)).not.toContain('PRIVATE_SOURCE_SENTINEL');
  });

  it('shares map fetches across bundles while analyzing each bundle separately', async () => {
    const fetchImpl = routes({
      'https://example.com/': () => html('<script src="a.js"></script><script src="b.js"></script>'),
      'https://example.com/a.js': () => js('//# sourceMappingURL=shared.map'),
      'https://example.com/b.js': () => js('//# sourceMappingURL=shared.map'),
      'https://example.com/shared.map': () => new Response(sourceMap),
    });
    const report = await scan('example.com', { fetchImpl });
    expect(report.summary).toMatchObject({ mapsChecked: 2, sourceEntries: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it('reports budget-limited scripts as skipped and limits asset inspection', async () => {
    const entries = {
      'https://example.com/': () => html('<script src="a.js"></script><script src="b.js"></script>'),
      'https://example.com/a.js': () => js('run();'),
      'https://example.com/b.js': () => js('run();'),
    };
    const report = await scan('example.com', { fetchImpl: routes(entries), limits: { maxRequests: 1, concurrency: 1 } });
    expect(report.summary).toMatchObject({ discovered: 2, skipped: 2, inspected: 0, noReference: 0 });
    expect(report.requests).toHaveLength(1);
    const capped = await scan('example.com', { fetchImpl: routes(entries), limits: { maxScripts: 1 } });
    expect(capped.summary).toMatchObject({ discovered: 2, skipped: 1, inspected: 1 });
    expect(capped.warnings.join(' ')).toContain('first 1 of 2');
  });

  it('preserves selection order, shared maps and failed/redirect request costs when raising the asset limit', async () => {
    const entries = {
      'https://example.com/': () => html('<script src="a.js"></script><script src="b.js"></script><script src="c.js"></script><link rel="modulepreload" href="d.js"><script src="e.js"></script>'),
      'https://example.com/a.js': () => js('//# sourceMappingURL=shared.map'),
      'https://example.com/b.js': () => js('//# sourceMappingURL=shared.map'),
      'https://example.com/shared.map': () => new Response(sourceMap),
      'https://example.com/c.js': () => js('//# sourceMappingURL=missing.map'),
      'https://example.com/missing.map': () => new Response(null, { status: 404 }),
      'https://example.com/d.js': () => new Response(null, { status: 302, headers: { location: '/final.js' } }),
    };
    const baseline = await scan('example.com', { fetchImpl: routes(entries), limits: { maxScripts: 2, maxRequests: 7, concurrency: 1 } });
    const expanded = await scan('example.com', { fetchImpl: routes(entries), limits: { maxScripts: 4, maxRequests: 7, concurrency: 1 } });
    expect(baseline.summary).toMatchObject({ discovered: 5, inspected: 2, skipped: 3, mapsChecked: 2 });
    expect(expanded.summary).toMatchObject({ discovered: 5, inspected: 3, skipped: 2, mapsChecked: 2, mapsUnavailable: 1 });
    expect(expanded.limits).toEqual({ ...baseline.limits, maxScripts: 4 });
    expect(expanded.requests.map(request => [new URL(request.url).pathname, request.status])).toEqual([
      ['/', 200], ['/a.js', 200], ['/shared.map', 200], ['/b.js', 200], ['/c.js', 200], ['/missing.map', 404], ['/d.js', 302],
    ]);
    expect(expanded.bundles[3]).toMatchObject({ kind: 'preload', status: 'skipped', error: 'Request limit reached' });
    expect(expanded.bundles[4]).toMatchObject({ status: 'skipped' });
    expect(expanded.bundles[4]).not.toHaveProperty('error');
  });

  it('classifies a map that exceeds response limits as limited, not invalid', async () => {
    const report = await scan('https://example.com/a.js', {
      limits: { maxResponseBytes: 50 }, fetchImpl: routes({
        'https://example.com/a.js': () => js('//# sourceMappingURL=a.map'),
        'https://example.com/a.map': () => new Response(sourceMap),
      }),
    });
    expect(report.summary).toMatchObject({ mapsLimited: 1, mapsInvalid: 0, mapsUnavailable: 0 });
    expect(report.bundles[0]?.map?.errorCode).toBe('limit');
  });
});
