import { Parser } from 'htmlparser2';

export interface DiscoveredScript {
  url: string;
  kind: 'script' | 'preload';
}

const javascriptTypes = new Set([
  '', 'module', 'application/javascript', 'application/ecmascript',
  'application/x-javascript', 'application/x-ecmascript',
  'text/javascript', 'text/ecmascript', 'text/javascript1.0',
  'text/javascript1.1', 'text/javascript1.2', 'text/javascript1.3',
  'text/javascript1.4', 'text/javascript1.5', 'text/jscript',
  'text/livescript', 'text/x-javascript', 'text/x-ecmascript',
]);

export function normalizeTarget(input: string): string {
  let value = input.trim();
  if (!value) throw new Error('A website or JavaScript URL is required.');
  if (value.startsWith('//')) value = `https:${value}`;
  else if (!/^[a-z][a-z\d+.-]*:/i.test(value) || /^[^/:?#]+:\d+(?:[/?#]|$)/.test(value)) {
    value = `https://${value}`;
  }
  const url = new URL(value);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('Only HTTP and HTTPS targets are supported.');
  }
  if (url.username || url.password) throw new Error('URLs containing credentials are not supported.');
  url.hash = '';
  return url.href;
}

export function discoverScripts(html: string, pageUrl: string): {
  scripts: DiscoveredScript[];
  inlineScripts: number;
  warnings: string[];
} {
  const candidates: { reference: string; kind: DiscoveredScript['kind'] }[] = [];
  const warnings: string[] = [];
  let base = pageUrl;
  let seenBase = false;
  let inlineScripts = 0;
  const parser = new Parser({
    onopentag(name, attributes) {
      if (name === 'base' && attributes.href !== undefined && !seenBase) {
        seenBase = true;
        try {
          const resolved = new URL(attributes.href, pageUrl);
          if (!['http:', 'https:'].includes(resolved.protocol) || resolved.username || resolved.password) {
            warnings.push('Ignored a base URL with an unsupported scheme or credentials.');
          } else base = resolved.href;
        } catch {
          warnings.push('Ignored an invalid base URL.');
        }
      }
      if (name === 'script') {
        const type = (attributes.type ?? '').trim().toLowerCase();
        // An explicit data-block type wins over a filename ending in .js.
        if (!javascriptTypes.has(type)) return;
        if (attributes.src === undefined) inlineScripts++;
        else if (attributes.src.trim()) candidates.push({ reference: attributes.src, kind: 'script' });
      }
      if (name === 'link' && attributes.href?.trim()) {
        const rel = (attributes.rel ?? '').toLowerCase().split(/\s+/);
        if (rel.includes('modulepreload') ||
          (rel.includes('preload') && attributes.as?.toLowerCase() === 'script')) {
          candidates.push({ reference: attributes.href, kind: 'preload' });
        }
      }
    },
  }, { decodeEntities: true });
  parser.end(html);
  const scripts = new Map<string, DiscoveredScript>();
  for (const candidate of candidates) {
    try {
      const url = new URL(candidate.reference, base);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      if (url.username || url.password) {
        warnings.push('Skipped a script URL containing credentials.');
        continue;
      }
      url.hash = '';
      const previous = scripts.get(url.href);
      if (!previous || candidate.kind === 'script') scripts.set(url.href, { url: url.href, kind: candidate.kind });
    } catch {
      warnings.push('Skipped an invalid script URL.');
    }
  }
  return { scripts: [...scripts.values()], inlineScripts, warnings: [...new Set(warnings)] };
}

export interface MapReference {
  reference: string;
  kind: 'header' | 'legacy-header' | 'annotation';
}

/**
 * ECMA-426 JavaScriptExtractSourceMapURL, without-parsing variant.
 * Only trailing single-line comments qualify: block comments and annotations
 * after code on the same line are deliberately unsupported by this variant.
 * https://tc39.es/ecma426/#sec-javascriptextractsourcemapurl
 */
export function discoverMapReference(source: string, headers: Headers): MapReference | null {
  const standard = headers.get('sourcemap');
  if (standard !== null) return { reference: standard, kind: 'header' };
  const legacy = headers.get('x-sourcemap');
  if (legacy !== null) return { reference: legacy, kind: 'legacy-header' };

  // Walk backward without allocating an array for every line of an untrusted bundle.
  let end = source.length;
  while (end >= 0) {
    let start = end;
    while (start > 0) {
      const code = source.charCodeAt(start - 1);
      if (code === 10 || code === 13 || code === 0x2028 || code === 0x2029) break;
      start--;
    }
    const line = source.slice(start, end).trimStart();
    end = start - 1;
    if (!line) continue;
    if (!line.startsWith('//')) return null;
    const comment = line.slice(2);
    if (/["'`]/.test(comment) || comment.includes('*/')) return null;
    const match = /^[@#]\s*sourceMappingURL=(\S*?)\s*$/.exec(comment);
    if (match) return { reference: match[1]!, kind: 'annotation' };
  }
  return null;
}
