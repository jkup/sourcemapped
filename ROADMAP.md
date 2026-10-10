# Running roadmap

Last updated: **2026-10-10**. This is the single work queue and durable handoff for humans and agents. Read [AGENTS.md](AGENTS.md) before implementation and [the decisions](docs/decisions/README.md) before changing direction.

## Current state

The working MVP inspects page/direct JavaScript URLs and reports bounded source-map metadata through terminal, verbose, and JSON output. Research found useful maps on only two of sixteen sampled sites; deployment diagnostics are promising, broad website archaeology is unproven. See [RESEARCH.md](RESEARCH.md) and [EVALUATION.md](EVALUATION.md).

Latest local verification (RM-05, 2026-10-10): **110 tests passed**, strict source/test typechecks, and build on Node 26.10.0/npm 11.19.1. See RM-05 for fixture coverage, sandbox retry, and review/remote verification still pending.

Earlier local verification (RM-03, 2026-10-10): **96 tests passed**, strict source/test typechecks, one build, and dry-run package inspection on Node 26.10.0/npm 11.19.1. This includes built-CLI and unpacked-package entry-point checks against synthetic loopback HTTP. The earlier MVP baseline included manual installed-CLI and live MDN smoke checks; those were not rerun for RM-03. This is dated evidence, not a substitute for checking the current revision.

No npm release is recorded in the project history. The RM-03 implementation was committed and pushed to `origin/main`. Its 96-test suite, typechecks, and build passed on GitHub for Node 22 and 24; see RM-03 for the exact run and revision. Automated CLI subprocess and packed-entry-point checks now run in `npm test`; see [test setup](docs/testing.md) for loopback/subprocess requirements and coverage limits. The package still has two production dependencies; no separately started services or credentials are required.

## Active work

None. RM-05 implementation and first review revision are locally verified; reviewer assessment, delivery, and remote CI remain pending. No subsequent task started.

For work in progress, add one entry with: **ID · owner/session · scope/files · latest evidence · next action · blocker (if any)**. Keep it brief; remove the entry when completed. A roadmap entry does not authorize external actions or automatic future work.

## Status and maintenance

- `ready`: scoped and actionable, with acceptance criteria.
- `needs-evidence`: an investigation or user feedback must precede implementation.
- `in-progress`: actively being worked on; identify the owner under Active work.
- `blocked`: stopped by a named dependency, with a concrete unblocking action.
- `done`: acceptance criteria met, with evidence.
- `deferred`: deliberately outside current priorities or scope.

Update the affected item and the change log in the same change as the work. Keep IDs stable, preserve completed history, and never silently drop unfinished acceptance criteria. Split an item when only part is complete. Add substantial new work here rather than maintaining a separate TODO list. An active entry is a handoff, not a durable lock: check its context before assuming another agent is still running.

## Prioritized queue

Order reflects product priority. Follow the user's task first. RM-01 remains the main product question; completed engineering items do not authorize subsequent work.

