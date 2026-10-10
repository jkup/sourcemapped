# ADR 0003: Reuse a parser and report scoped checks with evidence

- Status: Accepted
- Date: 2026-10-10
- Implementation: [analyzer](../../src/analyze.ts), [report types](../../src/scan.ts)
- Contract: [report semantics](../report-contract.md)

## Context

Decoding mappings is not the same as validating semantic correspondence. Existing tools already provide deep validation and bundle coverage. A single impressive “quality” score would obscure different denominators and uncertainty. Maps can be much larger than generated bundles, and their contents are untrusted.

## Decision

Use `@jridgewell/trace-mapping` for numeric decoding and path resolution, with defensive schema/framing/index checks and bounded allocations around it. Use `htmlparser2` for HTML and native Node APIs elsewhere. Keep the dependency footprint small.

Use `checked` for passing the implemented checks; do not claim full ECMA-426 conformance. Report indexed maps and analysis caps as unsupported. Preserve diagnostics and generated-file bounds warnings. Retain only bounded metadata in reports.

Separate source entries, within-map unique paths, embedded-content slots, and bundle/map relationships. Expose explicit status and request evidence through a versioned JSON report, then render the terminal view from that report. No generated-byte coverage or quality score in the MVP.

## Alternatives considered

- **Custom numeric VLQ parser:** duplicates well-maintained functionality and increases correctness burden.
- **Full validator integration immediately:** larger scope than needed to test the product; revisit an appropriate published implementation rather than growing a second validator here.
- **Flatten indexed maps immediately:** risks losing section boundaries and corrupting counts before there is demonstrated demand.
- **One quality/coverage percentage:** misleading because availability, embedded content, and generated positions measure different things.

## Consequences

Users can audit the evidence, but cannot treat a checked map as proof of correct debugging. Duplicate source entries across bundles are expected. Package paths support limited claims, not framework/version fingerprints. Original source contents stay in memory and are omitted from JSON/terminal results. Breaking report changes need an explicit schema-version and migration decision.

## Revisit when

Users need a deeper diagnostic and a maintained validator or precise metric solves it. Expand claims only with corresponding conformance/boundary fixtures. See RM-07 and RM-09 in the roadmap.
