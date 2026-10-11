# sourcemapped

**What's behind this website's production JavaScript?**

A small, local CLI that inspects a page's JavaScript references and explains which source maps it publishes, what they contain, and what could not be inspected. No account, API key, browser, or hosted service.

Source maps connect deployed JavaScript to original source files. They can reveal TypeScript, styles, dependency paths, and embedded original content. Many sites deliberately keep them private. A missing public map is not a broken website.

## Try it

Node.js **22.12+** and npm are required. This repository is a working MVP; **no npm release was published as part of this work**.

```sh
git clone https://github.com/jkup/sourcemapped.git
cd sourcemapped
npm ci
npm run build
node dist/cli.js developer.mozilla.org
node dist/cli.js linear.app --verbose
node dist/cli.js https://example.com/assets/app.js --json
```

To use the command locally, run `npm link`, then `sourcemapped <url>`. The intended post-publication experience is `npx sourcemapped <url>`; package-name availability and publication still need to be confirmed.

## What you get

For a repeatable local example, run `npm run demo` after `npm ci`. It builds and scans the same small TypeScript app with and without source maps, prints concise reports for mapped, unmapped and mixed pages, and exits. Use `npm run demo -- --serve` to keep the pages open for browser exploration. See the [demo guide](examples/demo/README.md).

A default report leads with the result (example from the local mixed demo):

```text
  sourcemapped  · explore the source behind the bundle
  http://127.0.0.1:PORT/mixed/

  ✓ Maps analyzed for 1 JavaScript asset
  Analyzed maps for 1 of 2 discovered assets.

  2 source entries  2 TypeScript (by filename)
  2 of 2 include original source text in the maps.
  Source text is omitted from this report.

  1 asset did not advertise a map. Maps may be private or unlinked.
  Analyzed = basic structure and mapping checks passed, not full conformance.
```

Result icons and color distinguish analyzed maps, incomplete scans and target failures; no advertised maps is a neutral observation. Zero-valued outcome counters and successful HTTP logs are omitted from the default view. Failed requests and limits remain visible. Byte totals use B/KiB/MiB and describe decoded responses, not wire transfer sizes.

The complete report also shows scope, sampling limits, requests, and downloaded bytes. Colors are enabled only on a terminal; `NO_COLOR` and `--no-color` disable them. Progress uses stderr, keeping stdout clean.

```sh
sourcemapped <website-or-javascript-url>
sourcemapped <url> --verbose
sourcemapped <url> --max-assets 48
sourcemapped <url> --json > report.json
sourcemapped --help
```

`--max-assets N` selects up to the first N deduplicated static script/preload references in document order. N must contain only decimal digits and represent an integer from 1 to 9007199254740991 (leading zeros are accepted); both `--max-assets 48` and `--max-assets=48` work. The default comes from [DEFAULT_LIMITS](src/network.ts) and appears in `--help`. A smaller value narrows the sample; a larger value may reach later maps or just spend more requests without finding maps. It does not raise the shared request, byte, or time budgets, so the scan can stop before inspecting N assets. Direct JavaScript URLs still inspect one resource. JSON records the effective value as `limits.maxScripts` and retains all discovered/skipped references. Invalid values fail before scanning with exit 1 and stderr only.

Default output groups failed HTTP attempts by responding host and outcome, showing up to six groups with an overflow count. These count requests, not affected bundles: a shared map is fetched once, and redirects can cross hosts. Origin pauses and scan limits are reported separately; neither implies that private maps are a defect.

`--verbose` exposes each bundle, the map-reference method, HTTP outcomes, diagnostics, and a small source-path sample. Package names are supported by `node_modules` paths; they are not claims about the site's overall framework, dependency versions, or application architecture.

`--json` emits a versioned structured report: target, final URL, timestamp, scope, limits, bundle observations, per-map analysis, request evidence, and summary counts. Original source contents, symbol-name arrays, and inline map payloads are excluded. Reports still contain public URLs and path metadata; review them before sharing.

## Read the results accurately

| Result | Meaning |
| --- | --- |
| `no-reference` | Inspected JavaScript did not advertise a map through supported methods. No guessed URLs were requested. |
| `checked` / analyzed | Map passed implemented structure, encoding, and index checks. This is **not** full ECMA-426 or semantic validation. |
| `unavailable` | An advertised map could not be retrieved; evidence records HTTP, network, or timeout failures. |
| `invalid` | Retrieved data or an inline payload failed an implemented parsing/validation check. |
| `unsupported` | Indexed map or analysis size limit; not a claim of invalidity. |
| `limited` | Map retrieval/inline decoding stopped at a request, time, or byte limit. |
| `fetch-failed` / `skipped` | The JavaScript itself was inaccessible or outside the scan budget. Neither counts as no reference. |

Map totals count **bundle-to-map relationships**, not unique map URLs. Shared maps are downloaded once but analyzed for each bundle. Source totals sum entries from checked maps; one original file may appear in multiple bundles or slots. `uniqueSourcePaths` is deduplicated only within one map. Embedded content includes an empty string, and excludes missing/null content. Extensions and language labels describe source filenames, not verified source languages.

