# Architecture

The CLI is a local pipeline: normalize input, retrieve a resource, discover static JavaScript, retrieve advertised maps, analyze metadata, then render one report. It neither executes the target's code nor recovers its source tree.

## Data flow and boundaries

```text
cli.ts → scan.ts → discover.ts
                → network.ts
                → analyze.ts → maplint + @jridgewell/trace-mapping
       ← Report
       → render.ts (terminal) or JSON.stringify (JSON)
```

| Module | Owns | Keep out |
| --- | --- | --- |
| [discover.ts](../src/discover.ts) | URL normalization, HTML parsing via htmlparser2, first base URL, deduplication, source-map linkage | HTTP, map analysis, terminal output |
| [network.ts](../src/network.ts) | One scan's HTTP budget/evidence, stream cancellation, redirects, origin pauses, inline decoding | Crawling decisions, original-source retrieval |
| [analyze.ts](../src/analyze.ts) | Defensive checks, parser integration, bounded source/path/package metadata | Network, filesystem writes, recovered contents in results |
| [scan.ts](../src/scan.ts) | Target classification, workers, map-fetch cache, statuses and summary, `Report` type | Terminal formatting, speculative probes |
| [render.ts](../src/render.ts) | Report presentation, bounded default display, verbose evidence, terminal sanitization | Fetching or recomputing analysis conclusions |
| [package.ts](../src/package.ts) | Manifest-derived CLI version and HTTP identity | Separate version literals or cwd-dependent lookup |
| [cli.ts](../src/cli.ts) | Arguments, progress, output mode, exit status | Analysis or discovery rules |

The analyzer uses maplint’s pure mapping and ignore-list validators after defensive input guards, then trace-mapping for metadata decoding and path resolution. It never invokes maplint’s CLI or filesystem validators. See [ADR 0007](decisions/0007-maplint-validators.md) for dependency and compatibility tradeoffs.

The TypeScript sources use ESM with `.js` import specifiers. `tsc` emits JavaScript and declarations into ignored `dist/`; `package.json` points the executable there. The production CLI has no bundler or runtime service. The local demo uses development-only esbuild; no generated code is checked into Git.

## Scan lifecycle

1. Normalize an HTTP(S) target; bare domains default to HTTPS. Reject embedded credentials.
2. Create one `Fetcher` with shared budgets. Fetch the target and classify the response using MIME type, HTML markers, and JavaScript filename hints.
3. A direct JavaScript response is reused. An HTML response is parsed for external scripts and script/module preloads; inline scripts are counted but not inspected. References are deduplicated in document order, with script classification preferred when the same URL is also preloaded.
4. Inspect the bounded candidate list with a small worker pool. A reference is resolved against the final JavaScript URL. HTTP map fetch promises are cached by resolved reference URL, including failures and using fragment-free cache keys; reference URLs retain their fragments as evidence. A shared map can still be analyzed against multiple bundles.
5. Decode inline payloads or retrieve a map. Strip the permitted HTTP anti-XSSI prefix for network maps. The analyzer returns metadata and diagnostics without source bodies.
6. Aggregate a `Report`. The terminal and JSON views consume that same evidence. Individual failures remain in the report instead of turning into an empty successful scan.

Terminal failure groups come from request evidence, grouped by responding host (including port) and HTTP status or failure kind. They count actual attempts, including failed redirect hops, rather than bundle/map relationships; cached map failures therefore count once. The default view shows the six largest groups (ties by host/outcome), then an overflow count. Pre-request origin pauses have no request entry and are summarized separately from bundle/map errors; skipped/limited relationships retain their own totals. Verbose output keeps the per-bundle and per-request evidence. Grouping only formats the report; origin-pause totals use typed `errorCode`/`httpStatus` evidence rather than matching error prose. See ADR 0005 for the additive fields; statuses and count semantics are unchanged.

See the [report contract](report-contract.md) for status/count semantics and the [source-map decision](decisions/0003-analysis-and-report-semantics.md) for validation limits.

## Resource control and trust boundaries

[DEFAULT_LIMITS](../src/network.ts) is the authority for networking defaults; [analyze.ts](../src/analyze.ts) defines parser-allocation caps. The public CLI exposes `--max-assets N` as an override of `maxScripts` only; it validates decimal digits and the positive safe-integer range before scanning. HTML candidates remain a document-order slice of all deduplicated references; direct JavaScript responses are still reused regardless of that limit. All other public budgets keep their defaults. The internal `scan` options allow test/research overrides. See [ADR 0004](decisions/0004-opt-in-asset-limit.md) for the choice and compatibility assessment.

Redirects and failed attempts consume requests. Bytes are decoded response bytes measured as chunks arrive, not wire transfer size. A threshold may be exceeded by in-flight chunks before cancellation. Fetch timeout includes redirect hops; the scan deadline bounds network work, not synchronous parser CPU time. Rate-limit pauses prevent later requests to that origin; already running requests can finish.

HTML, paths, URLs, headers, and map contents are untrusted input. Do not evaluate them or use source paths as filesystem destinations. Terminal rendering sanitizes control/bidi characters. JSON retains metadata strings but omits original content and inline payloads. The local CLI can inspect localhost and follows referenced external hosts; it is not a server-side arbitrary-URL security boundary.

## Test seams and known gaps

`scan` and `Fetcher` accept an injected `fetchImpl`. Tests construct native `Response` objects and synthetic maps, covering outcomes without internet access. Pure discovery, analysis, and rendering functions have focused fixtures.

CLI subprocess tests run the built executable against a synthetic loopback HTTP server. They also unpack an npm tarball and exercise its declared entry point outside the checkout using existing dependencies. This is not a clean registry-install test. [Test setup](testing.md) documents ordering, requirements, and limits; [CI](ci.md) runs these offline checks. Indexed maps, full conformance tests, original-position validation, generated-byte coverage, runtime imports, and inline-script inspection remain deliberately outside current behavior. Track proposed changes in GitHub issues, not as speculative module scaffolding.
