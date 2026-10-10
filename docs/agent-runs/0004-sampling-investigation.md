# Run 004: RM-04a controlled sampling investigation

- Date: 2026-10-10
- Implementer: isolated-context `sampling_trial` coding agent
- Reviewer: parent agent
- Starting revision: `c55923adea661c3521c49f7afa258ca191592bdd`
- Accepted investigation: [`6dffa28`](https://github.com/jkup/sourcemapped/commit/6dffa28e4ca6e182db1f043145446875a984fe7e)
- Outcome: accepted unchanged; investigation complete, production changes unimplemented
- Overall grade: **9.5/10**, a qualitative assessment of this bounded task

## Assignment and observation

Investigate RM-04 using a small controlled offline comparison of document-order sampling against explicit limits/filtering and/or a precisely defined origin policy. Record request cost, discoveries, selection bias, skipped counts, reproducible evidence, and the smallest justified recommendation. Keep production discovery, CLI, schema, dependencies, and historical research unchanged; leave review and delivery to the parent.

The agent received the repository path and assignment without earlier chat history. The reviewer gave no implementation coaching, corrections, or follow-up requests. The agent chose its fixtures and method, split completed RM-04a investigation from unfinished RM-04 implementation, and handed off evidence and limitations.

## Delivered and verified

- A [117-line offline harness](../../scripts/sampling-study.mjs) reuses production discovery and scanning against native synthetic responses. Five constructed pages compare document-order limits of two/four, exact same-origin selection, and an explicit URL prefix: 20 result rows.
- The selection adapter retains original discovery and disjoint filter/asset-limit/runtime-budget exclusions. Constant HTML byte size controls page cost. Baseline assertions compare exact request evidence and selected bundles against ordinary full-page scans.
- [Dated study](../../research/sampling-2026-10-10.md) and [metadata snapshot](../../research/sampling-2026-10-10.json) include request traces, shared-map cache reuse, failed-map cost, redirect budget exhaustion, and empty selections.
- Counterexamples show same-origin selection missing CDN assets and prefix selection missing mapped vendor assets. Larger limits sometimes add useful maps and sometimes only cost. Recommendation: preserve defaults; consider a future opt-in asset-limit flag, with shared budgets unchanged.
- Implementer-reported local checks on Node 26.10.0/npm 11.19.1: build, harness assertions, repeatable snapshot, syntax, changed-document links, and whitespace passed. No full-suite rerun was claimed or required for unchanged production code.
- Reviewer independently reran the harness and reproduced the snapshot byte-for-byte, checked script syntax and links, and recomputed all 20 rows' request/byte/checked/skipped totals and all five prose table rows from the saved data. All agreed.

- [GitHub run 38095544909](https://github.com/jkup/sourcemapped/actions/runs/38095544909) passed the existing 110-test production suite, typechecks, and build on Node 22 and Node 24 for `6dffa28e4ca6e182db1f043145446875a984fe7e`. CI does not execute the research harness; study reproduction was local.

## Grade

| Dimension | Score | Evidence / limitation |
| --- | --- | --- |
| Correctness | 10/10 | Reproducible results, accurate denominators, and a validated baseline adapter; no corrections needed. |
| Scope discipline | 10/10 | Investigation stayed separate from implementation; no runtime changes, live scans, dependencies, or historical refresh. |
| Verification | 9/10 | Executable controls, exact reproduction, and independent arithmetic checks. Study uses serial synthetic requests and small limits; no new evidence for concurrent or real deployment behavior. |
| Product judgment | 9/10 | Included counterexamples and recommended preserving defaults. An optional control remains a proposal without owner feedback. |
| Communication | 10/10 | Precise method, limitations, local verification, and roadmap split; did not mislabel same-origin as ownership or synthetic evidence as adoption. |

## Reviewer interventions and guidance

No implementation changes or steering. The reviewer inspected and reproduced the study, committed/pushed, monitored existing production CI, and recorded this assessment. Delivery and independent checks belong to the reviewer rather than the implementation agent.

AGENTS.md now preserves a successful research habit: validate the experiment's baseline, include counterexamples, distinguish mechanics from prevalence/demand, and separate investigation completion from implementation. No correction-driven rule was needed.

The investigation is accepted as evidence of controlled mechanics. RM-04 remains pending selection of a production task; the optional asset-limit flag is not implemented. The study explicitly notes that its preload is never selected, it does not test actual default-limit changes, and exact origin says nothing about ownership. No subsequent task started.
