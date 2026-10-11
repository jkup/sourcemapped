import type { RequestEvidence } from './network.js';
import type { Report } from './scan.js';

// Never let a remote path/URL print terminal escapes, newlines, or bidi controls.
export function safeText(value: string): string {
  return value.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029\u202a-\u202e\u2066-\u2069]/g, '�');
}

function short(value: string, width = 95): string {
  const safe = safeText(value);
  return safe.length > width ? `${safe.slice(0, width - 1)}…` : safe;
}

function counted(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? singular : plural}`;
}

// Count attempts, not bundle/map relationships: shared maps are fetched once, and
// redirect failures belong to the host that actually returned the response.
function requestOutcomes(requests: RequestEvidence[]): string[] {
  const groups = new Map<string, { host: string; outcome: string; count: number }>();
  for (const request of requests) {
    if (!request.error && !(request.status !== undefined && request.status >= 400)) continue;
    let host: string;
    try { host = new URL(request.url).host; } catch { host = '(unknown host)'; }
    const status = request.status === undefined ? '' : `HTTP ${request.status}`;
    const reason = request.code === 'limit' ? 'resource limit'
      : request.code === 'timeout' ? 'timeout'
      : request.code === 'network' ? 'network failure'
      : request.code === 'url' ? 'URL failure' : '';
    const outcome = reason ? `${reason}${status ? ` (${status})` : ''}` : status || 'request failure';
    const key = JSON.stringify([host, outcome]);
    const group = groups.get(key);
    if (group) group.count++;
    else groups.set(key, { host, outcome, count: 1 });
  }
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || a.host.localeCompare(b.host) || a.outcome.localeCompare(b.outcome));
  const lines = sorted.slice(0, 6).map(group => `  │  ${group.count} × ${group.outcome} · ${short(group.host, 70)}`);
  if (sorted.length > 6) lines.push(`  │  ${counted(sorted.length - 6, 'more outcome group')}; see --verbose or --json.`);
  return lines;
}

export function render(report: Report, options: { verbose?: boolean; color?: boolean } = {}): string {
  const s = report.summary;
  const bold = (value: string) => options.color ? `\x1b[1m${value}\x1b[22m` : value;
  const cyan = (value: string) => options.color ? `\x1b[36m${value}\x1b[39m` : value;
  const lines = ['', `  ${bold('sourcemapped')}  ${short(report.finalUrl ?? report.target)}`, ''];
  if (report.error) lines.push(`  Could not inspect target: ${safeText(report.error)}`, '');
  lines.push(`  ├─ JavaScript  ${counted(s.discovered, report.scope === 'static-html' ? 'static reference' : 'direct asset')}`);
  lines.push(`  │  ${s.inspected} inspected · ${s.scriptFailures} failed · ${s.skipped} skipped`);
  lines.push(`  ├─ Source maps  ${cyan(`${s.mapsChecked} analyzed`)} / ${counted(s.discovered, 'discovered asset')}`);
  lines.push(`  │  ${s.noReference} no reference · ${s.mapsUnavailable} unavailable · ${s.mapsInvalid} invalid`);
  if (s.mapsUnsupported || s.mapsLimited) lines.push(`  │  ${s.mapsUnsupported} unsupported · ${s.mapsLimited} limited`);
  if (s.sourceEntries) {
    lines.push(`  ├─ Original sources  ${counted(s.sourceEntries, 'entry', 'entries')} across analyzed bundle maps`);
    lines.push(`  │  ${s.embeddedSources.toLocaleString('en-US')} / ${s.sourceEntries.toLocaleString('en-US')} contain embedded content`);
    const languages = Object.entries(s.languages).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${count} ${name}`);
    lines.push(`  │  ${languages.join(' · ')}`);
    lines.push('  │  Entries can repeat across bundles; extensions describe filenames.');
  }
  const outcomes = requestOutcomes(report.requests);
  if (outcomes.length) lines.push('  ├─ Failed HTTP attempts by host (not affected bundles)', ...outcomes);
  lines.push('  └─ Findings');
  const findings: string[] = [];
  if (!s.mapsChecked && !report.error) findings.push('No analyzable public maps found within this scan.');
  // Paused calls have no RequestEvidence entry unless an earlier redirect was attempted.
  const pausedScripts = report.bundles.filter(bundle => bundle.errorCode === 'rate-limited' && bundle.httpStatus === undefined).length;
  const pausedMaps = report.bundles.filter(bundle => bundle.map?.errorCode === 'rate-limited' && bundle.map.httpStatus === undefined).length;
  if (pausedScripts || pausedMaps) findings.push(`Origin pause blocked ${counted(pausedScripts, 'JavaScript asset')} and ${counted(pausedMaps, 'bundle/map relationship')}; see --verbose.`);
  if (s.skipped || s.mapsLimited) findings.push(`Scan limits: ${counted(s.skipped, 'JavaScript asset')} skipped · ${counted(s.mapsLimited, 'bundle/map relationship')} limited.`);
  if (s.noReference) findings.push('No map reference is normal; maps may be kept private.');
  if (s.mapsUnavailable) findings.push(`${s.mapsUnavailable} advertised map${s.mapsUnavailable === 1 ? '' : 's'} could not be retrieved; see --verbose for evidence.`);
  const packageNames = new Set<string>();
  for (const bundle of report.bundles) {
    if (bundle.map?.analysis?.status !== 'checked') continue;
    for (const entry of bundle.map.analysis.packages) packageNames.add(entry.name);
  }
  if (packageNames.size) findings.push(`Package paths mention ${[...packageNames].slice(0, 6).join(', ')}${packageNames.size > 6 ? ', …' : ''}.`);
  const mapWarnings = new Set(report.bundles.flatMap(bundle => bundle.map?.analysis?.warnings ?? []));
  for (const warning of [...mapWarnings].slice(0, 4)) findings.push(warning);
  if (s.mapsChecked) findings.push('Analyzed means basic structure and mappings checks passed, not full conformance.');
  if (!findings.length) findings.push('No further findings within this scan.');
  lines.push(...findings.map(finding => `     ${short(finding, 120)}`));

  if (options.verbose) {
    lines.push('', '  Evidence');
    for (const bundle of report.bundles) {
      lines.push(`  • ${safeText(bundle.url)}`, `    ${bundle.kind} · ${bundle.status}${bundle.bytes !== undefined ? ` · ${bundle.bytes} decoded response bytes` : ''}`);
      if (bundle.finalUrl && bundle.finalUrl !== bundle.url) lines.push(`    redirected to ${safeText(bundle.finalUrl)}`);
      if (bundle.error) lines.push(`    ${safeText(bundle.error)}`);
      const map = bundle.map;
      if (map) {
        lines.push(`    ${map.referenceKind} → ${safeText(map.url)} · ${map.status}${map.httpStatus ? ` · HTTP ${map.httpStatus}` : ''}`);
        if (map.finalUrl && map.finalUrl !== map.url) lines.push(`    map redirected to ${safeText(map.finalUrl)}`);
        if (map.error) lines.push(`    ${safeText(map.error)}`);
        const analysis = map.analysis;
        if (analysis) {
          lines.push(...analysis.errors.map(error => `    Error: ${safeText(error)}`), ...analysis.warnings.map(warning => `    Note: ${safeText(warning)}`));
          if (analysis.status === 'checked') {
            lines.push(`    ${counted(analysis.sourceEntries, 'entry', 'entries')} · ${counted(analysis.uniqueSourcePaths, 'distinct resolved path')} in this map · ${counted(analysis.mappingCount, 'mapping segment')}`);
            lines.push(...analysis.pathSamples.map(path => `      ${safeText(path)}`));
            lines.push(...analysis.packages.map(entry => `    Package path: ${safeText(entry.name)} ← ${safeText(entry.examples[0] ?? '')}`));
          }
        }
      }
    }
    lines.push('', '  HTTP requests');
    for (const request of report.requests) lines.push(`  ${request.status ?? '—'} ${safeText(request.url)}${request.error ? ` · ${safeText(request.error)}` : ''}`);
  }
  lines.push('', ...report.warnings.map(warning => `  ${short(warning, 140)}`));
  lines.push(`  ${report.requests.length}/${report.limits.maxRequests} requests · ${(s.downloadedBytes / 1048576).toFixed(1)} MiB downloaded · source contents stay in memory`, '');
  return `${lines.join('\n')}\n`;
}
