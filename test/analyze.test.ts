import { describe, expect, it, vi } from 'vitest';
import { ignoreListValidator, mappingsValidator } from 'maplint';
import { analyzeMap } from '../src/analyze.js';

vi.mock('maplint', { spy: true });

const url = 'https://example.com/assets/app.js.map';
const analyze = (overrides: Record<string, unknown> = {}, generated?: string) => analyzeMap(JSON.stringify({
  version: 3, sources: ['../src/app.ts'], names: [], mappings: 'AAAA', ...overrides,
}), url, generated);

describe('analyzeMap', () => {
  it('treats inherited object-property names as unknown filename extensions', async () => {
    const result = await analyze({ sources: ['app.constructor', 'app.CONSTRUCTOR', 'app.toString', 'app.__proto__', 'app.ts'] });
    expect(result.status).toBe('checked');
    expect(result.languages).toEqual({ Other: 4, TypeScript: 1 });
    expect(Object.values(result.languages).reduce((sum, count) => sum + count, 0)).toBe(result.sourceEntries);
  });

  it('counts entries separately from resolved paths and includes empty embedded sources', async () => {
    const result = await analyze({ sources: ['../src/app.ts', '../src/./app.ts', null], sourcesContent: ['', null, 'unknown source'] });
    expect(result).toMatchObject({ status: 'checked', sourceEntries: 3, uniqueSourcePaths: 1, embeddedSources: 2, languages: { TypeScript: 2, Unknown: 1 }, mappingCount: 1 });
  });

  it('accepts optional names, empty mappings and null sources', async () => {
    const result = await analyzeMap('{"version":3,"sources":[null],"mappings":""}', url);
    expect(result.status).toBe('checked');
    expect(result.warnings).toContain('The map contains no mapping segments.');
  });

  it.each(['<html>404</html>', 'null', '[]', '"text"'])('rejects non-map JSON and non-JSON: %s', async raw => {
    expect((await analyzeMap(raw, url)).status).toBe('invalid');
  });

  it.each([
    { version: '3' }, { sources: [42] }, { sources: null }, { names: [null] },
    { sourceRoot: [] }, { file: false }, { sourcesContent: [true] }, { mappings: [] },
    { ignoreList: [1] }, { x_google_ignoreList: [-1] },
  ])('checks malformed metadata defensively: %j', async fields => {
    expect((await analyze(fields)).status).toBe('invalid');
  });

  it.each(['!', 'g', 'AA', 'AAA', 'AAAAAA', ',A', 'A,', 'A,,A', 'ggggggE', 'gggggggB'])('rejects malformed mapping framing: %s', async mappings => {
    expect((await analyze({ mappings })).status).toBe('invalid');
  });

  it('accepts a zero-padded VLQ within 32-bit bounds', async () => {
    expect((await analyze({ mappings: 'gggggggA' })).status).toBe('checked');
  });

  it.each(['ACAA', 'AAAAC', 'DAAA', 'AADA'])('rejects invalid mapping indexes or positions: %s', async mappings => {
    expect((await analyze({ mappings })).status).toBe('invalid');
  });

  it.each([
    [{ mappings: 'ACAA' }, 'line 1, column 0 referencing "sources[1]"'],
    [{ mappings: 'AAAAC' }, 'line 1, column 0 referencing "names[1]"'],
    [{ ignoreList: [1] }, '"ignoreList[0]" is 1'],
    [{ ignoreList: [0.5] }, '"ignoreList[0]" must be an integer'],
  ])('reports maplint diagnostics for %j', async (fields, diagnostic) => {
    const result = await analyze(fields);
    expect(result.status).toBe('invalid');
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain(diagnostic);
  });

  it('retains only the first validation error from a map with many bad segments', async () => {
    const result = await analyze({ mappings: ['ACAA', ...Array(100).fill('AAAA')].join(',') });
    expect(result.status).toBe('invalid');
    expect(result.errors).toHaveLength(1);
  });

  it('validates maps in memory without requiring original source files', async () => {
    const result = await analyze({ sources: ['file:///sourcemapped-nonexistent-fixture/app.ts'], ignoreList: [0] });
    expect(result.status).toBe('checked');
    expect(result.warnings).toEqual([]);
  });

  it('does not misrepresent indexed maps as checked regular maps', async () => {
    expect((await analyze({ sections: [] })).status).toBe('unsupported');
  });

  it.each(['sources', 'names', 'sourcesContent'])('bounds %s arrays before decoding', async key => {
    expect((await analyze({ [key]: Array(100_001).fill('') })).status).toBe('unsupported');
  });

  it('stops oversized ignore lists before maplint allocates diagnostics', async () => {
    vi.mocked(ignoreListValidator).mockClear();
    vi.mocked(mappingsValidator).mockClear();
    const result = await analyze({ ignoreList: Array(100_001).fill(1) });
    expect(result.status).toBe('unsupported');
    expect(result.warnings).toEqual(['ignoreList exceeds the analysis limit of 100,000 entries.']);
    expect(result.errors).toEqual([]);
    expect(ignoreListValidator).not.toHaveBeenCalled();
    expect(mappingsValidator).not.toHaveBeenCalled();
  });

  it('still validates ignore lists at the entry limit', async () => {
    expect((await analyze({ ignoreList: Array(100_000).fill(0) })).status).toBe('checked');
    const result = await analyze({ ignoreList: [...Array(99_999).fill(0), 1] });
    expect(result.status).toBe('invalid');
    expect(result.errors[0]).toContain('"ignoreList[99999]" is 1');
  });

  it('bounds both segments and empty generated lines before decoding', async () => {
    expect((await analyze({ mappings: 'A,'.repeat(500_000) + 'A' })).status).toBe('unsupported');
    expect((await analyze({ mappings: ';'.repeat(100_000) })).status).toBe('unsupported');
  });

  it('reports source content mismatch and generated position bounds without claiming coverage', async () => {
    const result = await analyze({ sourcesContent: [], mappings: 'EAAA' }, 'x');
    expect(result.status).toBe('checked');
    expect(result.warnings).toHaveLength(2);
    expect(result.embeddedSources).toBe(0);
  });

  it('counts UTF-16 columns and JavaScript line terminators', async () => {
    expect((await analyze({ mappings: 'EAAA' }, '🔥')).warnings).toEqual([]);
    expect((await analyze({ mappings: ';AAAA' }, '\u2028x')).warnings).toEqual([]);
  });

  it('counts filename extensions per source entry, including absent and unknown paths', async () => {
    const result = await analyze({ sources: ['app.TS?build=1', 'app.ts', 'types.d.ts', 'logo.svg#icon', 'LICENSE', null] });
    expect(result.extensions).toEqual({ '.ts': 3, '.svg': 1, '(none)': 1, '(unknown)': 1 });
    expect(Object.values(result.extensions).reduce((sum, count) => sum + count, 0)).toBe(result.sourceEntries);
    expect((await analyze({ sources: false })).extensions).toEqual({});
  });

  it('detects packages expressed through sourceRoot and retains resolved evidence', async () => {
    const result = await analyze({ sourceRoot: '../node_modules/react', sources: ['index.js'] });
    expect(result.packages).toEqual([{ name: 'react', sourceEntries: 1, examples: ['https://example.com/node_modules/react/index.js'] }]);
    expect(result.pathSamples).toEqual(['index.js']);
  });

  it('handles newline-heavy generated code within bounded line splitting', async () => {
    const result = await analyze({ mappings: 'AAAA' }, '\n'.repeat(200_000));
    expect(result.status).toBe('checked');
    expect(result.warnings).toEqual([]);
  });

  it('keeps bounded path and package evidence with scoped and pnpm package names', async () => {
    const sources = [
      'webpack://app/./node_modules/react/index.js',
      '../node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/index.ts',
      '../node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/other.ts',
      ...Array.from({ length: 30 }, (_, i) => `../src/${i}.tsx`),
    ];
    const result = await analyze({ sources, x_vendor: 'value' });
    expect(result.pathSamples).toHaveLength(8);
    expect(result.extensionFields).toEqual(['x_vendor']);
    expect(result.packages.map(({ name, sourceEntries }) => ({ name, sourceEntries }))).toEqual([
      { name: '@scope/pkg', sourceEntries: 2 }, { name: 'react', sourceEntries: 1 },
    ]);
    expect(JSON.stringify(result)).not.toContain('original source contents');
  });
});
