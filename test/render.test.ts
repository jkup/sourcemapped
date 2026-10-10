import { describe, expect, it } from 'vitest';
import { analyzeMap } from '../src/analyze.js';
import { DEFAULT_LIMITS } from '../src/network.js';
import { render, safeText } from '../src/render.js';
import type { Report } from '../src/scan.js';

function emptyReport(): Report {
  return {
    schemaVersion: 1, target: 'https://example.com/', scannedAt: '2026-10-10T12:00:00.000Z',
    scope: 'static-html', limits: { ...DEFAULT_LIMITS }, warnings: [], inlineScripts: 0,
    bundles: [], requests: [],
    summary: {
      discovered: 0, inspected: 0, skipped: 0, scriptFailures: 0, noReference: 0,
      mapsRetrieved: 0, mapsChecked: 0, mapsInvalid: 0, mapsUnsupported: 0, mapsUnavailable: 0,
      mapsLimited: 0, sourceEntries: 0, embeddedSources: 0, languages: {}, downloadedBytes: 0,
    },
  };
}

describe('terminal report', () => {
  it('presents zero observations without inventing a source tree or configuration problem', () => {
    const output = render(emptyReport());
    expect(output).toContain('0 static references');
    expect(output).toContain('0 analyzed / 0 discovered assets');
    expect(output).toContain('No analyzable public maps found within this scan.');
    expect(output).not.toContain('Original sources');
    expect(output).not.toContain('misconfigured');
    expect(output).not.toContain('\x1b');
  });

  it('distinguishes missing references, inaccessible maps, invalid maps and limits', () => {
    const report = emptyReport();
    Object.assign(report.summary, {
      discovered: 5, inspected: 5, noReference: 1, mapsUnavailable: 1, mapsInvalid: 1, mapsUnsupported: 1, mapsLimited: 1,
    });
    report.warnings.push('Static HTML only: lazy chunks are not inspected.');
    const output = render(report);
    expect(output).toContain('1 no reference · 1 unavailable · 1 invalid');
    expect(output).toContain('1 unsupported · 1 limited');
    expect(output).toContain('No map reference is normal; maps may be kept private.');
    expect(output).toContain('1 advertised map could not be retrieved');
    expect(output).toContain('Static HTML only: lazy chunks are not inspected.');
  });

  it('reports request failure without claiming a complete absence of maps', () => {
    const report = emptyReport();
    report.error = 'Request timed out';
    const output = render(report);
    expect(output).toContain('Could not inspect target: Request timed out');
    expect(output).not.toContain('No analyzable public maps found');
  });

  it('sanitizes remote terminal, line-break and bidi controls in all evidence fields', () => {
    const hostile = '\x1b]0;owned\x07\n\r\u009b\u2028\u2029\u202e\u2066';
    const report = emptyReport();
    report.target += hostile;
    report.error = hostile;
    report.warnings.push(hostile);
    report.requests.push({ url: `https://example.com/${hostile}`, bytes: 1, error: hostile });
    const analysis = analyzeMap(JSON.stringify({
      version: 3, sources: [`webpack:///node_modules/pkg${hostile}/index.ts`], names: [], mappings: 'AAAA', sourcesContent: ['private source sentinel'],
    }), 'https://example.com/a.map');
    analysis.errors.push(hostile);
    analysis.warnings.push(hostile);
    report.bundles.push({
      url: `https://example.com/a.js${hostile}`, finalUrl: `https://cdn.example.com/a.js${hostile}`,
      kind: 'script', status: 'map-found', error: hostile,
      map: { url: `/a.map${hostile}`, finalUrl: `https://cdn.example.com/a.map${hostile}`, status: 'checked', referenceKind: 'annotation', retrieved: true, error: hostile, analysis },
    });
    Object.assign(report.summary, { discovered: 1, inspected: 1, mapsRetrieved: 1, mapsChecked: 1, sourceEntries: 1, embeddedSources: 1, languages: { TypeScript: 1 } });
    const output = render(report, { verbose: true });
    expect(output).not.toMatch(/[\x00-\x09\x0b-\x1f\x7f-\x9f\u2028\u2029\u202a-\u202e\u2066-\u2069]/);
    expect(output).not.toContain('\n\r');
    expect(output).toContain('Package path: pkg�]0;owned');
    expect(output).toContain('webpack:///node_modules/pkg�]0;owned');
    expect(output).not.toContain('private source sentinel');
    expect(JSON.stringify(report)).not.toContain('private source sentinel');
    expect(output).toContain('entries across analyzed bundle maps');
    expect(output).toContain('Entries can repeat across bundles');
    expect(output).toContain('not full conformance');
  });

  it('only adds intentional terminal escapes when color is enabled', () => {
    expect(render(emptyReport(), { color: true })).toContain('\x1b[1m');
    expect(render(emptyReport(), { color: false })).not.toContain('\x1b');
    expect(safeText('src/שלום/日本語.ts')).toBe('src/שלום/日本語.ts');
  });
});
