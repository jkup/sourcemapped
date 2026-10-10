// RM-06a research only. No supported comparator API; run after npm run build.
// All responses are constructed locally. Stdout contains only metadata.
import assert from 'node:assert/strict';
import { scan } from '../dist/scan.js';

const origin = 'https://deployment.example';
const page = `${origin}/`;
const absolute = path => new URL(path, page).href;
const asset = (path = '/app.js', state = 'checked', extra = {}) => ({ path, state, ...extra });
const sourceSentinel = 'PRIVATE_SYNTHETIC_SOURCE';
const generatedSentinel = 'GENERATED_SYNTHETIC_BODY';
const nameSentinel = 'PRIVATE_SYNTHETIC_NAME';
const mapBody = embedded => JSON.stringify({ version: 3, sources: ['src/app.ts'],
  ...(embedded ? { sourcesContent: [sourceSentinel] } : {}), names: [nameSentinel], mappings: 'AAAA' });

async function capture(assets = [asset()], options = {}) {
  const target = options.target ?? page;
  const routes = new Map();
  const html = () => new Response('<!doctype html>' + assets.map(a => `<script src="${a.path}"></script>`).join(''),
    { headers: { 'content-type': 'text/html' } });
  routes.set(target, options.targetFailure ? () => new Response(null, { status: 503 }) : html);
  for (const a of assets) {
    const url = absolute(a.path);
    const final = absolute(a.redirect ?? a.path);
    const mapUrl = absolute(a.mapPath ?? `${a.path}.map`);
    const reference = a.inline ? `data:application/json,${encodeURIComponent(mapBody(a.embedded !== false))}` : mapUrl;
    const js = () => new Response(a.state === 'fetch-failed' ? null
      : `${generatedSentinel};${a.state === 'no-reference' ? '' : `\n//# sourceMappingURL=${reference}`}`,
    { status: a.state === 'fetch-failed' ? 403 : 200, headers: { 'content-type': 'application/javascript' } });
    routes.set(url, a.redirect ? () => new Response(null, { status: 302, headers: { location: final } }) : js);
    if (a.redirect) routes.set(final, js);
    routes.set(mapUrl, () => new Response(a.state === 'unavailable' ? null
      : a.state === 'invalid' ? 'not JSON'
      : a.state === 'unsupported' ? JSON.stringify({ version: 3, sections: [] })
      : mapBody(a.embedded !== false), { status: a.state === 'unavailable' ? 404 : 200 }));
  }
  const unexpected = [];
  const attempts = [];
  const report = await scan(target, { limits: { concurrency: 1, ...options.limits }, fetchImpl: async input => {
    const url = String(input);
    attempts.push(url);
    const route = routes.get(url);
    // scan catches fetch errors: assert outside scan too, so a missing route cannot pass silently.
    if (!route) { unexpected.push(url); throw new Error('Unexpected offline request'); }
    return route();
  } });
  assert.deepEqual(unexpected, []);
  assert.deepEqual(report.requests.map(r => r.url), attempts);
  assert.equal(report.summary.discovered, report.summary.inspected + report.summary.scriptFailures + report.summary.skipped);
  report.scannedAt = '2026-10-10T00:00:00.000Z'; // Only normalization; never a real deployment timestamp.
  return report;
}

