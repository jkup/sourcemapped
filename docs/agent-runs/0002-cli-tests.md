# Run 002: RM-03 executable and package smoke tests

- Date: 2026-10-10
- Implementer: isolated-context `cli_test_trial` coding agent
- Reviewer: parent agent
- Starting revision: `ab18eb4b71eff252fe5026aecc84c7000a8dedff`
- Accepted implementation: [`be3c61b`](https://github.com/jkup/sourcemapped/commit/be3c61b927f46a359fa94a99565abb4c2a500313)
- Outcome: accepted unchanged; RM-03 complete
- Overall grade: **9.5/10**, a qualitative assessment of this bounded task

## Assignment and observation

Implement RM-03 only: deterministic built-executable tests for help/version, invalid invocation, JSON streams, verbose output, failure exits, and metadata privacy, plus a package-entry-point check against a synthetic local fixture. Avoid third-party requests and redundant builds; document environment requirements. Follow project guidance and leave committing, pushing, independent review, and remote CI to the reviewer.

The agent received the repository path and task without prior chat history. No implementation coaching or corrections were sent during its run. It updated roadmap state, implemented the tests, handled loopback sandbox restrictions, checked its work, and handed off explicit evidence and limitations.

## Delivered and verified

- [Sixteen new subprocess cases](../../test/cli.test.ts), bringing the suite from 80 to 96 tests. Tests use an ephemeral loopback HTTP server and synthetic original/generated/symbol/inline-payload sentinels.
- Checks for default and verbose output, JSON parsing and stream separation, invocation versus target errors, successful partial-map reports, and absence of original-source requests.
- An actual `npm pack --ignore-scripts --offline` artifact extracted outside the checkout, with its declared `bin.sourcemapped` executed against the fixture. Installed dependencies are reused through a symlink; this is not a clean installation or bin-shim test.
- `pretest` builds before Vitest; `check` no longer rebuilds afterward. Normal packing retains its build hook. No runtime implementation, dependency, or report-contract changes.
- [Testing documentation](../testing.md), updated contributor guidance, and current-state/handoff information that distinguishes local results from the earlier CI revision.
- Implementer-reported local checks on Node 26.10.0/npm 11.19.1: 96 tests, strict source/test typechecks, build, a 15-file dry-run package inspection, links, and whitespace. Initial loopback `EPERM` was resolved by an authorized rerun; no live websites were scanned.
- Reviewer independently inspected the diff, temporarily changed the declared package executable to a nonexistent file, and confirmed the packed-entry-point test failed for that path. The original manifest was restored in a `finally` block; all 16 new tests then passed.
- [GitHub run 38094705019](https://github.com/jkup/sourcemapped/actions/runs/38094705019) passed `npm ci` and `npm run check`, including all 96 tests, on Node 22.23.3/npm 10.9.9 and Node 24.21.0/npm 11.19.0 for revision `be3c61b927f46a359fa94a99565abb4c2a500313`.

## Grade

| Dimension | Score | Evidence / limitation |
| --- | --- | --- |
| Correctness | 10/10 | Acceptance cases passed locally and remotely; the independent negative control demonstrated a meaningful artifact failure. |
| Scope discipline | 10/10 | No runtime features, dependencies, live-site experiments, or subsequent tasks. |
| Verification | 9/10 | Real subprocesses and packed files, bounded children, deterministic fixtures, cleanup, and explicit limits. Clean installs/bin shims, TTY branches, and Windows remain unverified. |
| Product judgment | 9/10 | Practical offline tradeoff and single-build ordering; avoided an oversized test framework. This task still tests engineering judgment more than product prioritization. |
| Communication | 10/10 | Precise environment and coverage claims; fixed relevant current-state summaries and preserved historical evidence. |

## Reviewer interventions

No implementation edits or pre-handoff steering. The reviewer performed the reversible negative control, committed/pushed the implementation, observed the remote jobs, recorded the grade, and updated delivery state. Those verification/delivery actions are not credited to the implementation agent.

The agent marked its acceptance work complete while explicitly handing remote delivery to the reviewer. That was accurate for RM-03's local-test acceptance criteria; it did not imply a remote pass. The reviewer later recorded the actual run.

## Guidance change and conclusion

Added one clarification to AGENTS.md: distinguish built-file, packed-artifact, and installed-command coverage; say when dependencies are reused; use a small reversible negative check when it helps establish that a test detects its intended failure. This preserves a successful pattern rather than turning each limitation into a mandatory new feature.

The prior lesson about stale current-state text was followed: this handoff separated local RM-03 changes from the earlier pushed revision and CI result. Confidence in bounded agent execution increased. Neither this run nor the CI trial demonstrates that an agent should independently choose product direction.

The next proposed bounded trial is RM-05, clearer failure presentation. It has not been started.
