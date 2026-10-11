import { describe, expect, it } from 'vitest';
import { analyzeMap } from '../src/analyze.js';

const url = 'https://example.com/assets/app.js.map';
const analyze = (overrides: Record<string, unknown> = {}, generated?: string) => analyzeMap(JSON.stringify({
  version: 3, sources: ['../src/app.ts'], names: [], mappings: 'AAAA', ...overrides,
}), url, generated);

describe('analyzeMap', () => {
  it('treats inherited object-property names as unknown filename extensions', () => {
    const result = analyze({ sources: ['app.constructor', 'app.CONSTRUCTOR', 'app.toString', 'app.__proto__', 'app.ts'] });
    expect(result.status).toBe('checked');
    expect(result.languages).toEqual({ Other: 4, TypeScript: 1 });
    expect(Object.values(result.languages).reduce((sum, count) => sum + count, 0)).toBe(result.sourceEntries);
  });

  it('counts entries separately from resolved paths and includes empty embedded sources', () => {
    const result = analyze({ sources: ['../src/app.ts', '../src/./app.ts', null], sourcesContent: ['', null, 'unknown source'] });
    expect(result).toMatchObject({ status: 'checked', sourceEntries: 3, uniqueSourcePaths: 1, embeddedSources: 2, languages: { TypeScript: 2, Unknown: 1 }, mappingCount: 1 });
  });

  it('accepts optional names, empty mappings and null sources', () => {
    const result = analyzeMap('{"version":3,"sources":[null],"mappings":""}', url);
    expect(result.status).toBe('checked');
    expect(result.warnings).toContain('The map contains no mapping segments.');
  });

  it.each(['<html>404</html>', 'null', '[]', '"text"'])('rejects non-map JSON and non-JSON: %s', raw => {
    expect(analyzeMap(raw, url).status).toBe('invalid');
  });

  it.each([
    { version: '3' }, { sources: [42] }, { sources: null }, { names: [null] },
    { sourceRoot: [] }, { file: false }, { sourcesContent: [true] }, { mappings: [] },
    { ignoreList: [1] }, { x_google_ignoreList: [-1] },
  ])('checks malformed metadata defensively: %j', fields => {
    expect(analyze(fields).status).toBe('invalid');
  });

  it.each(['!', 'g', 'AA', 'AAA', 'AAAAAA', ',A', 'A,', 'A,,A', 'ggggggE', 'gggggggB'])('rejects malformed mapping framing: %s', mappings => {
    expect(analyze({ mappings }).status).toBe('invalid');
  });

  it('accepts a zero-padded VLQ within 32-bit bounds', () => {
    expect(analyze({ mappings: 'gggggggA' }).status).toBe('checked');
  });

  it.each(['ACAA', 'AAAAC', 'DAAA', 'AADA'])('rejects invalid mapping indexes or positions: %s', mappings => {
    expect(analyze({ mappings }).status).toBe('invalid');
  });

  it('does not misrepresent indexed maps as checked regular maps', () => {
    expect(analyze({ sections: [] }).status).toBe('unsupported');
  });

  it.each(['sources', 'names', 'sourcesContent'])('bounds %s arrays before decoding', key => {
    expect(analyze({ [key]: Array(100_001).fill('') }).status).toBe('unsupported');
  });

  it('bounds both segments and empty generated lines before decoding', () => {
    expect(analyze({ mappings: 'A,'.repeat(500_000) + 'A' }).status).toBe('unsupported');
    expect(analyze({ mappings: ';'.repeat(100_000) }).status).toBe('unsupported');
  });

  it('reports source content mismatch and generated position bounds without claiming coverage', () => {
    const result = analyze({ sourcesContent: [], mappings: 'EAAA' }, 'x');
    expect(result.status).toBe('checked');
    expect(result.warnings).toHaveLength(2);
    expect(result.embeddedSources).toBe(0);
  });

  it('counts UTF-16 columns and JavaScript line terminators', () => {
    expect(analyze({ mappings: 'EAAA' }, '🔥').warnings).toEqual([]);
    expect(analyze({ mappings: ';AAAA' }, '\u2028x').warnings).toEqual([]);
  });

  it('counts filename extensions per source entry, including absent and unknown paths', () => {
    const result = analyze({ sources: ['app.TS?build=1', 'app.ts', 'types.d.ts', 'logo.svg#icon', 'LICENSE', null] });
    expect(result.extensions).toEqual({ '.ts': 3, '.svg': 1, '(none)': 1, '(unknown)': 1 });
    expect(Object.values(result.extensions).reduce((sum, count) => sum + count, 0)).toBe(result.sourceEntries);
    expect(analyze({ sources: false }).extensions).toEqual({});
  });

  it('detects packages expressed through sourceRoot and retains resolved evidence', () => {
    const result = analyze({ sourceRoot: '../node_modules/react', sources: ['index.js'] });
    expect(result.packages).toEqual([{ name: 'react', sourceEntries: 1, examples: ['https://example.com/node_modules/react/index.js'] }]);
    expect(result.pathSamples).toEqual(['index.js']);
  });

  it('handles newline-heavy generated code within bounded line splitting', () => {
    const result = analyze({ mappings: 'AAAA' }, '\n'.repeat(200_000));
    expect(result.status).toBe('checked');
    expect(result.warnings).toEqual([]);
  });

  it('keeps bounded path and package evidence with scoped and pnpm package names', () => {
    const sources = [
      'webpack://app/./node_modules/react/index.js',
      '../node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/index.ts',
      '../node_modules/.pnpm/@scope+pkg@1/node_modules/@scope/pkg/other.ts',
      ...Array.from({ length: 30 }, (_, i) => `../src/${i}.tsx`),
    ];
    const result = analyze({ sources, x_vendor: 'value' });
    expect(result.pathSamples).toHaveLength(8);
    expect(result.extensionFields).toEqual(['x_vendor']);
    expect(result.packages.map(({ name, sourceEntries }) => ({ name, sourceEntries }))).toEqual([
      { name: '@scope/pkg', sourceEntries: 2 }, { name: 'react', sourceEntries: 1 },
    ]);
    expect(JSON.stringify(result)).not.toContain('original source contents');
  });
});
