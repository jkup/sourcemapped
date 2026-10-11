<p align="center">
  <img src="https://raw.githubusercontent.com/jkup/sourcemapped/main/assets/logo.png" width="160" alt="A smiling folded map">
</p>

# sourcemapped

**Know what your production JavaScript reveals.**

Give sourcemapped a URL to find public source maps, spot broken map links, and see whether they include your original source code. Check a deployment in one command, without digging through minified bundles in DevTools.

## Try it

Requires Node.js **22.12 or newer**.

```sh
npx @jkup/sourcemapped https://example.com
```

Example report:

```text
◇ sourcemapped  https://example.com

✓ 1 asset mapped   ○ 1 asset without a map reference
  2 TypeScript source entries · 2 with embedded source

Static scan · --verbose for details
```

Or install it globally:

```sh
npm install -g @jkup/sourcemapped
sourcemapped https://example.com
```

## Look closer

```sh
sourcemapped https://example.com --verbose       # Paths, map outcomes and requests
sourcemapped https://example.com --json          # Structured report
sourcemapped https://example.com/app.js          # Inspect one JavaScript file
sourcemapped --help                             # Limits and other options
```

Use `--verbose` to see which bundles have usable maps, which map requests failed, and the source filenames listed inside each map. Use `--json` to inspect the same findings in scripts. Reports contain metadata, never the original source text.

## What it checks

sourcemapped reads one page's external scripts and JavaScript preloads, then checks the source maps they advertise. You can also point it directly at a JavaScript file.

It does not execute the page, follow imports, crawl other routes, guess map URLs, or fetch original source files. Missing references don't prove maps are absent: they may be private or unlinked. A checked map passed basic structure and mapping checks, not full conformance testing.

See the [report contract](https://github.com/jkup/sourcemapped/blob/main/docs/report-contract.md) for scan limits, JSON fields, and exit codes.

## Run the demo

The repository includes a tiny app served with maps, without maps, and with a mixture of both.

```sh
git clone https://github.com/jkup/sourcemapped.git
cd sourcemapped
npm ci
npm run --silent demo -- --serve
```

Open the printed URL to try the app. Press Ctrl+C to stop. Use `--all` to compare all three reports; see the [demo guide](https://github.com/jkup/sourcemapped/blob/main/examples/demo/README.md).

From inside this checkout, scan a URL with `node dist/cli.js <url>`. Run the `npx` command outside the repository so npm uses the published package.

## Contribute

Run `npm run check` before submitting changes. Start with the [contributor guidance](https://github.com/jkup/sourcemapped/blob/main/AGENTS.md) and [technical docs](https://github.com/jkup/sourcemapped/blob/main/docs/README.md).

[MIT licensed](https://github.com/jkup/sourcemapped/blob/main/LICENSE).