const state = b => b.map?.status ?? b.status;
// Deliberately narrow research rule: exact requested URL, then evidence/context checks.
// Accepts only the trusted fixture shapes below; this is NOT an arbitrary JSON-file reader.
function compare(before, after) {
  const blocked = [];
  if (before.schemaVersion !== 1 || after.schemaVersion !== 1) blocked.push('unsupported-schema');
  if (before.target !== after.target) blocked.push('target-changed');
  if (before.scope !== after.scope) blocked.push('scope-changed');
  if (before.error || after.error) blocked.push('target-error');
  if (before.finalUrl !== after.finalUrl) blocked.push('target-destination-changed');
  if (blocked.length) return { blocked };
  const context = [];
  if (JSON.stringify(before.limits) !== JSON.stringify(after.limits)) context.push('limits-changed');
  const selected = r => r.bundles.slice(0, r.limits.maxScripts).map(b => b.url);
  if (JSON.stringify(selected(before)) !== JSON.stringify(selected(after))) context.push('selection-changed');
  const left = new Map(before.bundles.map(b => [b.url, b]));
  const right = new Map(after.bundles.map(b => [b.url, b]));
  const observations = [];
  for (const url of [...new Set([...left.keys(), ...right.keys()])].sort()) {
    const a = left.get(url), b = right.get(url);
    if (!a || !b) {
      observations.push({ url, result: a ? 'not-in-later-discovery' : 'new-in-later-discovery' });
      continue;
    }
    const row = { url, before: state(a), after: state(b) };
    if (a.kind !== b.kind) row.result = 'reference-kind-changed';
    else if (a.status === 'skipped' || b.status === 'skipped') row.result = 'unobserved-skipped';
    else if (a.status === 'fetch-failed' || b.status === 'fetch-failed') row.result = 'unobserved-javascript';
    else if (a.finalUrl !== b.finalUrl) row.result = 'bundle-destination-changed';
    else if (state(a) !== state(b)) row.result = 'observed-status-transition';
    else if (a.map?.url !== b.map?.url || a.map?.finalUrl !== b.map?.finalUrl
      || a.map?.referenceKind !== b.map?.referenceKind) row.result = 'map-linkage-changed';
    else if (state(a) === 'checked') {
      row.delta = { sourceEntries: b.map.analysis.sourceEntries - a.map.analysis.sourceEntries,
        embeddedSources: b.map.analysis.embeddedSources - a.map.analysis.embeddedSources };
      row.result = Object.values(row.delta).some(n => n !== 0) ? 'checked-metadata-changed' : 'selected-metadata-equal';
    } else row.result = 'same-observed-status';
    observations.push(row);
  }
  return { context, observations };
}

const reports = {};
reports.checked = await capture();
reports.noContent = await capture([asset('/app.js', 'checked', { embedded: false })]);
for (const status of ['no-reference', 'unavailable', 'invalid', 'unsupported', 'fetch-failed']) {
  reports[status] = await capture([asset('/app.js', status)]);
}
reports.limited = await capture([asset()], { limits: { maxRequests: 2 } });
reports.skipped = await capture([asset()], { limits: { maxRequests: 1 } });
reports.hashBefore = await capture([asset('/app.aaa.js')]);
reports.hashAfter = await capture([asset('/app.bbb.js')]);
reports.sampleBefore = await capture([asset(), asset('/vendor.js', 'no-reference')], { limits: { maxScripts: 1 } });
reports.sampleAfter = await capture([asset('/vendor.js', 'no-reference'), asset()], { limits: { maxScripts: 1 } });
reports.expanded = await capture([asset('/vendor.js', 'no-reference'), asset()], { limits: { maxScripts: 2 } });
reports.absent = await capture([]);
reports.otherTarget = await capture([asset()], { target: `${origin}/other` });
reports.direct = await capture([asset()], { target: `${origin}/app.js` });
reports.failedTarget = await capture([], { targetFailure: true });
reports.redirected = await capture([asset('/app.js', 'checked', { redirect: '/app.bbb.js' })]);
reports.mapMoved = await capture([asset('/app.js', 'checked', { mapPath: '/app.bbb.map' })]);
reports.inline = await capture([asset('/app.js', 'checked', { inline: true })]);
reports.shared = await capture([asset('/app.js', 'checked', { mapPath: '/shared.map' }), asset('/vendor.js', 'checked', { mapPath: '/shared.map' })]);
reports.sharedOne = await capture([asset('/app.js', 'checked', { mapPath: '/shared.map' })]);
// Explicit reader controls, not claimed to be scanner-produced future/older reports.
reports.futureSchema = { ...structuredClone(reports.checked), schemaVersion: 2 };
reports.additive = { ...structuredClone(reports.checked), futureOptionalField: 'ignored' };
delete reports.additive.bundles[0].map.analysis.extensions;
reports.changedScope = { ...structuredClone(reports.checked), scope: 'direct-javascript' };
reports.changedDestination = { ...structuredClone(reports.checked), finalUrl: `${origin}/other` };

