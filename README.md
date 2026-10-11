<p align="center">
  <img src="https://raw.githubusercontent.com/jkup/sourcemapped/main/assets/logo.png" width="160" alt="A smiling folded map">
</p>

# sourcemapped

See which source maps a website's JavaScript publishes, and what they reveal about its original files.

## Try it

Requires Node.js **22.12 or newer**.

```sh
npx @jkup/sourcemapped https://example.com
```

```text
◇ sourcemapped  https://example.com

✓ 1 asset mapped   ○ 1 asset without a map reference
  2 TypeScript source entries · 2 with embedded source

Static scan · --verbose for details
```

Illustrative output. In your terminal, mapped assets appear in cyan; missing map references stay neutral.

For a permanent installation:

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

Reports include map coverage, source filenames, file extensions, and whether original text is embedded. They omit source bodies and symbol-name arrays. A missing map reference is normal: maps may be private or unlinked.

This is a bounded static scan of external scripts and JavaScript preloads. It does not run a browser, follow imports, crawl routes, guess map URLs, or fetch original source files. A checked map passed basic structure and mapping checks, not full conformance testing.

Exit status is `1` for invalid input or a failed target request. Individual asset/map failures remain in the report and do not make an otherwise completed scan fail. See the [report contract](https://github.com/jkup/sourcemapped/blob/main/docs/report-contract.md) for JSON fields and count meanings.

## Run the demo

The repository includes a tiny app served with maps, without maps, and with a mixture of both.

```sh
git clone https://github.com/jkup/sourcemapped.git
cd sourcemapped
npm ci
npm run --silent demo -- --serve
```

Open the printed URL to try the app. Press Ctrl+C to stop. Use `--all` to compare all three reports; see the [demo guide](https://github.com/jkup/sourcemapped/blob/main/examples/demo/README.md).

## Contribute

Run `npm run check` before submitting changes. Start with the [contributor guidance](https://github.com/jkup/sourcemapped/blob/main/AGENTS.md), [roadmap](https://github.com/jkup/sourcemapped/blob/main/ROADMAP.md), and [technical docs](https://github.com/jkup/sourcemapped/blob/main/docs/README.md).

[MIT licensed](https://github.com/jkup/sourcemapped/blob/main/LICENSE).
