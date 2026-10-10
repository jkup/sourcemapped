// Offline RM-04 experiment. Run after npm run build; stdout is metadata-only JSON.
import assert from 'node:assert/strict';
import { discoverScripts } from '../dist/discover.js';
import { scan } from '../dist/scan.js';

const page = 'https://site.example/page';
const map = JSON.stringify({ version: 3, sources: ['src/app.ts'], names: [], mappings: 'AAAA' });
const asset = (path, outcome = 'none', extra = {}) => ({ url: new URL(path, page).href, outcome, ...extra });
const cases = [
  { id: 'late-app', prefix: 'https://site.example/app/', assets: [
    asset('https://vendor.example/a.js'), asset('https://vendor.example/b.js'),
    asset('/app/a.js', 'checked'), asset('/app/b.js', 'checked'),
    asset('/app/lazy.js', 'checked', { kind: 'preload' }), asset('/other.js'),
  ] },
  { id: 'cdn-app', prefix: 'https://cdn.example/app/', assets: [
    asset('https://cdn.example/app/a.js', 'checked'), asset('https://cdn.example/app/b.js', 'checked'),
    asset('/shell.js'), asset('/metrics.js'), asset('https://cdn.example/app/lazy.js', 'checked', { kind: 'preload' }), asset('/other.js'),
  ] },
  { id: 'early-maps', prefix: 'https://site.example/app/', assets: [
    asset('/vendor/a.js', 'checked'), asset('/vendor/b.js', 'checked'), asset('/app/a.js'),
    asset('/app/b.js'), asset('/app/lazy.js', 'none', { kind: 'preload' }), asset('/other.js'),
  ] },
  { id: 'shared-and-failed', prefix: 'https://site.example/app/', maxRequests: 7, assets: [
    asset('/app/a.js', 'checked', { mapPath: '/shared.map' }),
    asset('/app/b.js', 'checked', { mapPath: '/shared.map' }),
    asset('/app/c.js', 'unavailable'), asset('/app/d.js', 'checked', { redirect: '/redirected.js' }),
    asset('/app/lazy.js', 'checked', { kind: 'preload' }), asset('/other.js'),
  ] },
  { id: 'empty-filter', prefix: 'https://site.example/app/', assets: [
    asset('https://cdn.example/a.js', 'checked'), asset('https://cdn.example/b.js', 'unavailable'),
    asset('https://cdn.example/c.js'), asset('https://cdn.example/d.js'),
    asset('https://cdn.example/lazy.js', 'checked', { kind: 'preload' }), asset('https://cdn.example/e.js'),
  ] },
];
const policies = [
  { id: 'document-2', limit: 2, accepts: () => true },
  { id: 'document-4', limit: 4, accepts: () => true },
  { id: 'same-origin-2', limit: 2, accepts: url => new URL(url).origin === new URL(page).origin },
  { id: 'explicit-prefix-2', limit: 2, accepts: (url, fixture) => url.startsWith(fixture.prefix) },
];
function html(assets) {
  const text = '<!doctype html>' + assets.map(a => a.kind === 'preload'
    ? `<link rel="modulepreload" href="${a.url}">` : `<script src="${a.url}"></script>`).join('');
  assert.ok(text.length <= 4096);
  return text.padEnd(4096, ' '); // Constant page byte cost across selection simulations.
}
async function run(fixture, candidates, maxScripts) {
  const routes = new Map([[page, () => new Response(html(candidates), { headers: { 'content-type': 'text/html' } })]]);
  for (const a of fixture.assets) {
    const final = a.redirect ? new URL(a.redirect, page).href : a.url;
    const mapUrl = new URL(a.mapPath ?? `${new URL(final).pathname}.map`, final).href;
    const body = a.outcome === 'none' ? 'run();' : `run();\n//# sourceMappingURL=${mapUrl}`;
    const js = () => new Response(body, { headers: { 'content-type': 'application/javascript' } });
    routes.set(a.url, a.redirect ? () => new Response(null, { status: 302, headers: { location: final } }) : js);
    routes.set(final, js);
    if (a.outcome !== 'none') routes.set(mapUrl, () => new Response(a.outcome === 'checked' ? map : '', { status: a.outcome === 'checked' ? 200 : 404 }));
  }
  const attempts = [];
  const report = await scan(page, {
    limits: { maxScripts: Math.max(1, maxScripts), maxRequests: fixture.maxRequests ?? 60, concurrency: 1 },
    fetchImpl: async input => {
      const url = String(input);
      attempts.push(url);
      const route = routes.get(url);
      assert.ok(route, `Unexpected offline request: ${url}`);
      return route();
    },
  });
  assert.equal(report.error, undefined);
  assert.deepEqual(report.requests.map(r => r.url), attempts);
  assert.ok(attempts.length <= report.limits.maxRequests);
  return report;
}
const rows = [];
for (const fixture of cases) {
  const original = discoverScripts(html(fixture.assets), page).scripts;
  assert.deepEqual(original.map(a => a.url), fixture.assets.map(a => a.url));
  for (const policy of policies) {
    const eligible = original.filter(a => policy.accepts(a.url, fixture));
    const selected = eligible.slice(0, policy.limit);
    // Study-only selection adapter: real scanner handles the selected HTML using one shared budget.
    // Original discovery and policy exclusions are kept separately; this is not a production Report.
    const report = await run(fixture, selected, policy.limit);
    if (policy.id.startsWith('document-')) {
      const baseline = await run(fixture, fixture.assets, policy.limit);
      assert.deepEqual(report.requests, baseline.requests);
      assert.deepEqual(report.bundles, baseline.bundles.slice(0, policy.limit));
      assert.equal(baseline.summary.skipped, original.length - selected.length + report.summary.skipped);
    }
    const filtered = original.length - eligible.length;
    const overLimit = eligible.length - selected.length;
    assert.equal(original.length, filtered + overLimit + report.summary.skipped + report.summary.inspected + report.summary.scriptFailures);
    rows.push({
      fixture: fixture.id, policy: policy.id, prefix: policy.id === 'explicit-prefix-2' ? fixture.prefix : undefined,
      discovered: original.length, eligible: eligible.length, selected: selected.map(a => a.url),
      skipped: { filter: filtered, assetLimit: overLimit, runtimeBudget: report.summary.skipped, total: filtered + overLimit + report.summary.skipped },
      outcomes: { inspected: report.summary.inspected, scriptFailures: report.summary.scriptFailures,
        noReference: report.summary.noReference, mapReferences: report.bundles.filter(b => b.map).length,
        checked: report.summary.mapsChecked, unavailable: report.summary.mapsUnavailable, limited: report.summary.mapsLimited },
      requests: report.requests, requestCount: report.requests.length, downloadedBytes: report.summary.downloadedBytes,
      checkedBundles: report.bundles.filter(b => b.map?.status === 'checked').map(b => b.url),
    });
  }
}
// Observable controls: the budget case must show cache reuse, a failed map, and a stopped redirect.
const budget = rows.find(r => r.fixture === 'shared-and-failed' && r.policy === 'document-4');
assert.equal(budget.requestCount, 7);
assert.equal(budget.outcomes.checked, 2);
assert.equal(budget.outcomes.unavailable, 1);
assert.equal(budget.outcomes.limited, 0);
assert.equal(budget.requests.at(-1).status, 302);
assert.equal(budget.skipped.runtimeBudget, 1);
assert.equal(budget.requests.filter(r => r.url.endsWith('/shared.map')).length, 1);
const zero = rows.find(r => r.fixture === 'empty-filter' && r.policy === 'same-origin-2');
assert.equal(zero.requestCount, 1);
assert.equal(zero.skipped.total, 6);
console.log(JSON.stringify({ study: 'RM-04 offline sampling, 2026-10-10', rows }, null, 2));
