# RM-06a: conservative saved-report comparison

Date: 2026-10-10. **Synthetic investigation and proposed design, not a production feature or validated user workflow.** Scanner baseline: `dc55ac9` (the source after RM-04). [Harness](../scripts/report-comparison-study.mjs), [metadata evidence](report-comparison-2026-10-10.json), [current contract](../docs/report-contract.md).

## Hypothetical repeated deployment workflow

A developer responsible for a deployed application expects its stable `/app.js` entry to advertise a map. Before a release, they save `sourcemapped https://their-owned-host.example/ --json > before.json`; after the release they repeat the **same command, scanner revision and limits** into `after.json`. The host is illustrative, not an investigated deployment. They record the release identifiers, capture times, scanner/package revision, command, and intended environment beside the reports. The current schema has a capture timestamp and effective limits but no scanner revision, deployment identifier, content digest, or asset lineage.

The decision is whether to investigate a deployment's map publication/linkage or embedded-content configuration. First they inspect target errors, destinations, scope, selected references, limits and warnings. Then they review exact-URL observations: a checked map becoming a 404 suggests checking deployment/CDN publication; checked JavaScript now lacking supported linkage suggests checking the build's advertised reference; one fewer embedded source slot suggests checking the intended build configuration. These are investigation prompts, not proof of a faulty release. Publication may deliberately change, failures may be transient, and a scan is not an atomic deployment snapshot. A fresh scan can test persistence if the owner chooses it; this study performs no retries or external requests.

A content-hashed entry changing from `app.aaa.js` to `app.bbb.js` only yields an old and a new reference. The owner must supply build knowledge to interpret it. Stripping hashes, matching basenames, or matching source/package samples would invent lineage. Direct-JavaScript scans can narrow an owner's investigation but are a different scope; they must be saved and compared separately from page reports.

No developer interviews, owner feedback, adoption, repeat usage, or demand were observed. The workflow is a hypothesis to take into RM-01, not evidence that RM-01 is complete.

## Proposed comparison semantics

These rules are research recommendations; they do not change schema 1 or the CLI. The small harness accepts trusted generated fixtures only, not arbitrary saved input. It emits observations with no pass/fail score, regression label, alert, or CI exit policy.

| Boundary | Conservative interpretation |
| --- | --- |
| Schema | Support known schema 1 only. Reject unknown versions even when both match; no guessed migration. Ignore unknown additive properties, and do not require the historical optional `extensions` inventory. A future reader must validate required structure/statuses and bound file size before comparing. |
| Scanner provenance | Equal schema is insufficient to establish equal implemented checks across scanner revisions. Record revision alongside saved reports; mismatch/unknown provenance requires review before interpreting differences. This is controlled by using one build in the experiment; the harness cannot recover it from a report. |
| Target/scope | Different normalized target strings, scope, successful target destination, or either target error blocks automatic pairing. Empty failed reports are not map disappearances. Even equal values cannot establish equal deployed content or environment. |
| Exact bundle identity | Pair the exact `bundle.url` string within comparable reports. Require the same `kind` and successful `finalUrl` before metadata deltas. Do not use request order, discovery position, final URL alone, filename stems, query removal, or source-path similarity as identity. Same URL means the same requested location, not the same bytes. |
| Hashed/query URLs | Different strings remain separate old/new observations; no inferred successor. “Not in later discovery” describes one static response, not asset deletion, a lost map, or absence from runtime imports/other routes. No further normalization beyond the scanner's serialized URLs. |
| Redirects/linkage | A changed bundle destination is an explicit context change. A changed map URL, map destination, or `referenceKind` is a linkage change. Keep both reports as evidence. Status transitions can still be recorded, but do not imply the same map artifact. Missing destination on failed retrieval is not evidence of a redirect change. |
| Inline maps | `(inline data URL)` is a redaction label, never a global map identity. Pair only within an exact bundle relationship. Switching external/inline linkage is explicit; equal inline labels or equal metadata do not prove equal payloads. |
| Sampling/budgets | Show effective limit changes and document-order selection changes separately. Selected means the first `maxScripts` references, not necessarily inspected. A reference retained as `skipped` is unobserved; a smaller/changed sample is never a disappeared map. Budget-exhausted selected assets are also unobserved. Do not parse error text to invent reliable skip subtypes. |
| No reference | `checked → no-reference` means the same requested JavaScript location was successfully inspected and supported linkage was no longer found. It does not establish that a map was deleted or should have been public. |
| Unavailable/failed | `unavailable` retains HTTP/network evidence and means retrieval failed, not no map. A JavaScript `fetch-failed` prevents observing linkage. Keep 403/404, rate-limit pauses, timeouts, and network errors as evidence, without inferring permanence. |
| Limited/unsupported/invalid | `limited` means analysis was prevented by fetch/decoding budgets; `unsupported` is outside implemented analysis; `invalid` failed an implemented check. These are different observations, not interchangeable failures. Unsupported and invalid analysis counters must not enter checked-only metadata deltas. |
| Checked metadata | Compare source-entry and embedded-string-slot counts only when both relationships are checked and linkage/destinations agree. Counts are slot counts, not unique files, semantic correctness, generated-code coverage, or a quality score. A reduction may be intentional. Equal selected counters is not report/content equality. |
| Aggregates/shared maps | Report each scan's totals for context, with scope and denominators. Do not infer regression from a total delta. Shared-map relationships count once per bundle although the map may be fetched only once. Do not match map URLs globally and collapse those relationships. |

