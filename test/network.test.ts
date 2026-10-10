import { describe, expect, it, vi } from 'vitest';
import { decodeInlineMap, Fetcher } from '../src/network.js';

function mockFetch(handler: (url: string, init?: RequestInit) => Response | Promise<Response>): typeof fetch {
  return vi.fn((input: string | URL | Request, init?: RequestInit) => Promise.resolve(handler(String(input), init))) as typeof fetch;
}

describe('bounded networking', () => {
  it('preserves successful HTTP status and rejects unsolicited partial responses', async () => {
    const client = new Fetcher({}, mockFetch(() => new Response('created', { status: 201 })));
    expect((await client.get('https://example.com/')).status).toBe(201);
    const partial = new Fetcher({}, mockFetch(() => new Response('partial', { status: 206 })));
    await expect(partial.get('https://example.com/')).rejects.toMatchObject({ code: 'http', status: 206 });
  });
  it('follows relative redirects, strips fragments, and identifies itself without cookies', async () => {
    const fetchImpl = mockFetch((url, init) => {
      expect(init?.redirect).toBe('manual');
      expect(init?.credentials).toBe('omit');
      expect(new Headers(init?.headers).get('user-agent')).toMatch(/^sourcemapped\//);
      return url.endsWith('/start') ? new Response(null, { status: 302, headers: { location: './final#fragment' } }) : new Response('ok');
    });
    const client = new Fetcher({}, fetchImpl);
    expect(await client.get('https://example.com/start')).toMatchObject({ url: 'https://example.com/final', text: 'ok', bytes: 2 });
    expect(client.requests.map(item => item.status)).toEqual([302, 200]);
  });

  it('counts redirect hops and failures toward a shared request budget', async () => {
    const fetchImpl = mockFetch(() => new Response(null, { status: 302, headers: { location: '/next' } }));
    const client = new Fetcher({ maxRequests: 2 }, fetchImpl);
    await expect(client.get('https://example.com/start')).rejects.toMatchObject({ code: 'limit' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(client.requests).toHaveLength(2);
    const failureFetch = mockFetch(() => new Response('', { status: 404 }));
    const failureClient = new Fetcher({ maxRequests: 1 }, failureFetch);
    await expect(failureClient.get('https://example.com/missing')).rejects.toMatchObject({ code: 'http', status: 404 });
    await expect(failureClient.get('https://example.com/other')).rejects.toMatchObject({ code: 'limit' });
    expect(failureFetch).toHaveBeenCalledTimes(1);
  });

  it('enforces redirect limits and rejects credentials and non-HTTP URLs before fetching', async () => {
    const fetchImpl = mockFetch(() => new Response(null, { status: 302, headers: { location: '/again' } }));
    const client = new Fetcher({ maxRedirects: 1 }, fetchImpl);
    await expect(client.get('https://example.com/')).rejects.toMatchObject({ code: 'limit' });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    for (const url of ['file:///tmp/map', 'https://u:p@example.com/']) {
      await expect(client.get(url)).rejects.toMatchObject({ code: 'url' });
    }
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('limits decoded response bytes regardless of Content-Length', async () => {
    const client = new Fetcher({ maxResponseBytes: 3 }, mockFetch(() => new Response('éé', { headers: { 'content-length': '1' } })));
    await expect(client.get('https://example.com/')).rejects.toMatchObject({ code: 'limit' });
    expect(client.requests[0]).toMatchObject({ bytes: 4, code: 'limit' });
    expect(client.totalBytes).toBe(4);
  });

  it('applies total bytes across requests and permits an exact-limit body', async () => {
    const fetchImpl = mockFetch(() => new Response('abc'));
    const client = new Fetcher({ maxResponseBytes: 3, maxTotalBytes: 3 }, fetchImpl);
    expect((await client.get('https://example.com/one')).text).toBe('abc');
    await expect(client.get('https://example.com/two')).rejects.toMatchObject({ code: 'limit' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('pauses later requests to a rate-limited origin while allowing another origin', async () => {
    const fetchImpl = mockFetch(url => url.includes('limited.example') ? new Response('', { status: 429 }) : new Response('ok'));
    const client = new Fetcher({}, fetchImpl);
    await expect(client.get('https://limited.example/one')).rejects.toMatchObject({ code: 'rate-limited', status: 429 });
    await expect(client.get('https://limited.example/two')).rejects.toMatchObject({ code: 'rate-limited' });
    expect((await client.get('https://other.example/')).text).toBe('ok');
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it('honors Retry-After on unavailable origins without retrying them', async () => {
    const fetchImpl = mockFetch(() => new Response('', { status: 503, headers: { 'retry-after': '120' } }));
    const client = new Fetcher({}, fetchImpl);
    await expect(client.get('https://example.com/one')).rejects.toMatchObject({ status: 503 });
    await expect(client.get('https://example.com/two')).rejects.toMatchObject({ code: 'rate-limited' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('classifies fetch aborts as timeouts and stops after the scan deadline', async () => {
    const fetchImpl = mockFetch((_url, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
    }));
    const client = new Fetcher({ timeoutMs: 10 }, fetchImpl);
    await expect(client.get('https://example.com/')).rejects.toMatchObject({ code: 'timeout' });
    const expired = new Fetcher({ scanTimeoutMs: 1 }, fetchImpl);
    await new Promise(resolve => setTimeout(resolve, 5));
    await expect(expired.get('https://example.com/')).rejects.toMatchObject({ code: 'limit' });
  });
});

describe('inline decoding', () => {
  it('decodes percent-encoded and base64 JSON including Unicode', () => {
    const json = '{"name":"☃"}';
    expect(decodeInlineMap(`data:application/json,${encodeURIComponent(json)}`, 100)).toBe(json);
    expect(decodeInlineMap(`data:application/json;charset=utf-8;base64,${Buffer.from(json).toString('base64')}`, 100)).toBe(json);
    expect(decodeInlineMap(`DATA:application/json,${encodeURIComponent(json)}#map`, 100)).toBe(json);
    expect(decodeInlineMap('data:application/json;base64,e30%3D%20', 100)).toBe('{}');
  });
  it('rejects malformed encodings and oversized decoded payloads', () => {
    for (const url of ['data:application/json', 'data:application/json,%zz', 'data:application/json;base64,%%%', 'data:application/json;base64,e30==']) {
      expect(() => decodeInlineMap(url, 100)).toThrow();
    }
    expect(() => decodeInlineMap('data:application/json,%C3%A9', 1)).toThrow(/limit/i);
    expect(() => decodeInlineMap('data:application/json;base64,YWJj', 2)).toThrow(/limit/i);
  });
});
