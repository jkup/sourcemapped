# Running roadmap

Updated **2026-10-10**. This is the work queue, not an execution log. Start with [AGENTS.md](AGENTS.md); detailed past evidence lives in [agent reviews](docs/agent-runs/README.md), [research](docs/README.md) and Git history.

## Current state

A small TypeScript CLI inspects page/direct JavaScript URLs, exposes `--max-assets`, and emits terminal/verbose/metadata-only JSON reports. Static discovery, bounded downloads and scoped map checks remain the product boundary. Two runtime dependencies; no npm release recorded. [README](README.md) describes supported behavior.

The latest completed feature is RM-04. RM-06a proposes conservative saved-report comparison but supplies no owner workflow or production comparator. The 16-site study and synthetic experiments do not demonstrate repeat use; RM-01 remains the main product question.

Current maintenance findings/checks are recorded once in [RM-12](docs/maintenance/2026-10-10.md). Earlier green CI does not override a newly reproduced failure.

## Active work

None. The initial RM-01 owner-provided exploratory scan is recorded; further work awaits a concrete owner question or feedback.

## Open queue

`ready` = scoped; `needs-evidence` = investigate before implementing; `in-progress` = active owner; `blocked` = concrete dependency; `done` = acceptance met; `deferred` = intentionally outside priority. Stable IDs survive completion. Do not automatically start the next item.

| ID | Status | Work / next action |
| --- | --- | --- |
| RM-01 | needs-evidence | Validate repeat usefulness on an authorized owner's deployments |
| RM-06 | needs-evidence | Obtain paired owner reports and desired decision before implementing comparison |
| RM-07 | needs-evidence | Identify a concrete unsupported case before extending standards coverage |
| RM-08 | needs-evidence | Establish demand and explicit semantics for local bundle/map inputs |
| RM-09 | needs-evidence | Show useful source grouping beyond existing extension/package counts |
| RM-10 | blocked | Confirm package identity/ownership and publication authorization |

### RM-01 — Validate repeat usefulness

Use owner-provided deployments/feedback, not unsolicited outreach or another generic site scan. Record dated feedback: task, decision improved, repeat use, limitations. Recommend continue/narrow/stop. Do not invent participant counts, adoption or popularity thresholds.

[Owner observations](research/jonkuperman-2026-10-10.md): jonkuperman.com and daily.jonkuperman.com were scanned for exploration; the owner reports no recurring need yet. These do not meet repeat-use acceptance or justify a new feature.

### RM-06 — Saved-report comparison

[RM-06a](research/report-comparison-2026-10-10.md) covers hypothetical workflows and false-regression counterexamples. Next obtain authorized paired reports, scanner/capture provenance and intended publication policy. Decide whether exact-URL observations suffice or owner-supplied lineage is needed. Before implementation, define bounded input validation, schema/output compatibility, terminal/exit semantics and tests. Changed samples must not imply disappeared maps; keep comparison local and metadata-only.

### RM-07 — Standards and validation

Identify a real unsupported input and choose a bounded slice. List applicable primary-standard/independent fixtures, reuse maintained decoding libraries, and define resource limits, count semantics and claims. A few fixtures cannot establish full conformance.

### RM-08 — Local artifacts

Establish the owner workflow and explicit local input syntax. Separate user-selected paths from discovered paths; define relative source resolution and retention. Preserve no-source-export defaults and avoid implicit network requests from local paths.

### RM-09 — Source summaries

Demonstrate a grouping that answers a useful question beyond current extension/package counts. Preserve entry/unique-path distinctions and bounded samples. Generated-byte attribution needs a separate decision and UTF-16, line-boundary, unmapped-segment and denominator fixtures.

### RM-10 — Release

Blocked on package identity/ownership and publication authorization. When authorized, verify CI, reviewed tarball, JSON compatibility, installed command/dependencies, manifest-derived version/User-Agent and installation instructions. Preparation is not publication; mark released only after a verified registry result.

## Completed work

| ID | Outcome | Evidence |
| --- | --- | --- |
| RM-00a | Competitive review and 16-site baseline | [Research](RESEARCH.md), `a5e776e` |
| RM-00b | Bounded CLI and metadata reports | [Evaluation](EVALUATION.md), `2bba76e` |
| RM-00c | MVP evaluation and initial priorities | [Evaluation](EVALUATION.md), `c12454c` |
| RM-02 | Supported Node LTS CI | [Review](docs/agent-runs/0001-ci.md) |
| RM-03 | Executable/package smoke automation | [Review](docs/agent-runs/0002-cli-tests.md) |
| RM-04a | Controlled sampling investigation | [Study](research/sampling-2026-10-10.md), [review](docs/agent-runs/0004-sampling-investigation.md) |
| RM-04 | Opt-in asset selection limit | [ADR 0004](docs/decisions/0004-opt-in-asset-limit.md), [review](docs/agent-runs/0005-asset-limit.md) |
| RM-05 | Bounded failure summaries | [Review](docs/agent-runs/0003-failure-presentation.md) |
| RM-06a | Conservative comparison investigation; no production comparator | [Study](research/report-comparison-2026-10-10.md), [review](docs/agent-runs/0006-report-comparison.md) |
| RM-11 | Agent onboarding and project memory | [Documentation index](docs/README.md), `1464a47` |
| RM-12 | Runtime/test fixes, installed-package verification and documentation consolidation; pushed with Node 22/24 CI passing | [Maintenance evidence](docs/maintenance/2026-10-10.md), `3674312`, `9d5bd32` |

## Deliberately deferred

Images, browser execution, recursive crawling, guessed map URLs, source export/secret hunting, hosted services, framework badges and quality scores remain outside scope. Reconsider only with explicit demand, bounded design and an appropriate decision. Full conformance/generated-byte coverage require separate evidence under RM-07/RM-09.

Continue when developers repeatedly use the report and can explain its value. If utility remains limited to selected demos, retain a small diagnostic/educational tool rather than expanding a platform. Historical acceptance details and dated handoffs remain in [the pre-maintenance roadmap](https://github.com/jkup/sourcemapped/blob/2705259a0c61debaa060ef1d7b7ec8150eb3dac4/ROADMAP.md); do not copy that execution log back here.
