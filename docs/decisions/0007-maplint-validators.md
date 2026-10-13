# ADR 0007: Use maplint's in-memory validators

- Status: Accepted
- Date: 2026-10-13
- Extends: [ADR 0003](0003-analysis-and-report-semantics.md)

## Context

[maplint 0.8.2](https://www.npmjs.com/package/maplint/v/0.8.2) publishes individual validators and standalone TypeScript types. Its mapping and ignore-list validators can inspect parsed maps without CLI invocation or filesystem access. They provide location-specific diagnostics for checks previously implemented here.

## Decision

Pin maplint to 0.8.2 and call `ignoreListValidator` and `mappingsValidator` from the analyzer after our schema, allocation and VLQ framing guards. Cap `ignoreList` at 100,000 entries, like the other source-map arrays, before invoking validators; larger arrays are unsupported analysis inputs. Await the public validator contract, which permits asynchronous results. Keep trace-mapping for metadata decoding and path resolution, plus our safe-integer, legacy ignore-list and generated-position checks. Never invoke `lint` or `sourceFilesValidator` on downloaded maps.

Keep the first validation error and at most eight warnings per validator. Do not copy diagnostic file paths or input map objects into reports. Existing statuses, count meanings and schema version 1 remain unchanged; human diagnostic wording becomes more specific. `checked` still does not establish full conformance or semantic correspondence.

## Alternatives considered

- Keeping only our checks avoids another dependency but duplicates validation logic that can now be shared upstream.
- Running the maplint CLI would require temporary files and introduce irrelevant local-source checks.
- Replacing all defensive checks would lose framing and resource guards that maplint does not provide.

## Consequences

Maplint owns source/name index diagnostics and standard ignore-list value validation. The dependency adds modern-tar to the installed tree, although its npm workflow is unused. Mapping data is decoded by both libraries on successful analyses; existing line/segment caps bound inputs but are not CPU deadlines. Maplint may allocate multiple diagnostics internally before we retain the first error. Pinning makes upgrades explicit review points.

Analyzer fixtures cover upstream diagnostics, bounded retained errors, maps without local source files, malformed framing, and allocation limits. Existing scan and CLI fixtures cover statuses, aggregation and report privacy.

## Revisit when

Maplint offers reusable decoded mappings, bounded diagnostic generation, or additional pure checks that justify changing the integration.