Exact pairs may still supply useful local observations when selection or limits change; the harness includes those context flags rather than discarding all evidence. A future tool should suppress automatic deployment judgments in such cases. Even fully matched captures support an observed change, not causality or business severity. Language/package/path samples, diagnostics, errors, request costs, and byte counts remain available in the full input evidence but are not diffed by this small prototype. Request order and timestamps are not identity keys. Any future terminal display must sanitize remote metadata through `safeText`.

## Offline method

Run from the checkout with installed lockfile dependencies:

Exact snapshot reproduction requires the [recorded study checkout](https://github.com/jkup/sourcemapped/tree/aeb96ce703f595d8774efa83097f9b2a8e756bba). Later scanner revisions can add metadata; do not overwrite this historical snapshot to make a current-checkout comparison pass.

```sh
npm run build
node scripts/report-comparison-study.mjs > /tmp/report-comparison.json
cmp /tmp/report-comparison.json research/report-comparison-2026-10-10.json
```

The harness calls the actual built `scan` with native `Response` fixtures and an injected fetch implementation; it never calls global fetch or starts a listener. Twenty-three captures exercise current production reporting; four explicit reader controls clone a capture to vary schema, additive/optional fields, scope alone, or target destination alone. The saved evidence labels these controls. They are not claimed to be real future/historical scanner outputs. The direct-target and different-page fixtures are separately scanned.

Concurrency is fixed to one for deterministic request order, with other limits left at defaults except the deliberately varied request/selection caps. Reports preserve their full serialized metadata. Only `scannedAt` is normalized to a fixed synthetic timestamp. The study wrapper records source revision; it is not a new production report schema. Generated JavaScript, synthetic source text, symbol names and inline payloads stay inside the harness and are asserted absent from output. No original-source URL is requested. A route guard checked outside `scan` catches unexpected fetches even though the scanner catches fetch exceptions internally.

Assertions verify every comparison classification, selected context flags, embedded-count delta, discovery count invariants, actual request evidence and one-request shared-map reuse. The two runs must reproduce byte-for-byte. The assertions are experimental controls, not production comparator tests or an arbitrary-input parser/security suite. Existing research files are not refreshed.

## Results

The evidence contains **27 report-shaped records and 26 comparison pairs**. Checked totals below count bundle/map relationships. Pair IDs map directly to `rows` in the JSON.

| Pair(s) | Checked totals | Result / useful distinction |
| --- | --- | --- |
| `unchanged-control` | 1 → 1 | Selected metadata equal; does not assert identical content. |
| `embedded-content-change` | 1 → 1 | Same checked relationship: source entries 1 → 1, embedded slots 1 → 0. Useful metadata change hidden by the checked total. |
| `linkage-no-longer-found` | 1 → 0 | Observed checked → no-reference transition. |
| `checked-to-unavailable` | 1 → 0 | Map retrieval now HTTP 404; map absence/permanence not established. |
| `checked-to-invalid` | 1 → 0 | Retrieved map is not valid JSON. |
| `checked-to-unsupported` | 1 → 0 | Retrieved indexed map is outside current analysis. |
| `checked-to-limited` | 1 → 0 | Changed request cap permits the page and bundle, not the map; explicit limits context. |
| `recovered-retrieval` | 0 → 1 | Previously unavailable relationship now checked. |
| `javascript-failed`, `budget-skipped` | 1 → 0 each | Linkage is unobserved because JavaScript returned 403 or was stopped by the request cap. |
| `hashed-replacement` | 1 → 1 | One absent and one new discovered URL; no asset pairing. |
| `sample-reordered` | 1 → 0 | With the same selection cap, the mapped app moved behind a no-reference vendor asset. Both exact pairs include a skipped side; no disappeared map. |
| `sample-expanded` | 0 → 1 | Larger selection observes a previously skipped app; no claim a new map was deployed. |
| `absent-reference` | 1 → 0 | No external reference in later constructed HTML; only “not in later discovery.” |
| `target-mismatch`, `page-versus-direct` | 1 → 1 each | Blocked: target/destination and, for direct JavaScript, scope differ. |
| `scope-reader-control`, `destination-reader-control` | 1 → 1 each | Independently blocked on scope/destination. |
| `target-failed` | 1 → 0 | Blocked: target HTTP 503, not an empty successful scan. |
| `unknown-schema`, `unknown-schema-both` | 1 → 1 each | Blocked even with matching unknown schema 2. Totals are fixture context, not interpretation of that schema. |
| `additive-reader-control` | 1 → 1 | Unknown additive property and absent optional extensions do not affect selected counters. |
| `redirected-bundle` | 1 → 1 | Stable requested URL now redirects: destination change, no metadata-equivalence claim. |
| `map-url-changed`, `inline-linkage` | 1 → 1 each | Linkage changed; no inferred map artifact identity. |
| `shared-relationship-removed` | 2 → 1 | One unchanged checked relationship, one reference absent. Both captures fetch the shared map once; total decline is not a disappeared map. |

The useful cases and counterexamples are intentionally constructed, not a prevalence estimate. They show why a simple total diff or hash-stripping join would be misleading, and why an exact-URL observer sacrifices coverage on common hashed deployments to preserve honest claims.

## Recommendation and remaining work

**Complete RM-06a and defer production RM-06 implementation pending an owner workflow.** The study satisfies the investigation/design portion but supplies no demand evidence and leaves hashed asset lineage unknown. First seek an authorized owner's two reports plus capture provenance, intended map-publication policy, and the decision they need to make. Determine whether exact-URL observations suffice or whether explicit owner-supplied lineage is necessary. Do not add inferred lineage or require broader crawling to make the examples look more useful.

If implementation is later selected, the smallest candidate is a local, metadata-only comparison of two saved reports with strict input bounds/validation, compatibility checks, explicit unobserved/context outcomes, and exact-URL transitions. Input syntax, stable comparison-output contract, migrations, terminal wording, exit/alert policy, provenance handling, and packaging/tests remain undesigned or unimplemented. Review compatibility in an ADR before accepting a new report/output contract. This investigation accepts no new product or report semantics, so it does not supersede an ADR.

Limitations include missing scanner provenance in existing reports; absence of content digests/lineage; transient responses and non-atomic scans; static discovery only; runtime concurrency/time/byte exhaustion not exhaustively simulated; no arbitrary malformed-file reader; only two checked metadata counters compared; no package/version/framework or generated-code-coverage claims; and no real deployment or usability validation. No CLI/API/schema/dependency changes, external scans, outreach, publication, or historical refresh occurred.

Local verification: Node **26.10.0**, npm **11.19.1**; `npm run build`, harness assertions, and two byte-identical captures passed. Changed-document links and `git diff --check` are verified at handoff. The production suite is not rerun for this research-only change; prior CI evidence remains historical. This harness is not wired into CI. Independent review, delivery and any remote results belong to the reviewer.
