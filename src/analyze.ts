import { TraceMap, decodedMappings } from '@jridgewell/trace-mapping';
import { ignoreListValidator, mappingsValidator, SEVERITY_ERROR, type SourceMapFile } from 'maplint';

export interface MapAnalysis {
  /** checked means passes implemented checks, not complete ECMA-426 conformance. */
  status: 'checked' | 'invalid' | 'unsupported';
  errors: string[];
  warnings: string[];
  sourceEntries: number;
  /** Unique resolved non-null paths within this map only. */
  uniqueSourcePaths: number;
  embeddedSources: number;
  languages: Record<string, number>;
  extensions: Record<string, number>;
  packages: Array<{ name: string; sourceEntries: number; examples: string[] }>;
  pathSamples: string[];
  extensionFields: string[];
  mappingCount: number;
}

const knownFields = new Set(['version', 'file', 'sourceRoot', 'sources', 'sourcesContent', 'names', 'mappings', 'ignoreList', 'sections']);
const terminal = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef';
const continuation = 'ghijklmnopqrstuvwxyz0123456789+/';
const languageByExtension: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TSX', js: 'JavaScript', jsx: 'JSX', mjs: 'JavaScript', cjs: 'JavaScript',
  mts: 'TypeScript', cts: 'TypeScript', vue: 'Vue', svelte: 'Svelte', css: 'CSS', scss: 'SCSS', sass: 'Sass', json: 'JSON',
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Check framing only. Numeric VLQ decoding belongs to trace-mapping. */
function checkFraming(mappings: string): string | undefined {
  let digits = 0;
  let fields = 0;
  let afterComma = false;
  for (const char of `${mappings};`) {
    if (char === ',' || char === ';') {
      if (digits) return 'Unterminated VLQ value in mappings.';
      if ((fields === 0 && (char === ',' || afterComma)) || (fields !== 0 && fields !== 1 && fields !== 4 && fields !== 5)) {
        return 'Mapping segments must contain 1, 4, or 5 fields.';
      }
      fields = 0;
      afterComma = char === ',';
      continue;
    }
    digits++;
    if (terminal.includes(char)) {
      if ((digits > 7 && char !== 'A') || (digits === 7 && !'ABCD'.includes(char))) return 'VLQ exceeds the supported 32-bit encoding.';
      fields++;
      digits = 0;
      afterComma = false;
    } else if (!continuation.includes(char)) {
      return 'Mappings contain a character outside the base64 VLQ alphabet.';
    } else if ((digits > 7 && char !== 'g') || (digits === 7 && !'ghij'.includes(char))) {
      return 'VLQ exceeds the supported 32-bit encoding.';
    }
  }
  return undefined;
}

