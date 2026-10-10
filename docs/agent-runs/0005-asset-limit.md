# Run 005: RM-04 opt-in asset limit

- Date: 2026-10-10
- Implementer: isolated-context `asset_limit_trial` coding agent
- Reviewer: parent agent
- Starting revision: `8e92051aeaa63c3f98befc1ec10bfe9aa1418b41`
- Accepted implementation: [`cfc6c36`](https://github.com/jkup/sourcemapped/commit/cfc6c36aeb9e36ffb28be955aa3eea49285c7203)
- Outcome: accepted unchanged; RM-04 implementation complete
- Overall grade: **9.5/10**, a qualitative assessment of this bounded task

## Assignment and observation

Implement the small opt-in asset-limit recommendation from RM-04a. Choose and document a flag and integer semantics; preserve defaults, document order, direct targets, shared budgets, effective limits and report counts. Reject invalid arguments before scanning. Add deterministic cases for increased selection, no additional maps, and request exhaustion; update help, docs, decisions and roadmap. Leave review, grading and delivery to the parent.

The agent received the repository path and assignment without earlier conversation history. It chose `--max-assets`, positive decimal safe integers, and a small CLI-only runtime change. No implementation coaching or correction was sent before or after handoff.

## Delivered and verified

- [CLI](../../src/cli.ts) accepts `--max-assets N` and `--max-assets=N`, validates before scanning, and forwards only `maxScripts`. Leading zeros are accepted; signs, whitespace, fractions, exponent/hex notation and unsafe integers are rejected. Help derives the default from the existing constant.
- Twenty added [CLI cases](../../test/cli.test.ts) verify invalid-input streams/exits and absence of requests, argument boundaries, direct JavaScript behavior, later map discovery, a larger sample without additional maps, and the unchanged 60-request cap. One added [scanner case](../../test/scan.test.ts) covers shared maps, a failed map, a preload redirect and budget accounting.
- README, architecture, report contract and [ADR 0004](../decisions/0004-opt-in-asset-limit.md) explain selection versus retrieval, preserved defaults and schema version 1. No production scanner, dependency, or research changes.
- Implementer-reported local verification on Node 26.10.0/npm 11.19.1: all 131 tests, typechecks and build; built help inspection; expected 15-file tarball; links and whitespace. Initial sandbox loopback/cache failures were resolved with permitted retries and temporary cache use.
- The implementer also installed the local tarball into an empty temporary prefix/cache with registry production dependencies and scripts disabled, then exercised its npm bin command for help and two synthetic loopback scans with limits one/two. This is separate from the automated packed-entry-point check that reuses checkout dependencies. The initial offline install failed `ENOTCACHED`; the successful retry used registry access, not a claim of offline installation. Temporary artifacts were removed.
- Reviewer inspected the complete code/test/doc diff and built help, checked changed-document links and whitespace, and independently ran all 48 CLI/scanner tests successfully. Default and expanded report limits differ only in `maxScripts`; the budget fixture inspects 59 of 65 assets using exactly 60 total requests.

- [GitHub run 38096210967](https://github.com/jkup/sourcemapped/actions/runs/38096210967) passed clean installation and `npm run check` (131 tests, typechecks and build) on Node 22 and Node 24 for `cfc6c36aeb9e36ffb28be955aa3eea49285c7203`.

## Grade

| Dimension | Score | Evidence / limitation |
| --- | --- | --- |
| Correctness | 10/10 | Small forwarding change, input boundaries and report accounting verified; accepted without fixes. |
| Scope discipline | 10/10 | No new sampling heuristic, budget expansion, dependencies, schema fields, or subsequent work. |
| Verification | 9/10 | Strong CLI/scanner evidence plus a clean local installed command; TTY branches and Windows remain unverified. |
| Product judgment | 9/10 | Exposes existing control with clear costs instead of changing defaults. The study motivates control but does not establish demand. |
| Communication | 10/10 | Accurate local/remote distinction, install boundaries, compatibility decision and current-state handoff. |

## Reviewer interventions and guidance

No implementation changes or steering. The reviewer independently checked the result, committed/pushed, monitored CI, and recorded the assessment; these are reviewer actions rather than implementation-agent achievements.

AGENTS.md preserves the successful limit-testing pattern: invalid input must cause no requests, changing one limit must preserve other budgets, and tests should show both useful extra results and exhaustion before the selected count. No correction-driven rule was needed.

The feature completes the selected RM-04 work. Filters, automatic origin policies and other roadmap items remain outside this run. No subsequent task started.
