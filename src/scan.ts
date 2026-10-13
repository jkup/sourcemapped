import { analyzeMap, type MapAnalysis } from './analyze.js';
import { discoverMapReference, discoverScripts, normalizeTarget } from './discover.js';
import { decodeInlineMap, Fetcher, FetchFailure, type FailureCode, type Limits, type Resource, type RequestEvidence } from './network.js';

export interface MapResult {
  url: string;
  referenceKind: 'header' | 'legacy-header' | 'annotation';
  status: 'checked' | 'invalid' | 'unsupported' | 'unavailable' | 'limited';
  retrieved: boolean;
  finalUrl?: string;
  httpStatus?: number;
  error?: string;
  errorCode?: FailureCode;
  analysis?: MapAnalysis;
}

export interface BundleResult {
  url: string;
  kind: 'script' | 'preload' | 'direct';
  status: 'no-reference' | 'map-found' | 'fetch-failed' | 'skipped';
  finalUrl?: string;
  bytes?: number;
  error?: string;
  errorCode?: FailureCode;
  httpStatus?: number;
  map?: MapResult;
}

export interface Report {
  schemaVersion: 1;
  target: string;
  finalUrl?: string;
  scannedAt: string;
  scope: 'static-html' | 'direct-javascript';
  limits: Limits;
  error?: string;
  warnings: string[];
  inlineScripts: number;
  bundles: BundleResult[];
  requests: RequestEvidence[];
  summary: {
    discovered: number;
    inspected: number;
    skipped: number;
    scriptFailures: number;
    noReference: number;
    mapsRetrieved: number;
    mapsChecked: number;
    mapsInvalid: number;
    mapsUnsupported: number;
    mapsUnavailable: number;
    mapsLimited: number;
    sourceEntries: number;
    embeddedSources: number;
    languages: Record<string, number>;
    downloadedBytes: number;
  };
}