const rows = [];
function study(id, before, after, expected) {
  const comparison = compare(reports[before], reports[after]);
  assert.deepEqual(comparison.blocked ?? comparison.observations.map(o => o.result), expected, id);
  rows.push({ id, before, after, checkedTotals: [reports[before].summary.mapsChecked, reports[after].summary.mapsChecked], comparison });
}
study('unchanged-control', 'checked', 'checked', ['selected-metadata-equal']);
study('embedded-content-change', 'checked', 'noContent', ['checked-metadata-changed']);
study('linkage-no-longer-found', 'checked', 'no-reference', ['observed-status-transition']);
for (const status of ['unavailable', 'invalid', 'unsupported', 'limited']) {
  study(`checked-to-${status}`, 'checked', status, ['observed-status-transition']);
}
study('recovered-retrieval', 'unavailable', 'checked', ['observed-status-transition']);
study('javascript-failed', 'checked', 'fetch-failed', ['unobserved-javascript']);
study('budget-skipped', 'checked', 'skipped', ['unobserved-skipped']);
study('hashed-replacement', 'hashBefore', 'hashAfter', ['not-in-later-discovery', 'new-in-later-discovery']);
study('sample-reordered', 'sampleBefore', 'sampleAfter', ['unobserved-skipped', 'unobserved-skipped']);
study('sample-expanded', 'sampleAfter', 'expanded', ['unobserved-skipped', 'same-observed-status']);
study('absent-reference', 'checked', 'absent', ['not-in-later-discovery']);
study('target-mismatch', 'checked', 'otherTarget', ['target-changed', 'target-destination-changed']);
study('page-versus-direct', 'checked', 'direct', ['target-changed', 'scope-changed', 'target-destination-changed']);
study('scope-reader-control', 'checked', 'changedScope', ['scope-changed']);
study('destination-reader-control', 'checked', 'changedDestination', ['target-destination-changed']);
study('target-failed', 'checked', 'failedTarget', ['target-error', 'target-destination-changed']);
study('unknown-schema', 'checked', 'futureSchema', ['unsupported-schema']);
study('unknown-schema-both', 'futureSchema', 'futureSchema', ['unsupported-schema']);
study('additive-reader-control', 'checked', 'additive', ['selected-metadata-equal']);
study('redirected-bundle', 'checked', 'redirected', ['bundle-destination-changed']);
study('map-url-changed', 'checked', 'mapMoved', ['map-linkage-changed']);
study('inline-linkage', 'checked', 'inline', ['map-linkage-changed']);
study('shared-relationship-removed', 'shared', 'sharedOne', ['selected-metadata-equal', 'not-in-later-discovery']);

assert.equal(reports.sampleBefore.summary.mapsChecked, 1);
assert.equal(reports.sampleAfter.summary.mapsChecked, 0);
assert.equal(reports.shared.summary.mapsChecked, 2);
assert.equal(reports.shared.requests.filter(r => r.url.endsWith('/shared.map')).length, 1);
assert.equal(reports.sharedOne.summary.mapsChecked, 1);
assert.deepEqual(rows.find(r => r.id === 'embedded-content-change').comparison.observations[0].delta,
  { sourceEntries: 0, embeddedSources: -1 });
assert.deepEqual(rows.find(r => r.id === 'sample-reordered').comparison.context, ['selection-changed']);
assert.deepEqual(rows.find(r => r.id === 'sample-expanded').comparison.context, ['limits-changed', 'selection-changed']);
const output = JSON.stringify({ study: 'RM-06a offline report comparison, 2026-10-10',
  scannerRevision: 'dc55ac9', timestampNormalization: 'All scannedAt values fixed; synthetic captures are not deployment dates.',
  readerControls: ['futureSchema', 'additive', 'changedScope', 'changedDestination'], reports, rows }, null, 2);
for (const forbidden of [sourceSentinel, generatedSentinel, nameSentinel, 'sourcesContent', 'data:application/json']) {
  assert.ok(!output.includes(forbidden), `Persisted forbidden content: ${forbidden}`);
}
console.log(output);
