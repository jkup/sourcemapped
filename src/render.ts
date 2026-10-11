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
  const lines = sorted.slice(0, 6).map(group => `    ${group.count} × ${group.outcome} · ${short(group.host, 70)}`);
  if (sorted.length > 6) lines.push(`    ${counted(sorted.length - 6, 'more outcome group')}; see --verbose or --json.`);
  return lines;
}

export function render(report: Report, options: { verbose?: boolean; color?: boolean } = {}): string {
  const s = report.summary;
  const paint = (code: number, value: string) => options.color ? `\x1b[${code}m${value}\x1b[0m` : value;
  const bold = (value: string) => paint(1, value);
  const muted = (value: string) => paint(2, value);
  const incomplete = Boolean(s.scriptFailures || s.skipped || s.mapsLimited);
  const advertised = s.mapsChecked + s.mapsUnavailable + s.mapsInvalid + s.mapsUnsupported + s.mapsLimited;
  const headline = report.error ? '× Could not inspect this target'
    : s.mapsChecked ? `${incomplete ? '◐' : '✓'} Maps analyzed for ${counted(s.mapsChecked, 'JavaScript asset')}`
    : advertised ? '! Map references found, none analyzed'
    : incomplete ? '! Scan incomplete — map availability is unknown'
    : !s.discovered ? '○ No external JavaScript discovered'
    : '○ No source maps advertised';
  const lines = ['', `  ${bold('sourcemapped')}  ${muted('· explore the source behind the bundle')}`,
    `  ${short(report.finalUrl ?? report.target)}`, '',
    `  ${paint(report.error ? 31 : incomplete || (!s.mapsChecked && advertised) ? 33 : s.mapsChecked ? 36 : 37, bold(headline))}`];
  if (report.error) lines.push(`  ${safeText(report.error)}`);
  if (s.mapsChecked) lines.push(`  Analyzed maps for ${s.mapsChecked} of ${counted(s.discovered, 'discovered asset')}.`);
  if (s.sourceEntries) {
    const languages = Object.entries(s.languages).sort((a, b) => b[1] - a[1]).map(([name, count]) => `${count} ${safeText(name)}`);
    lines.push('', `  ${bold(counted(s.sourceEntries, 'source entry', 'source entries'))}  ${languages.join(' · ')} (by filename)`,
      `  ${s.embeddedSources} of ${s.sourceEntries} include original source text in the maps.`,
      muted('  Source text is omitted from this report.'));
    if (s.mapsChecked > 1) lines.push(muted('  Entries can repeat across bundles; extensions describe filenames.'));
  }
  const findings: string[] = [];
  if (s.noReference) findings.push(`${counted(s.noReference, 'asset')} did not advertise a map. Maps may be private or unlinked.`);
  if (s.scriptFailures) findings.push(`${counted(s.scriptFailures, 'JavaScript asset')} could not be inspected.`);
  if (s.mapsUnavailable) findings.push(`${counted(s.mapsUnavailable, 'advertised map')} could not be retrieved; see --verbose for evidence.`);
  if (s.mapsInvalid) findings.push(`${counted(s.mapsInvalid, 'map')} failed basic validation.`);
  if (s.mapsUnsupported) findings.push(`${counted(s.mapsUnsupported, 'map')} could not be analyzed: unsupported format or analysis limit.`);
  // Paused calls have no RequestEvidence entry unless an earlier redirect was attempted.
  const pausedScripts = report.bundles.filter(bundle => bundle.errorCode === 'rate-limited' && bundle.httpStatus === undefined).length;
  const pausedMaps = report.bundles.filter(bundle => bundle.map?.errorCode === 'rate-limited' && bundle.map.httpStatus === undefined).length;
  if (pausedScripts || pausedMaps) findings.push(`Origin pause blocked ${counted(pausedScripts, 'JavaScript asset')} and ${counted(pausedMaps, 'bundle/map relationship')}; see --verbose.`);
  if (s.skipped || s.mapsLimited) findings.push(`Scan limits: ${counted(s.skipped, 'JavaScript asset')} skipped · ${counted(s.mapsLimited, 'bundle/map relationship')} limited.`);
  const packageNames = new Set<string>();
  for (const bundle of report.bundles) {
    if (bundle.map?.analysis?.status !== 'checked') continue;
    for (const entry of bundle.map.analysis.packages) packageNames.add(entry.name);
  }
  if (packageNames.size) findings.push(`Package paths mention ${[...packageNames].slice(0, 6).join(', ')}${packageNames.size > 6 ? ', …' : ''}.`);
  const mapWarnings = new Set(report.bundles.flatMap(bundle => bundle.map?.analysis?.warnings ?? []));
  for (const warning of [...mapWarnings].slice(0, 4)) findings.push(warning);
  if (findings.length) lines.push('', ...findings.map(finding => `  ${short(finding, 120)}`));
  const outcomes = requestOutcomes(report.requests);
  if (outcomes.length) lines.push('', paint(33, '  ! Failed HTTP attempts by host (not affected bundles)'), ...outcomes);
  if (s.mapsChecked) lines.push(muted('  Analyzed = basic structure and mapping checks passed, not full conformance.'));

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
  lines.push('', muted(`  ${counted(s.inspected, 'JavaScript asset')} inspected · ${counted(report.requests.length, 'request')} · ${formatBytes(s.downloadedBytes)} decoded`));
  lines.push(muted(report.scope === 'static-html'
    ? '  Scope: static page references only; imports, other routes and inline scripts excluded.'
    : '  Scope: one JavaScript asset; imports and original source files are not fetched.'));
  const warnings = options.verbose ? report.warnings : report.warnings.filter(warning => !warning.startsWith('Static HTML only:'));
  lines.push(...warnings.map(warning => `  ${short(warning, 140)}`));
  if (!options.verbose) lines.push(muted('  → Use --verbose for paths and request details, or --json for data.'));
  lines.push('');
  return `${lines.join('\n')}\n`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1048576).toFixed(1)} MiB`;
}