export async function scan(target: string, options: { limits?: Partial<Limits>; fetchImpl?: typeof fetch; onProgress?: (message: string) => void } = {}): Promise<Report> {
  const url = normalizeTarget(target);
  const client = new Fetcher(options.limits, options.fetchImpl);
  const report: Report = {
    schemaVersion: 1, target: url, scannedAt: new Date().toISOString(), scope: 'static-html',
    limits: client.limits, warnings: [], inlineScripts: 0, bundles: [], requests: client.requests,
    summary: { discovered: 0, inspected: 0, skipped: 0, scriptFailures: 0, noReference: 0, mapsRetrieved: 0, mapsChecked: 0, mapsInvalid: 0, mapsUnsupported: 0, mapsUnavailable: 0, mapsLimited: 0, sourceEntries: 0, embeddedSources: 0, languages: {}, downloadedBytes: 0 },
  };
  const mapCache = new Map<string, Promise<Resource>>();

  async function inspect(bundle: BundleResult, existing?: Resource) {
    let resource: Resource;
    try {
      resource = existing ?? await client.get(bundle.url);
      if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(resource.text) || /(?:text\/html|application\/xhtml\+xml)/i.test(resource.headers.get('content-type') ?? '')) {
        throw new Error('Expected JavaScript; received HTML (possibly a challenge or fallback page)');
      }
      bundle.finalUrl = resource.url;
      bundle.bytes = resource.bytes;
      bundle.httpStatus = resource.status;
    } catch (error) {
      bundle.status = error instanceof FetchFailure && error.code === 'limit' ? 'skipped' : 'fetch-failed';
      bundle.error = message(error);
      if (error instanceof FetchFailure) {
        bundle.errorCode = error.code;
        bundle.httpStatus = error.status;
      }
      return;
    }
    const reference = discoverMapReference(resource.text, resource.headers);
    if (!reference) { bundle.status = 'no-reference'; return; }
    bundle.status = 'map-found';
    const inline = /^data:/i.test(reference.reference);
    const map: MapResult = { url: inline ? '(inline data URL)' : reference.reference, referenceKind: reference.kind, status: 'unavailable', retrieved: false };
    bundle.map = map;
    let raw: string;
    let baseUrl = resource.url;
    try {
      if (inline) {
        try { raw = decodeInlineMap(reference.reference, client.limits.maxResponseBytes); }
        catch (error) {
          map.status = error instanceof FetchFailure ? 'limited' : 'invalid';
          map.error = message(error);
          if (error instanceof FetchFailure) map.errorCode = error.code;
          return;
        }
      } else {
        const mapUrl = new URL(reference.reference, resource.url);
        map.url = mapUrl.href;
        // Fragments remain reference evidence, but never identify distinct HTTP resources.
        mapUrl.hash = '';
        const cacheKey = mapUrl.href;
        let pending = mapCache.get(cacheKey);
        if (!pending) { pending = client.get(cacheKey); mapCache.set(cacheKey, pending); }
        const downloaded = await pending;
        map.finalUrl = downloaded.url;
        map.httpStatus = downloaded.status;
        baseUrl = downloaded.url;
        raw = downloaded.text;
        // ECMA-426 permits this anti-XSSI prefix only for HTTP(S) responses.
        if (raw.startsWith(")]}'")) raw = raw.replace(/^[^\r\n]*(?:\r\n|[\r\n])?/, '');
      }
      map.retrieved = true;
      map.analysis = await analyzeMap(raw, baseUrl, resource.text);
      map.status = map.analysis.status;
    } catch (error) {
      map.status = error instanceof FetchFailure && error.code === 'limit' ? 'limited' : 'unavailable';
      map.httpStatus = error instanceof FetchFailure ? error.status : undefined;
      map.error = message(error);
      if (error instanceof FetchFailure) map.errorCode = error.code;
    }
  }

  try {
    options.onProgress?.('Fetching target');
    const page = await client.get(url);
    report.finalUrl = page.url;
    const contentType = page.headers.get('content-type') ?? '';
    const isHtml = /(?:text\/html|application\/xhtml\+xml)/i.test(contentType) || /^\s*(?:<!doctype\s+html|<html\b)/i.test(page.text);
    const direct = !isHtml && (/\.(?:m?js|cjs)$/i.test(new URL(page.url).pathname) || /\.(?:m?js|cjs)$/i.test(new URL(url).pathname) || /(?:java|ecma)script/i.test(contentType));
    if (direct) {
      report.scope = 'direct-javascript';
      const bundle: BundleResult = { url, kind: 'direct', status: 'skipped' };
      report.bundles.push(bundle);
      await inspect(bundle, page);
    } else if (isHtml) {
      const discovery = discoverScripts(page.text, page.url);
      report.inlineScripts = discovery.inlineScripts;
      report.warnings.push(...discovery.warnings);
      report.bundles = discovery.scripts.map(script => ({ ...script, status: 'skipped' }));
      const candidates = report.bundles.slice(0, client.limits.maxScripts);
      if (report.bundles.length > candidates.length) report.warnings.push(`Asset limit: inspecting the first ${candidates.length} of ${report.bundles.length} static references.`);
      let next = 0;
      await Promise.all(Array.from({ length: Math.min(client.limits.concurrency, candidates.length) }, async () => {
        for (;;) {
          const bundle = candidates[next++];
          if (!bundle) break;
          options.onProgress?.(`Inspecting JavaScript ${Math.min(next, candidates.length)}/${candidates.length}`);
          await inspect(bundle);
        }
      }));
      report.warnings.push('Static HTML only: imports, lazy chunks, workers, other routes, and inline scripts are not inspected. Preloads may never execute.');
      if (!report.bundles.length) report.warnings.push('No external JavaScript references found. This may be a script-free page, a challenge, or a page requiring browser execution.');
    } else {
      report.error = 'Target is neither recognized HTML nor JavaScript; use a page URL or a direct JavaScript URL.';
    }
  } catch (error) { report.error = message(error); }

  const summary = report.summary;
  summary.discovered = report.bundles.length;
  summary.downloadedBytes = client.totalBytes;
  for (const bundle of report.bundles) {
    if (bundle.status === 'skipped') summary.skipped++;
    else if (bundle.status === 'fetch-failed') summary.scriptFailures++;
    else summary.inspected++;
    if (bundle.status === 'no-reference') summary.noReference++;
    const map = bundle.map;
    if (!map) continue;
    if (map.retrieved) summary.mapsRetrieved++;
    if (map.status === 'checked') summary.mapsChecked++;
    if (map.status === 'invalid') summary.mapsInvalid++;
    if (map.status === 'unsupported') summary.mapsUnsupported++;
    if (map.status === 'unavailable') summary.mapsUnavailable++;
    if (map.status === 'limited') summary.mapsLimited++;
    if (map.analysis?.status === 'checked') {
      summary.sourceEntries += map.analysis.sourceEntries;
      summary.embeddedSources += map.analysis.embeddedSources;
      for (const [language, count] of Object.entries(map.analysis.languages)) summary.languages[language] = (summary.languages[language] ?? 0) + count;
    }
  }
  return report;
}

function message(error: unknown): string { return error instanceof Error ? error.message : 'Unexpected failure'; }