| ID | Status | Work | Dependency / completion evidence |
| --- | --- | --- | --- |
| RM-01 | needs-evidence | Validate repeat usefulness on developers' own deployments | Real feedback; no outreach without authorization |
| RM-02 | done | Add CI for supported Node LTS versions | [Both remote jobs passed](https://github.com/jkup/sourcemapped/actions/runs/38094230079); [run review](docs/agent-runs/0001-ci.md) |
| RM-03 | done | Automate CLI and package smoke coverage | [96 tests passed remotely](https://github.com/jkup/sourcemapped/actions/runs/38094705019); [run review](docs/agent-runs/0002-cli-tests.md) |
| RM-04 | needs-evidence | Improve bounded asset sampling | Compare strategies without silently expanding scope |
| RM-05 | done | Group repeated failure evidence in terminal output | [Renderer](src/render.ts), [regression fixtures](test/render.test.ts); 110 local tests passed; reviewer/remote verification pending |
| RM-06 | needs-evidence | Compare saved metadata reports | Validate a repeat deployment-checking workflow |
| RM-07 | needs-evidence | Extend standards coverage and validation | Concrete unsupported case and fixture strategy |
| RM-08 | needs-evidence | Support owner-provided local bundle/map pairs | Confirm demand and define explicit input semantics |
| RM-09 | needs-evidence | Improve source metadata summaries | Useful directory/non-code grouping examples |
| RM-10 | blocked | Prepare and publish an initial npm release | Package identity/ownership and publication authorization |

### RM-01 — Validate repeat usefulness

**Next action:** use owner-provided deployments and feedback to identify decisions the report improves. Do not treat another public-site scan as evidence of adoption.

**Acceptance:** record dated, consent-appropriate feedback describing the task, what the report changed, and whether the user returned; distinguish observations from hypotheses. Make a written continue/narrow/stop recommendation. Do not manufacture participant counts or set a popularity threshold without a reason.

### RM-02 — Continuous integration

**Acceptance:** a small workflow runs `npm ci` and `npm run check` on supported Node LTS versions, with read-only permissions and no secrets or public-site requests. Verify selected action/runtime versions when implementing. Record local validation and the actual remote workflow result when available; do not claim a remote pass before it runs.

**Implementation/evidence (2026-10-10):** [CI workflow](.github/workflows/ci.yml) covers Node 22 and 24 on pushes/pull requests; [CI maintenance](docs/ci.md) records primary-source verification of the LTS lines, action releases, and Node 24 action runtime. `npm ci` succeeded with Node 22.13.1/npm 11.4.1; `npm run check` then passed all 80 tests, source/test typechecks, and build. `actionlint` 1.7.12 and `git diff --check` passed. The initial sandbox install could not resolve the npm registry and was stopped; installation succeeded with network permission and a temporary npm cache. No runtime source or dependencies changed.

**Remote verification:** [run 38094230079](https://github.com/jkup/sourcemapped/actions/runs/38094230079) passed both Node 22 and Node 24 jobs on Ubuntu for commit `3584580220fa00bd70ecb76e990cb0baa280a957`. Both completed clean installation and `npm run check`. Reviewer accepted the workflow unchanged and corrected one stale current-state sentence. The [observed agent run](docs/agent-runs/0001-ci.md) received 9/10; reusable lessons were added to AGENTS.md. No remaining RM-02 work.

### RM-03 — Automated CLI and package smoke checks

**Acceptance:** deterministic tests run the built executable, covering help/version, bad flags, JSON stdout/stderr separation, verbose output, target failure exits, and omission of original content. Include a package-entry-point check with an isolated synthetic HTTP fixture or equivalent. No third-party websites. Keep build/test ordering explicit and avoid redundant rebuilds. Document any additional test-environment requirement.

**Implementation/evidence (2026-10-10):** [CLI tests](test/cli.test.ts) add 16 deterministic subprocess cases for help/version aliases, bad flags/arity/scheme, clean JSON streams, default/verbose output, target HTTP failure exits, successful partial-map reports, and omission of original/generated contents, names, and inline payloads. An ephemeral loopback fixture records requests, including the absence of original-source retrieval. The package check packs without rebuilding, extracts outside the checkout, and executes the declared entry point using existing installed dependencies. [Test setup](docs/testing.md) documents requirements and limits: no clean registry installation, npm bin-shim/permission, or TTY-progress claim. No runtime/report-contract/dependency changes.

**Local verification:** Node **26.10.0**, npm **11.19.1**. Focused CLI suite: 16 passed; final `npm run check`: 96 tests across six files, strict source/test typechecks, and one build passed. `npm pack --dry-run --ignore-scripts --offline` inspected 15 expected files (compiled modules/declarations, manifest, README, LICENSE); `git diff --check` and changed-document relative-link checks passed. `--ignore-scripts` reused the verified build rather than rerunning prepack. Initial sandbox execution failed with `listen EPERM` on `127.0.0.1`; allowing the local fixture listener resolved it. No external website or research script ran. Local Node 26 results do not establish the supported Node 22/24 matrix result.

**Remote verification/review:** [run 38094705019](https://github.com/jkup/sourcemapped/actions/runs/38094705019) passed both Node 22 and Node 24 jobs for implementation commit `be3c61b927f46a359fa94a99565abb4c2a500313`. Reviewer accepted the implementation unchanged, verified the package test rejects a temporarily broken executable declaration, restored the manifest, and reran all 16 new cases successfully. The [second observed run](docs/agent-runs/0002-cli-tests.md) received 9.5/10. The reviewer committed/pushed; the implementation agent did not. No remaining RM-03 work.

### RM-04 — Bounded sampling

**Next action:** compare document-order sampling with an explicit asset filter/limit or a documented first-party strategy on a small controlled set. GitHub's 4-to-16-map increase with doubled sampling motivates this; it does not prove one policy is best.

**Acceptance:** document request cost, discoveries, bias, and skipped counts; propose the smallest useful behavior change. If accepted, add deterministic fixtures and preserve hard shared budgets and visible scope. Update ADR 0002 if discovery policy changes.

### RM-05 — Failure presentation

**Acceptance:** default output groups repeated HTTP outcomes by useful context such as asset host and status. Verbose and JSON retain exact per-bundle evidence. Fixtures cover mixed 403/404 responses, rate-limit pauses, no-reference assets, and limits without calling private maps a defect. Keep output compact and terminal-safe.

**Implementation/evidence (2026-10-10):** [Renderer](src/render.ts) groups failed request attempts by responding host and HTTP status/failure kind, displaying the six largest groups plus an overflow count. Redirects use the responding host; shared maps count one actual attempt rather than one per bundle. Origin pauses and scan limits remain separate findings. Existing verbose evidence and JSON schema/status/count semantics are unchanged; this presentation-only change needs no report migration or ADR. [README](README.md) and [architecture](docs/architecture.md) explain the denominator and bounded display.

**Local verification:** Node **26.10.0**, npm **11.19.1**. Focused renderer suite: 19 passed, including six new synthetic cases covering mixed 403/404, shared maps, redirects, 429/503 pauses, missing references, request/sampling/byte limits, bounded groups, and terminal safety. After first review revision, final `npm run check`: **110 tests across six files**, strict source/test typechecks, and build passed. The first sandbox run passed 86 tests but could not start the existing CLI fixture (`listen EPERM` on `127.0.0.1`); rerunning with loopback permission passed all 102. The first review revision corrected singular/plural wording in pause, scan-limit, and overflow messages, adding eight zero/one/many cases; all 110 tests passed with loopback permission. Built renderer output was also inspected using a synthetic injected-fetch scan; no public-site requests or research refresh occurred. `git diff --check` and changed-document relative links passed. These are local results, not remote Node 22/24 evidence. Reviewer assessment/delivery and remote CI remain pending; implementation agent made no commit or push. No subsequent task started.

### RM-06 — Saved-report comparison

**Acceptance to start implementation:** document at least one concrete repeated deployment workflow and a small before/after fixture. Define stable identity across URL hashes, sampling differences, and schema versions before claiming regressions. A changed sample must not be reported as a disappeared map. Keep any implementation local and metadata-only.

### RM-07 — Standards and validation

**Acceptance to start implementation:** identify a real unsupported input, choose a bounded slice (for example indexed maps or inline-script origins), and list applicable TC39/independent fixtures. Reuse maintained decoding/validation libraries where appropriate. Acceptance for each slice includes precise count semantics, resource limits, and updated claims; “full conformance” cannot follow from a few unit tests.

### RM-08 — Local artifacts

**Acceptance to start implementation:** establish the owner workflow and design explicit local input syntax. Keep arbitrary discovered paths separate from user-selected filesystem paths. Specify relative source resolution and content retention. An implementation must preserve the no-source-export default and avoid implicit network requests for local source paths.

### RM-09 — Source summaries

**Acceptance to start implementation:** demonstrate a grouping that explains something useful beyond existing extension and package counts. Preserve source-entry versus unique-path distinctions and bounded evidence samples. Generated-byte attribution requires a separate decision with UTF-16, line-boundary, unmapped-segment, and denominator fixtures.

### RM-10 — Release

**Blocker:** npm package identity/ownership has not been confirmed and publication has not been requested. **Unblocking action:** establish the intended package name and release authorization; no credentials should be committed.

**Acceptance:** release checks include CI/CLI coverage from RM-02/RM-03, a reviewed tarball and JSON contract, matching package/CLI/User-Agent versions, verified install instructions, and recorded release identity. Local preparation can proceed when requested without publishing. Only mark publication done after a verified registry result.

## Completed

| ID | Completed | Outcome and evidence |
| --- | --- | --- |
| RM-00a | 2026-10-10 | Competitive review and 16-site baseline; [research](RESEARCH.md), [metadata](research/baseline.json), commit `a5e776e` |
| RM-00b | 2026-10-10 | Bounded TypeScript CLI, metadata reports, tests; [README](README.md), [source](src/scan.ts), commit `2bba76e` |
| RM-00c | 2026-10-10 | Same-site MVP evaluation and initial priorities; [evaluation](EVALUATION.md), commit `c12454c` |
| RM-02 | 2026-10-10 | Supported Node LTS CI, verified [remote run](https://github.com/jkup/sourcemapped/actions/runs/38094230079), and [agent review](docs/agent-runs/0001-ci.md); implementation commit `3584580` |
| RM-03 | 2026-10-10 | 16 built-CLI/packed-entry-point tests, 96 total tests passed remotely; [coverage and limits](docs/testing.md), [agent review](docs/agent-runs/0002-cli-tests.md); implementation `be3c61b` |
| RM-05 | 2026-10-10 | Bounded request-outcome groups and 14 regression cases; [renderer tests](test/render.test.ts), 110 local tests passed; review and remote verification pending |
| RM-11 | 2026-10-10 | Agent onboarding, running work queue, architecture/report docs, and three accepted ADRs; [AGENTS.md](AGENTS.md), [docs index](docs/README.md) |

## Deliberately deferred

| Work | Reason / condition for reconsideration |
| --- | --- |
| Image export | Typical reports must prove useful and worth sharing before adding rendering machinery. |
| Browser execution, recursive imports/manifests, route crawling | Added request surface and maintenance; require explicit demand, bounded design, and a new discovery decision. |
| Guessed sibling map URLs | Zero successes in 95 baseline guesses; require new evidence. |
| Full semantic validation and generated-byte coverage | Need a precise independent validation scope; see RM-07/RM-09. |
| Secret extraction, recovered-source export, SaaS, dashboards, authentication, plugin architecture, quality scores | Outside the current product purpose; do not treat these as implicit backlog commitments. |

## Change log

- **2026-10-10:** RM-05 review revision 1 corrected singular/plural wording in new pause, scan-limit, and overflow messages. Added eight zero/one/many cases; 19 renderer tests and all 110 local tests, typechecks, and build passed. Reviewer assessment/delivery and remote CI remain pending.

- **2026-10-10:** Completed RM-05 local implementation: bounded host/outcome groups with explicit attempt counts, origin pauses, and scan-limit findings. All 102 local tests, typechecks, and build passed. Verbose/JSON evidence retained; reviewer assessment, delivery, and remote verification pending.

- **2026-10-10:** Accepted RM-03 unchanged after independent negative-control testing and both remote jobs passed. Recorded grade 9.5/10 and clarified executable/package test boundaries in AGENTS.md. No subsequent task started.

- **2026-10-10:** Completed RM-03 executable/package smoke automation and explicit single-build test ordering. All 96 local tests/typechecks/build and package inspection passed; documented loopback permissions and package/TTY coverage limits. Reviewer delivery, remote CI, and observed-run assessment remain pending; no subsequent task started.

- **2026-10-10:** Completed RM-02 after both remote matrix jobs passed. Recorded observed-run grade 9/10 and clarified current-state checks and CI evidence in AGENTS.md. No subsequent task started.

- **2026-10-10:** Implemented RM-02 workflow and CI maintenance documentation. Local clean install, 80 tests/typechecks/build, actionlint, and whitespace checks passed; remote matrix results remain pending.
- **2026-10-10:** Completed RM-11. Added agent onboarding, documentation ownership, architecture and report semantics, accepted decision records, stable work IDs, acceptance criteria, and handoff rules. Runtime behavior unchanged.
- **2026-10-10:** Completed RM-00a/b/c. Narrowed the original idea to local deployment diagnostics after the public-site study. Omitted default guesses and deferred images; retained the broad product hypothesis as unproven.

## Success and stop criteria

Proceed if developers repeatedly use the report to inspect deployments and can explain what it helped them decide. If the compelling examples remain a few hand-picked sites, retain a small educational/diagnostic utility. Favor correctness and clear limits over expanding into a platform.
