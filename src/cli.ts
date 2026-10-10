#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { DEFAULT_LIMITS } from './network.js';
import { render, safeText } from './render.js';
import { scan } from './scan.js';

const help = `sourcemapped — what's behind this website's production JavaScript?

Usage: sourcemapped <website-or-javascript-url> [--json] [--verbose] [--max-assets N]

  --max-assets N  Select first N static script/preload references (default: ${DEFAULT_LIMITS.maxScripts})
                  Decimal integer 1–9007199254740991; other budgets still apply
  --json       Structured metadata and request evidence, no source contents
  --verbose    Show bundle URLs, map references, paths, and diagnostics
  --no-color   Disable terminal colors (also honors NO_COLOR)
  --help       Show this help
  --version    Show version

Inspects one HTML page or one direct JavaScript URL.
The asset limit applies only to HTML; it does not guarantee more maps.
No browser execution, crawling, guessed map URLs, or source extraction.
Missing public maps are normal. Node.js 22.12+ required.
`;

try {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'max-assets': { type: 'string' },
      json: { type: 'boolean' }, verbose: { type: 'boolean' },
      'no-color': { type: 'boolean' }, help: { type: 'boolean', short: 'h' }, version: { type: 'boolean', short: 'v' },
    },
  });
  if (values.help) process.stdout.write(help);
  else if (values.version) process.stdout.write('0.1.0\n');
  else {
    if (positionals.length !== 1) throw new Error('Provide one website or JavaScript URL. Use --help for usage.');
    const rawMaxAssets = values['max-assets'];
    let maxScripts: number | undefined;
    if (rawMaxAssets !== undefined) {
      maxScripts = Number(rawMaxAssets);
      if (!/^[0-9]+$/.test(rawMaxAssets) || !Number.isSafeInteger(maxScripts) || maxScripts < 1) {
        throw new Error('--max-assets must be a decimal integer from 1 to 9007199254740991.');
      }
    }
    const interactive = Boolean(process.stderr.isTTY && !values.json);
    let report;
    try {
      report = await scan(positionals[0]!, { limits: maxScripts === undefined ? undefined : { maxScripts }, onProgress: interactive ? message => process.stderr.write(`\r\x1b[2K  ${message}…`) : undefined });
    } finally { if (interactive) process.stderr.write('\r\x1b[2K'); }
    process.stdout.write(values.json ? `${JSON.stringify(report, null, 2)}\n` : render(report, { verbose: values.verbose, color: Boolean(process.stdout.isTTY && !values['no-color'] && process.env.NO_COLOR === undefined) }));
    if (report.error) process.exitCode = 1;
  }
} catch (error) {
  process.stderr.write(`sourcemapped: ${safeText(error instanceof Error ? error.message : 'Unexpected error')}\n`);
  process.exitCode = 1;
}
