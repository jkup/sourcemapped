#!/usr/bin/env node
// Deliberately small, bounded research harness. Never persists source text.
import { writeFile } from 'node:fs/promises';

const targets = [
  ['linear.app', 'Developer SaaS'], ['sentry.io', 'Developer SaaS'],
  ['vercel.com', 'Developer platform'], ['github.com', 'Developer platform'],
  ['vite.dev', 'Documentation'], ['svelte.dev', 'Documentation'],
  ['react.dev', 'Documentation'], ['developer.mozilla.org', 'Documentation'],
  ['www.notion.com', 'SaaS'], ['www.figma.com', 'SaaS'],
  ['www.wikipedia.org', 'Consumer'], ['www.reddit.com', 'Consumer'],
  ['www.nytimes.com', 'News'], ['www.bbc.com', 'News'],
  ['vuejs.org', 'Documentation'], ['www.npmjs.com', 'Developer platform'],
];
const limits = { requestsPerSite: 30, bundlesPerSite: 12, concurrency: 2, timeoutMs: 10000, htmlBytes: 2000000, jsBytes: 4000000, mapBytes: 10000000 };
const report = { generatedAt: new Date().toISOString(), method: 'HTML script src + script/modulepreload links; first 12 unique assets in document order. Header before last sourceMappingURL comment; otherwise one sibling .map guess. No imports, hydration, interaction, source recovery, or crawling.', limits, sites: [] };
function inspect(map) {
  if (!map || map.version !== 3) throw new Error('Expected version 3 map');
  if (Array.isArray(map.sections)) {
    const nested = map.sections.map(s => { if (!s.map) throw new Error('External indexed section unsupported'); return inspect(s.map); });
    const extensions = {};
    for (const m of nested) for (const [ext,n] of Object.entries(m.extensions)) extensions[ext] = (extensions[ext] ?? 0) + n;
    return { sources: nested.reduce((n,m)=>n+m.sources,0), embedded: nested.reduce((n,m)=>n+m.embedded,0), extensions, indexed: true, validation: 'Required JSON fields only; VLQ mappings not validated' };
  }
  if (!Array.isArray(map.sources) || !map.sources.every(s=>typeof s === 'string') || typeof map.mappings !== 'string' || !Array.isArray(map.names)) throw new Error('Missing required map fields');
  const extensions = {};
  for (const s of map.sources) { const ext = s.replace(/[?#].*$/, '').match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? '(none)'; extensions[ext] = (extensions[ext] ?? 0) + 1; }
  return { sources: map.sources.length, embedded: map.sources.filter((_,i)=>typeof map.sourcesContent?.[i] === 'string').length, extensions, sourcesContentLength: Array.isArray(map.sourcesContent) ? map.sourcesContent.length : null, mappingsChars: map.mappings.length, validation: 'Required JSON fields only; VLQ mappings not validated' };
}
async function probe([host, category]) {
  const site = { host, category, requests: 0, discoveredBundles: 0, bundles: [], errors: [] };
  async function get(input, maxBytes) {
    let url = input;
    for (let redirects = 0; redirects <= 4; redirects++) {
      if (site.requests >= limits.requestsPerSite) throw new Error('Request budget exhausted');
      site.requests++;
      const response = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(limits.timeoutMs), headers: { 'User-Agent': 'sourcemapped-research/0.1 (bounded public source-map metadata study)', Accept: '*/*' } });
      if ([301,302,303,307,308].includes(response.status) && response.headers.has('location')) { await response.body?.cancel(); url = new URL(response.headers.get('location'), url).href; continue; }
      if (response.status === 429) { await response.body?.cancel(); site.requests = limits.requestsPerSite; throw new Error('Rate limited; stopped site'); }
      const headers = Object.fromEntries(['content-type', 'sourcemap', 'x-sourcemap'].map(k=>[k,response.headers.get(k)]));
      if (!response.ok) { await response.body?.cancel(); return { url, status: response.status, headers, body: '' }; }
      const chunks = []; let bytes = 0;
      for await (const chunk of response.body) { bytes += chunk.length; if (bytes > maxBytes) throw new Error(`Response exceeds ${maxBytes} bytes`); chunks.push(chunk); }
      return { url, status: response.status, headers, bytes, body: Buffer.concat(chunks).toString('utf8') };
    }
    throw new Error('Redirect limit exceeded');
  }
  try {
    const html = await get(`https://${host}/`, limits.htmlBytes);
    site.url = html.url; site.htmlStatus = html.status;
    const baseHref = html.body.match(/<base\b[^>]*\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    const base = baseHref ? new URL(baseHref,html.url).href : html.url;
    const urls = [];
    for (const match of html.body.matchAll(/<(script|link)\b([^>]+)>/gi)) {
      const attrs = Object.fromEntries([...match[2].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)].map(m=>[m[1].toLowerCase(),m[2]??m[3]??m[4]]));
      const ref = match[1].toLowerCase() === 'script' ? attrs.src : (attrs.rel === 'modulepreload' || attrs.rel === 'preload' && attrs.as === 'script') ? attrs.href : null;
      if (ref) { try { const u = new URL(ref.replace(/&amp;/g,'&'),base); if (['http:', 'https:'].includes(u.protocol)) urls.push(u.href); } catch {} }
    }
    const unique = [...new Set(urls)]; site.discoveredBundles = unique.length;
    for (const url of unique.slice(0,limits.bundlesPerSite)) {
      const bundle = { url }; site.bundles.push(bundle);
      try {
        const js = await get(url,limits.jsBytes); bundle.finalUrl = js.url; bundle.status = js.status; bundle.bytes = js.bytes;
        if (js.status < 200 || js.status >= 300) continue;
        const comments = [...js.body.matchAll(/(?:\/\/[#@]\s*sourceMappingURL\s*=\s*([^\s]+)|\/\*[#@]\s*sourceMappingURL\s*=\s*([^\s*]+)\s*\*\/)/g)];
        const header = js.headers.sourcemap || js.headers['x-sourcemap'];
        const last = comments.at(-1); const reference = header || last?.[1] || last?.[2];
        bundle.discovery = header ? 'http-header' : reference ? 'comment' : 'guessed-sibling';
        let body;
        if (reference?.startsWith('data:')) {
          bundle.mapUrl = '(inline data URL)'; const comma = reference.indexOf(','); const meta = reference.slice(0,comma); body = meta.endsWith(';base64') ? Buffer.from(reference.slice(comma+1),'base64').toString('utf8') : decodeURIComponent(reference.slice(comma+1)); bundle.mapStatus = 'inline';
        } else {
          const guessed = new URL(js.url); guessed.pathname += '.map'; guessed.hash = '';
          const mapUrl = reference ? new URL(reference,js.url) : guessed;
          if (!['http:', 'https:'].includes(mapUrl.protocol)) throw new Error('Unsupported map URL scheme');
          bundle.mapUrl = mapUrl.href;
          const map = await get(mapUrl.href,limits.mapBytes); bundle.mapStatus = map.status; bundle.mapBytes = map.bytes; body = map.body;
          if (map.status < 200 || map.status >= 300) continue;
        }
        try { bundle.map = inspect(JSON.parse(body)); } catch (e) { bundle.mapError = e instanceof SyntaxError ? 'Response is not JSON (regex discovery candidate; verify comment context)' : e.message; }
      } catch (e) { bundle.error = e.message; }
      if (site.requests >= limits.requestsPerSite) break;
    }
  } catch (e) { site.errors.push(e.message); }
  return site;
}
let cursor = 0;
await Promise.all(Array.from({length:limits.concurrency},async()=>{
  while(cursor < targets.length) {
    const index = cursor++; const result = await probe(targets[index]); report.sites[index] = result;
    console.log(`${result.host}: HTML ${result.htmlStatus ?? 'error'}, ${result.discoveredBundles} refs, ${result.bundles.filter(b=>b.map).length}/${result.bundles.length} structurally valid maps, ${result.requests} requests`);
    await writeFile(new URL('../research/baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
  }
}));
await writeFile(new URL('../research/baseline.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
