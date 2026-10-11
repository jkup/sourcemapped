import { USER_AGENT } from './package.js';

export const DEFAULT_LIMITS = {
  maxRequests: 60,
  maxScripts: 24,
  concurrency: 3,
  timeoutMs: 8_000,
  scanTimeoutMs: 90_000,
  maxResponseBytes: 8 * 1024 * 1024,
  maxTotalBytes: 64 * 1024 * 1024,
  maxRedirects: 5,
} as const;

export type Limits = { [K in keyof typeof DEFAULT_LIMITS]: number };
export type FailureCode = 'http' | 'network' | 'timeout' | 'limit' | 'rate-limited' | 'url';

export class FetchFailure extends Error {
  constructor(public code: FailureCode, message: string, public status?: number) {
    super(message);
  }
}

export interface Resource {
  url: string;
  status: number;
  text: string;
  bytes: number;
  headers: Headers;
}

export interface RequestEvidence {
  url: string;
  status?: number;
  bytes: number;
  error?: string;
  code?: FailureCode;
}

// One client per scan. Redirect hops and failed attempts consume the same budget.
export class Fetcher {
  readonly limits: Limits;
  readonly requests: RequestEvidence[] = [];
  totalBytes = 0;
  private readonly blockedOrigins = new Set<string>();
  private readonly deadline: number;

  constructor(limits: Partial<Limits> = {}, private readonly fetchImpl: typeof fetch = fetch) {
    this.limits = { ...DEFAULT_LIMITS, ...limits };
    for (const value of Object.values(this.limits)) {
      if (!Number.isSafeInteger(value) || value <= 0) throw new Error('Limits must be positive integers');
    }
    this.deadline = Date.now() + this.limits.scanTimeoutMs;
  }

  async get(input: string): Promise<Resource> {
    let url = input;
    const timeoutMs = Math.min(this.limits.timeoutMs, this.deadline - Date.now());
    if (timeoutMs <= 0) throw new FetchFailure('limit', 'Scan time limit reached');
    const signal = AbortSignal.timeout(timeoutMs);
    for (let hop = 0; hop <= this.limits.maxRedirects; hop++) {
      let parsed: URL;
      try { parsed = new URL(url); } catch { throw new FetchFailure('url', 'Invalid URL'); }
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
        throw new FetchFailure('url', 'Only HTTP(S) URLs without credentials are supported');
      }
      parsed.hash = '';
      url = parsed.href;
      if (this.blockedOrigins.has(parsed.origin)) throw new FetchFailure('rate-limited', 'Origin paused after a rate-limit response');
      if (this.requests.length >= this.limits.maxRequests) throw new FetchFailure('limit', 'Request limit reached');
      if (this.totalBytes >= this.limits.maxTotalBytes) throw new FetchFailure('limit', 'Total download limit reached');
      const entry: RequestEvidence = { url, bytes: 0 };
      this.requests.push(entry);
      try {
        const response = await this.fetchImpl(url, {
          signal,
          redirect: 'manual',
          headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
          credentials: 'omit',
        });
        entry.status = response.status;
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          await response.body?.cancel();
          const location = response.headers.get('location');
          if (!location) throw new FetchFailure('http', 'Redirect has no Location header', response.status);
          if (hop === this.limits.maxRedirects) throw new FetchFailure('limit', 'Redirect limit reached');
          url = new URL(location, url).href;
          continue;
        }
        if (response.status === 429 || (response.status === 503 && response.headers.has('retry-after'))) {
          this.blockedOrigins.add(parsed.origin);
        }
        if (!response.ok) {
          await response.body?.cancel();
          throw new FetchFailure(response.status === 429 ? 'rate-limited' : 'http', `HTTP ${response.status}`, response.status);
        }
        if (response.status === 206) {
          await response.body?.cancel();
          throw new FetchFailure('http', 'Unexpected partial response (HTTP 206)', 206);
        }
        const reader = response.body?.getReader();
        const chunks: Uint8Array[] = [];
        if (reader) {
          try {
            for (;;) {
              const { done, value } = await reader.read();
              if (done) break;
              entry.bytes += value.byteLength;
              this.totalBytes += value.byteLength;
              if (entry.bytes > this.limits.maxResponseBytes || this.totalBytes > this.limits.maxTotalBytes) {
                throw new FetchFailure('limit', 'Download byte limit reached');
              }
              chunks.push(value);
            }
          } finally { await reader.cancel().catch(() => undefined); }
        }
        return { url, status: response.status, text: Buffer.concat(chunks).toString('utf8'), bytes: entry.bytes, headers: response.headers };
      } catch (error) {
        const failure = error instanceof FetchFailure ? error : new FetchFailure(signal.aborted ? 'timeout' : 'network', signal.aborted ? 'Request timed out' : 'Network request failed');
        entry.error = failure.message;
        entry.code = failure.code;
        throw failure;
      }
    }
    throw new FetchFailure('limit', 'Redirect limit reached');
  }
}

export function decodeInlineMap(url: string, maxBytes: number): string {
  if (!/^data:/i.test(url)) throw new Error('Malformed data URL');
  const parsed = new URL(url);
  parsed.hash = '';
  url = parsed.href;
  const comma = url.indexOf(',');
  if (!url.startsWith('data:') || comma === -1) throw new Error('Malformed data URL');
  const metadata = url.slice(5, comma);
  if (url.length - comma - 1 > maxBytes * 4) throw new FetchFailure('limit', 'Inline map exceeds byte limit');
  const base64 = /;base64$/i.test(metadata);
  let payload = decodeURIComponent(url.slice(comma + 1));
  if (base64) payload = payload.replace(/[\t\n\f\r ]/g, '');
  if (base64 && payload.includes('=') && payload.length % 4 !== 0) throw new Error('Invalid base64 padding');
  if (base64 && (!/^[A-Za-z0-9+/]*={0,2}$/.test(payload) || payload.length % 4 === 1)) throw new Error('Invalid base64 data URL');
  const bytes = base64 ? Buffer.from(payload, 'base64') : Buffer.from(payload, 'utf8');
  if (bytes.byteLength > maxBytes) throw new FetchFailure('limit', 'Inline map exceeds byte limit');
  return bytes.toString('utf8');
}
