# Run 006: RM-06a report-comparison investigation

- Date: 2026-10-10
- Implementer: isolated-context `report_comparison_trial` coding agent
- Reviewer: parent agent
- Starting revision: `dc55ac9b9e6096cecb3d43c541e85767c1a8764d`
- Accepted investigation: [`aeb96ce`](https://github.com/jkup/sourcemapped/commit/aeb96ce703f595d8774efa83097f9b2a8e756bba)
- Outcome: accepted unchanged; RM-06a complete, RM-06 production work remains `needs-evidence`
- Overall grade: **9.5/10**, a qualitative assessment of this bounded task

## Assignment and observation

Investigate saved-report comparison before implementation: describe an explicitly hypothetical repeated-deployment workflow, create reproducible offline before/after fixtures, define conservative identity/scope/schema/outcome rules, and show useful changes plus false-regression counterexamples. Keep production code, report schema, dependencies and historical evidence unchanged. Do not claim owner feedback or adoption. Leave review, grading and delivery to the parent.

The agent received this assignment and the repository path without prior conversation history. No implementation coaching, corrections or follow-up requests were sent. It chose the method, separated completed RM-06a from unimplemented RM-06, and recommended deferral rather than treating the experiment as product authorization.

## Delivered and verified

- [Study](../../research/report-comparison-2026-10-10.md), [172-line offline harness](../../scripts/report-comparison-study.mjs) and [metadata evidence](../../research/report-comparison-2026-10-10.json): 23 actual scanner captures, four labeled reader controls and 26 asserted comparison pairs.
- Exact requested URLs identify observations, not content or hashed-asset lineage. Unknown schemas, target errors and incompatible scope/destinations block pairing. Sample changes, skipped assets and failed JavaScript remain unobserved. Map outcomes retain their distinct meanings.
- Useful examples include an embedded-slot reduction hidden by unchanged checked totals and observed status transitions. Counterexamples include reordered sampling, hashed replacement, budget exhaustion, shared-map totals and incompatible captures. Equal selected counters do not mean equal content.
- The prototype consumes trusted fixtures only. Arbitrary-file validation, size bounds, public output/exit semantics, provenance handling and a production command remain future work. The study explicitly identifies missing scanner provenance in schema 1 and requests owner evidence before implementation.
- Implementer-reported local checks on Node 26.10.0/npm 11.19.1: build, script syntax, assertions, byte-identical reproduction, 75 relative links and whitespace passed. No production-suite rerun or harness-in-CI claim.
- Reviewer inspected the source/design/evidence, independently reproduced the snapshot exactly, checked syntax and whitespace, and recomputed count invariants, request budgets, downloaded bytes and checked-map totals for all 27 records plus all 26 pair totals. All passed.

- [GitHub run 38096605446](https://github.com/jkup/sourcemapped/actions/runs/38096605446) passed the existing 131-test suite, typechecks and build on Node 22/24 for `aeb96ce703f595d8774efa83097f9b2a8e756bba`. The research harness is not run by CI; its reproduction evidence is local.

## Grade

| Dimension | Score | Evidence / limitation |
| --- | --- | --- |
| Correctness | 10/10 | Reproducible observations and conservative identity/context handling; no corrections required. |
| Scope discipline | 10/10 | Research-only work, no production comparator, new dependencies, scans, or inferred customer evidence. |
| Verification | 9/10 | Real scanner captures, labeled reader controls and independent totals; trusted synthetic inputs are not an arbitrary-file reader or full concurrency study. |
| Product judgment | 9/10 | Useful counterexamples and a justified recommendation to defer. No owner workflow or usability evidence establishes value. |
| Communication | 10/10 | Explicit hypothetical workflow, precise comparison limits, provenance gap, and separation of investigation from production work. |

## Reviewer interventions and guidance

No implementation changes or steering. The reviewer independently checked, committed/pushed, monitored production CI and recorded this assessment; these actions are not credited to the implementer.

AGENTS.md preserves the successful comparison discipline: establish provenance, comparable scope and identity before interpreting deltas; distinguish unobserved evidence from absence; do not treat matching URLs or schema versions as proof of identical contents or checks.

RM-06a is accepted as controlled design evidence. RM-06 remains unimplemented pending an authorized owner's paired reports, capture provenance and intended publication policy. No subsequent task started.
