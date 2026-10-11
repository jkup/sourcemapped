import { describe, expect, it } from 'vitest';
import { discoverMapReference, discoverScripts, normalizeTarget } from '../src/discover.js';

describe('target normalization', () => {
  it('defaults to HTTPS and removes fragments', () => {
    expect(normalizeTarget(' example.com/app?q=1#fragment ')).toBe('https://example.com/app?q=1');
    expect(normalizeTarget('//example.com/app')).toBe('https://example.com/app');
    expect(normalizeTarget('http://example.com/app')).toBe('http://example.com/app');
    expect(normalizeTarget('example.com:8443/app')).toBe('https://example.com:8443/app');
  });
  it('rejects empty targets, credentials and unsupported schemes', () => {
    for (const value of ['', 'file:///tmp/a.js', 'data:text/javascript,1', 'https://u:p@example.com/']) {
      expect(() => normalizeTarget(value)).toThrow();
    }
  });
});

describe('HTML discovery', () => {
  it('uses the first base href against the final response URL and decodes entities', () => {
    const result = discoverScripts(`
      <script src="one.js?a=1&amp;b=2"></script>
      <base href="../assets/"><base href="https://wrong.example/">
      <script type="module" src="two.mjs"></script>
    `, 'https://example.com/final/page');
    expect(result.scripts).toEqual([
      { url: 'https://example.com/assets/one.js?a=1&b=2', kind: 'script' },
      { url: 'https://example.com/assets/two.mjs', kind: 'script' },
    ]);
  });
  it('deduplicates preloads and scripts, preferring actual script references', () => {
    const result = discoverScripts(`
      <link rel="modulepreload" href="/a.js#one">
      <link rel="preload" as="script" href="/b.js">
      <script src="/a.js#two"></script>
      <script src="/a.js"></script>
      <link rel="preload" as="style" href="/style.css">
    `, 'https://example.com/');
    expect(result.scripts).toEqual([
      { url: 'https://example.com/a.js', kind: 'script' },
      { url: 'https://example.com/b.js', kind: 'preload' },
    ]);
  });
  it('skips data blocks, non-HTTP sources, and markup inside scripts/comments', () => {
    const result = discoverScripts(`
      <!-- <script src="fake.js"></script> -->
      <script type="application/json" src="data.js">{}</script>
      <script type="application/ld+json">{}</script>
      <script type="importmap">{}</script>
      <script>const s = '<script src="fake2.js">';</script>
      <script type="module">import 'x';</script>
      <script src="data:text/javascript,1"></script>
      <script src="javascript:alert(1)"></script>
      <script type="text/javascript" src="/extensionless"></script>
      <script src="https://user:pass@example.com/a.js"></script>
    `, 'https://example.com/');
    expect(result.scripts).toEqual([{ url: 'https://example.com/extensionless', kind: 'script' }]);
    expect(result.inlineScripts).toBe(2);
    expect(result.warnings).toHaveLength(1);
  });
  it('ignores an invalid first base without adopting later bases', () => {
    const result = discoverScripts('<base href="http://["><base href="https://wrong.example"><script src="a.js"></script>', 'https://example.com/');
    expect(result.scripts[0]?.url).toBe('https://example.com/a.js');
    expect(result.warnings).toHaveLength(1);
  });
});

describe('source-map references', () => {
  const discover = (source: string) => discoverMapReference(source, new Headers());
  it('handles newline-heavy bundles without changing trailing-comment semantics', () => {
    const trailing = '\r\n\u2028\u2029'.repeat(50_000);
    expect(discover(`run();\n//# sourceMappingURL=app.map${trailing}`)).toEqual({ reference: 'app.map', kind: 'annotation' });
    expect(discover(`run();${trailing}`)).toBeNull();
  });
  it('prioritizes standard and legacy headers over annotations', () => {
    const source = '//# sourceMappingURL=inline.map';
    expect(discoverMapReference(source, new Headers({ SourceMap: 'standard.map', 'X-SourceMap': 'legacy.map' })))
      .toEqual({ reference: 'standard.map', kind: 'header' });
    expect(discoverMapReference(source, new Headers({ 'X-SourceMap': 'legacy.map' })))
      .toEqual({ reference: 'legacy.map', kind: 'legacy-header' });
  });
  it('finds the last matching trailing annotation across all JS line terminators', () => {
    for (const separator of ['\n', '\r', '\r\n', '\u2028', '\u2029']) {
      expect(discover(['code();', '//# sourceMappingURL=first.map', '\t//@ sourceMappingURL=last.map', '// trailing comment', ' '].join(separator)))
        .toEqual({ reference: 'last.map', kind: 'annotation' });
    }
  });
  it('accepts inline data map references and an empty annotation', () => {
    expect(discover('//# sourceMappingURL=data:application/json;base64,e30='))
      .toEqual({ reference: 'data:application/json;base64,e30=', kind: 'annotation' });
    expect(discover('//# sourceMappingURL='))
      .toEqual({ reference: '', kind: 'annotation' });
  });
  it('does not search through trailing code, block comments or string/template literals', () => {
    for (const source of [
      '//# sourceMappingURL=x.map\ncode();',
      'code(); //# sourceMappingURL=x.map',
      '/*# sourceMappingURL=x.map */',
      '"//# sourceMappingURL=x.map";',
      'const a = `\n//# sourceMappingURL=x.map\n`;',
      'const a = `\n//# sourceMappingURL=x.map\n// `',
      '/*\n//# sourceMappingURL=x.map\n// */',
      '//# sourceMappingURL=x.map\n// a "quote"',
      '//# sourceMappingURL=x.map\n/',
    ]) expect(discover(source)).toBeNull();
  });
  it('requires the annotation marker directly after the slashes and a URL without spaces', () => {
    expect(discover('// # sourceMappingURL=x.map')).toBeNull();
    expect(discover('//# sourceMappingURL=x y.map')).toBeNull();
    expect(discover('//# sourceMappingURL=x.map\n// ordinary comment')).not.toBeNull();
  });
});
