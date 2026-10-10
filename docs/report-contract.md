# Report contract

The CLI's `--json` output is a single JSON document on stdout. The authoritative TypeScript shapes are `Report`, `BundleResult`, and `MapResult` in [scan.ts](../src/scan.ts), and `MapAnalysis` in [analyze.ts](../src/analyze.ts). This document explains semantics; it is not a generated JSON Schema or a promise of a supported programmatic package export.

## Envelope and observations

`schemaVersion` is currently `1`. A report includes normalized `target`, optional `finalUrl`, UTC `scannedAt`, `scope`, effective `limits`, warnings, optional target `error`, inline-script count, bundle observations, request evidence, and summary totals.

- `static-html` means references parsed from one response, including preloads that may never execute.
- `direct-javascript` means one generated JavaScript resource was inspected without HTML discovery.
- An uninspected/failed target can still have the default `static-html` scope. Inspect `error` before interpreting an empty report.
- Bundle order follows discovery order. Request order reflects concurrent execution and should not be used as stable identity.
- `url` identifies the requested/reference URL; `finalUrl` records redirects when retrieval succeeds. Optional properties are omitted from serialized JSON when undefined.

## Bundle and map states

| Bundle status | Interpretation |
| --- | --- |
| `no-reference` | JavaScript was inspected but supported linkage methods found no reference. |
| `map-found` | A reference was found; inspect the nested map status for its outcome. |
| `fetch-failed` | JavaScript retrieval failed or returned an HTML fallback. |
| `skipped` | Asset was not inspected because of sampling or another resource limit, possibly after an attempted fetch. |

| Map status | Interpretation |
| --- | --- |
| `checked` | Implemented checks passed; semantic correctness and full conformance are not established. |
| `invalid` | Map data failed an implemented check, including malformed inline encoding. |
| `unsupported` | Indexed maps or an analysis-allocation limit. No invalidity claim. |
| `unavailable` | Advertised resource could not be retrieved, including unsupported network schemes. |
| `limited` | Fetch/inline-decoding budget prevented analysis. |

`referenceKind` distinguishes `header`, `legacy-header`, and `annotation`. A map's `retrieved` flag means a network response body or decoded inline payload became available for analysis, not that it passed checks. A malformed inline payload can therefore be `invalid` with `retrieved: false`. Inline maps use the literal label `(inline data URL)` instead of exporting their payload. `httpStatus` is optional and is not applicable to inline maps; request evidence preserves per-hop network outcomes.

## Count invariants

For a normally completed scan:

```text
discovered = inspected + scriptFailures + skipped
inspected = noReference + mapsChecked + mapsInvalid
          + mapsUnsupported + mapsUnavailable + mapsLimited
```

Map totals count **bundle/map relationships**, even when several bundles share one fetched map URL. `mapsRetrieved` counts relationships with `retrieved: true`; it is not a validity metric or a count of unique requests. It need not equal `mapsChecked + mapsInvalid + mapsUnsupported` because malformed inline maps may never decode.

Summary `sourceEntries`, `embeddedSources`, and `languages` aggregate **checked** analyses only. Never aggregate partial counters from invalid analyses as valid evidence.

Within each checked analysis:

- `sourceEntries`: number of source slots, including null paths and repeated paths.
- `uniqueSourcePaths`: distinct resolved non-null paths within that map only. No cross-map uniqueness claim.
- `embeddedSources`: matching source slots with string content, including empty strings. Extra content slots are not counted.
- `languages` and `extensions`: filename-derived entry counts. Null paths are `Unknown` / `(unknown)`; no recognized extension is `(none)` in the extension inventory. An unrecognized extension can still be recorded while its language is `Other`.
- `mappingCount`: decoded segment count, including unmapped segments; not bytes or execution coverage.
- `packages`, `pathSamples`, and `extensionFields`: bounded metadata samples. They are not exhaustive source trees or framework/version inventories. Package examples identify supporting path evidence.

`downloadedBytes` counts chunks consumed across the scan, including failed oversized responses. Canceled HTTP error/redirect bodies are not downloaded and counted. Inline maps' bytes are already part of their containing JavaScript; decoding does not add another network transfer.

## Output and compatibility rules

- Do not add original source text, generated script text, symbol-name arrays, or raw inline URLs to reports. URLs and source-path samples remain public metadata, not a guarantee that reports contain no sensitive identifiers.
- Progress uses stderr. Invalid arguments produce stderr plus exit `1`; no JSON report is promised for an invocation that cannot start.
- A target-level report error exits `1`. A completed partial report, including invalid or inaccessible maps, exits `0`. Consumers must inspect statuses rather than use exit code as map validity.
- Preserve field meanings within a schema version. Additive optional metadata can remain version `1`; renaming/removing fields, changing units/counting rules, or extending status enums requires an explicit compatibility review. Record a breaking change in an ADR, increment the schema version, and provide migration notes and fixtures.
- Readers should tolerate unknown additive fields. Historical [MVP evidence](../research/mvp.json) predates the additive per-map `extensions` field; do not require that field when consuming that snapshot.

If changing any of these semantics, update scan/analyzer tests and renderer expectations together. Assertions should test evidence and denominators, not snapshots of incidental timestamps or concurrent request ordering.