`mapsChecked / discovered` describes how many discovered assets have checked maps. `embeddedSources / sourceEntries` describes source slots containing text. **Neither measures generated-code coverage.** No quality score, byte-coverage estimate, execution coverage, or framework guessing is provided.

Exit code `1` means invalid invocation or the target could not be inspected. A completed report, including inaccessible/invalid maps or partial asset failures, exits `0`; automation should examine the JSON statuses.

## Scope and limits

- Fetches one HTML document, honors redirects and the first HTML base URL, and deduplicates external script and script/module preload references. These are static references, **not bundles observed executing in a browser**.
- Inspects a bounded document-order sample, adjustable with `--max-assets`; [DEFAULT_LIMITS](src/network.ts) defines the default sample size, concurrency, and total HTTP attempt cap (including redirects). A direct JavaScript URL skips HTML discovery.
- Uses an **8-second** fetch timeout across redirect hops, a **90-second** network scan deadline, **5** redirects per resource, **8 MiB** decoded response limit, and **64 MiB** aggregate download limit. Stream limits are checked per chunk, so counters may exceed thresholds by in-flight chunks before cancellation. Parser work can outlast the network deadline.
- Stops issuing requests to an origin after HTTP 429, or 503 with `Retry-After`. It does not retry; already in-flight requests may finish. Requests identify `sourcemapped` in their User-Agent and carry no authentication/cookies.
- Recognizes `SourceMap`, then legacy `X-SourceMap`, then trailing JavaScript `//#` / `//@ sourceMappingURL` annotations. Resolves external references relative to the final JavaScript URL and accepts percent-encoded/base64 data URLs. Supports the HTTP anti-XSSI prefix.
- Follows [ECMA-426's without-parsing extraction algorithm](https://tc39.es/ecma426/#sec-javascriptextractsourcemapurl). Block comments, annotations followed by executable code, and same-line-after-code annotations are not extracted. This avoids treating JavaScript string literals as map references.
- Uses `@jridgewell/trace-mapping` for decoding/resolution, with defensive schema, VLQ framing, source/name index checks, and warnings for generated positions outside retrieved scripts. Ordering, original-position bounds, and semantic correspondence are not comprehensively validated. Indexed maps are unsupported. Analysis is capped at 100,000 source/name/content entries, 100,000 mapping lines, and 500,000 segments.
- Does not execute JavaScript, inspect inline scripts, follow imports, crawl routes, authenticate, fetch original sources, search for secrets, or write recovered code. It does not discover CSS/Wasm maps. Dynamic chunks and challenge pages can hide most of an application.

The CLI follows explicitly referenced assets, including external hosts. Only HTTP(S) network URLs and inline map data URLs are supported; it never opens local-file URLs.

## Development

Agents and contributors: start with [AGENTS.md](AGENTS.md), use the [running roadmap](ROADMAP.md) for work status and acceptance criteria, and read the [documentation index](docs/README.md) for architecture, report semantics, and decision records.

```sh
npm ci
npm run check     # strict source/test typechecking, build once, then Vitest
npm pack         # build a publishable tarball; does not publish
```

Production dependencies: `htmlparser2` for HTML and `@jridgewell/trace-mapping` for maps. Native Node APIs handle networking, arguments, and terminal output.

[GitHub Actions CI](.github/workflows/ci.yml) runs `npm ci` and `npm run check` on pushes and pull requests for supported Node LTS versions. It needs no configured secrets and runs no public-site scans. See [CI maintenance](docs/ci.md) for version selection and [RM-02 evidence](docs/agent-runs/0001-ci.md).

```text
src/discover.ts   HTML references, target URLs, map linkage
src/network.ts    fetch budgets, redirects, inline decoding
src/analyze.ts    defensive map checks and bounded metadata
src/scan.ts       investigation and structured report
src/render.ts    readable terminal output
src/cli.ts       arguments, progress, exit behavior
```

Tests use synthetic maps, mocked native HTTP responses, and a loopback HTTP fixture for built-CLI subprocesses; no internet is required after dependency installation. `npm test` builds first, including for a focused run such as `npm test -- test/cli.test.ts`. See [test setup and coverage](docs/testing.md) for environment requirements and the packed-entry-point check. Research commands make public requests and save **metadata only**:

```sh
node scripts/probe.mjs      # preliminary 16-site study with bounded guesses
npm run build
node scripts/evaluate.mjs   # same sites through the production scanner
```

## Is this worth building?

**As a focused diagnostic utility, cautiously yes. As a reveal-any-website spectacle, not yet.** Only GitHub and MDN yielded analyzable maps among sixteen sampled homepages. The MVP found 21 checked maps among 212 inspected assets, while 371 other static references remained outside the sample. Conventional `.map` guesses found nothing in the baseline. These are convenience-sample observations, not web-wide prevalence estimates.

Website discovery, source recovery, validation, and treemaps already exist in other tools. This project's distinction is a bounded local report that makes the evidence understandable without exporting source code. See [RESEARCH.md](RESEARCH.md), the [MVP evaluation](EVALUATION.md), and [ROADMAP.md](ROADMAP.md). MIT licensed.