/** Analyze metadata without retrieving original source files or retaining source contents. */
export async function analyzeMap(raw: string, mapUrl: string, generatedSource?: string): Promise<MapAnalysis> {
  const result: MapAnalysis = {
    status: 'invalid', errors: [], warnings: [], sourceEntries: 0, uniqueSourcePaths: 0,
    embeddedSources: 0, languages: {}, extensions: {}, packages: [], pathSamples: [], extensionFields: [], mappingCount: 0,
  };
  const fail = (message: string): MapAnalysis => { result.errors.push(message); return result; };
  const unsupported = (message: string): MapAnalysis => {
    result.status = 'unsupported'; result.warnings.push(message); return result;
  };
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return fail('Response is not valid JSON.'); }
  if (!object(parsed)) return fail('Source map must be a JSON object.');
  if (parsed.version !== 3) return fail('Source map version must be 3.');
  if ('sections' in parsed) {
    return unsupported('Indexed source maps are not analyzed by this version.');
  }
  // Cap arrays before validators can allocate a diagnostic for every entry.
  for (const key of ['sources', 'names', 'sourcesContent', 'ignoreList']) {
    if (Array.isArray(parsed[key]) && parsed[key].length > 100_000) {
      return unsupported(`${key} exceeds the analysis limit of 100,000 entries.`);
    }
  }
  if (!Array.isArray(parsed.sources) || !parsed.sources.every(value => value === null || typeof value === 'string')) {
    return fail('sources must be an array of strings or null.');
  }
  if (typeof parsed.mappings !== 'string') return fail('mappings must be a string.');
  // Bound parser allocation before constructing decoded arrays. Empty lines also allocate.
  let segmentCount = 0;
  let lineCount = 1;
  let inSegment = false;
  for (const char of parsed.mappings) {
    if (char === ';' || char === ',') {
      inSegment = false;
      if (char === ';' && ++lineCount > 100_000) return unsupported('Mappings exceed the analysis limit of 100,000 generated lines.');
    } else if (!inSegment) {
      inSegment = true;
      if (++segmentCount > 500_000) return unsupported('Mappings exceed the analysis limit of 500,000 segments.');
    }
  }
  for (const key of ['sourceRoot', 'file']) {
    if (key in parsed && typeof parsed[key] !== 'string') return fail(`${key} must be a string when present.`);
  }
  if ('names' in parsed && (!Array.isArray(parsed.names) || !parsed.names.every(value => typeof value === 'string'))) {
    return fail('names must be an array of strings when present.');
  }
  if ('sourcesContent' in parsed && (!Array.isArray(parsed.sourcesContent) || !parsed.sourcesContent.every(value => value === null || typeof value === 'string'))) {
    return fail('sourcesContent must be an array of strings or null when present.');
  }
  const sources = parsed.sources as Array<string | null>;
  if ('ignoreList' in parsed && (!Array.isArray(parsed.ignoreList) || !parsed.ignoreList.every(value => typeof value === 'number'))) {
    return fail('ignoreList must be an array of numbers.');
  }
  if ('x_google_ignoreList' in parsed && (!Array.isArray(parsed.x_google_ignoreList) || !parsed.x_google_ignoreList.every(value => Number.isSafeInteger(value) && value >= 0 && value < sources.length))) {
    return fail('x_google_ignoreList must contain valid source indexes.');
  }
  const framingError = checkFraming(parsed.mappings);
  if (framingError) return fail(framingError);
  const names = (parsed.names ?? []) as string[];
  const sourcesContent = parsed.sourcesContent as Array<string | null> | undefined;
  if (sourcesContent && sourcesContent.length !== sources.length) {
    result.warnings.push('sourcesContent length differs from sources; only matching source slots are counted.');
  }
  try {
    // Only pure validators: downloaded source paths must never be checked on disk.
    // Schema, allocation and VLQ framing guards above run before maplint decodes.
    const input: SourceMapFile = {
      path: mapUrl,
      map: {
        version: 3, sources, names, mappings: parsed.mappings,
        ...('ignoreList' in parsed ? { ignoreList: parsed.ignoreList as number[] } : {}),
      },
    };
    for (const validator of [ignoreListValidator, mappingsValidator]) {
      const messages = await validator(input);
      const error = messages.find(message => message.severity === SEVERITY_ERROR);
      if (error) return fail(error.message);
      for (const message of messages.slice(0, 8)) result.warnings.push(message.message);
    }
    const map = new TraceMap({
      version: 3, sources, names, mappings: parsed.mappings,
      ...(typeof parsed.sourceRoot === 'string' ? { sourceRoot: parsed.sourceRoot } : {}),
    }, mapUrl);
    const generatedLines = generatedSource?.split(/\r\n|[\r\n\u2028\u2029]/, 100_001);
    let outsideGenerated = false;
    for (const [lineIndex, line] of decodedMappings(map).entries()) {
      for (const segment of line) {
        result.mappingCount++;
        if (!segment.every(value => Number.isSafeInteger(value) && value >= 0)) return fail('Mappings contain negative or unsafe positions or indexes.');
        if (generatedLines && (generatedLines[lineIndex] === undefined || segment[0] > generatedLines[lineIndex]!.length)) outsideGenerated = true;
      }
    }
    if (outsideGenerated) result.warnings.push('Some mapping positions exceed the retrieved JavaScript; the map may describe a different file.');
    if (!result.mappingCount) result.warnings.push('The map contains no mapping segments.');
    const paths = new Set<string>();
    const packages = new Map<string, { name: string; sourceEntries: number; examples: string[] }>();
    for (const [index, source] of sources.entries()) {
      if (typeof sourcesContent?.[index] === 'string') result.embeddedSources++;
      if (source === null) {
        result.languages.Unknown = (result.languages.Unknown ?? 0) + 1;
        result.extensions['(unknown)'] = (result.extensions['(unknown)'] ?? 0) + 1;
        continue;
      }
      const resolved = map.resolvedSources[index];
      if (resolved !== undefined) paths.add(resolved);
      if (result.pathSamples.length < 8 && !result.pathSamples.includes(source)) result.pathSamples.push(source);
      const path = source.replaceAll('\\', '/').split(/[?#]/, 1)[0] ?? '';
      const extension = /\.([a-z0-9]+)$/i.exec(path)?.[1]?.toLowerCase();
      const extensionLabel = extension ? `.${extension}` : '(none)';
      result.extensions[extensionLabel] = (result.extensions[extensionLabel] ?? 0) + 1;
      const language = extension && Object.hasOwn(languageByExtension, extension)
        ? languageByExtension[extension]! : 'Other';
      result.languages[language] = (result.languages[language] ?? 0) + 1;
      // Use the innermost node_modules segment, including pnpm's nested layout.
      const evidence = /(?:^|\/)node_modules\//.test(path) ? source : (resolved ?? source);
      const packageEvidencePath = evidence.replaceAll('\\', '/').split(/[?#]/, 1)[0] ?? '';
      if (!/(?:^|\/)node_modules\//.test(packageEvidencePath)) continue;
      const packagePath = packageEvidencePath.slice(packageEvidencePath.lastIndexOf('node_modules/') + 'node_modules/'.length);
      const name = /^(?:@[^/]+\/)?[^/]+/.exec(packagePath)?.[0];
      if (!name || name.startsWith('.')) continue;
      const entry = packages.get(name) ?? { name, sourceEntries: 0, examples: [] };
      entry.sourceEntries++;
      if (entry.examples.length < 2 && !entry.examples.includes(evidence)) entry.examples.push(evidence);
      packages.set(name, entry);
    }
    result.sourceEntries = sources.length;
    result.uniqueSourcePaths = paths.size;
    result.packages = [...packages.values()].sort((a, b) => b.sourceEntries - a.sourceEntries || a.name.localeCompare(b.name)).slice(0, 20);
    result.extensionFields = Object.keys(parsed).filter(key => !knownFields.has(key)).sort().slice(0, 20);
    result.status = 'checked';
    return result;
  } catch {
    return fail('Source map could not be decoded by the source-map parser.');
  }
}
