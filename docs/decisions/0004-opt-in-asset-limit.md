# ADR 0004: Expose an opt-in asset selection limit

- Status: Accepted
- Date: 2026-10-10
- Related roadmap item: RM-04
- Extends: [ADR 0002](0002-bounded-advertised-map-discovery.md)

## Context

The [controlled RM-04a study](../../research/sampling-2026-10-10.md) demonstrates that a larger document-order sample can reach later advertised maps, add no maps, or exhaust requests first. It does not establish prevalence or user demand. Its origin/prefix filter counterexamples do not support a new default discovery policy.

## Decision

Expose the existing `maxScripts` setting as optional `--max-assets N`. “Assets” includes external scripts and script/module preloads. Accept decimal digits representing a positive safe integer (1 through 9007199254740991), including leading zeros; reject signs, whitespace, fractions, exponent/hex notation, missing values and unsafe integers before scanning. This matches the internal integer range without a new arbitrary cap. A large value selects from the already discovered list, not an allocation sized by the argument. Normal argument-parser behavior applies: repeated flags use the final value, and help/version do not start a scan.

Preserve default selection, deduplicated document order, direct-JavaScript behavior, shared budgets and map caching. Increasing this selection cap never raises the request/byte/time caps. No origin or prefix filtering, heuristics, crawling, or original-source retrieval is added.

## Alternatives considered

- Raising the default: the synthetic study does not justify a universal increase in traffic.
- Origin/prefix filtering: excludes useful CDN or other mapped assets in counterexamples and needs a concrete operator workflow.
- Capping N at the request budget: confuses selection with retrieval; target requests, redirects and map requests consume that same budget anyway.

## Consequences

Users can narrow or enlarge a sample while results remain bounded by shared budgets. More selected assets need not produce more inspected assets or checked maps. Metadata-only output and stream/exit conventions are unchanged.

Compatibility review: schema version 1 remains valid. No fields, enums, units, count semantics or defaults change; the existing effective `limits.maxScripts` reports the override. All discovered references remain in `bundles`; sampling exclusions and runtime-limited assets remain `skipped`. Historical reports remain interpretable without migration. Deterministic [CLI](../../test/cli.test.ts) and [scanner](../../test/scan.test.ts) tests cover selection gains, no gains, budgets, argument boundaries and direct targets.

## Revisit when

Concrete deployment workflows demonstrate that selecting known groups is more useful than an explicit limit or a direct JavaScript URL. Any filter syntax or changed report semantics requires a separate decision.
