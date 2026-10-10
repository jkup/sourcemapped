# Running roadmap

Last updated: **2026-10-10**. This is the single work queue and durable handoff for humans and agents. Read [AGENTS.md](AGENTS.md) before implementation and [the decisions](docs/decisions/README.md) before changing direction.

## Current state

The working MVP inspects page/direct JavaScript URLs and reports bounded source-map metadata through terminal, verbose, and JSON output. Research found useful maps on only two of sixteen sampled sites; deployment diagnostics are promising, broad website archaeology is unproven. See [RESEARCH.md](RESEARCH.md) and [EVALUATION.md](EVALUATION.md).

Last verified runtime baseline: **80 tests passed**, strict source/test typechecks, build, package inspection, isolated installed-CLI smoke checks, and a live MDN check on 2026-10-10. Later documentation changes were checked against source and for valid links. This is dated evidence, not a substitute for checking the current revision.

No npm release or remote push has been made as of this update. CI and automated CLI subprocess tests are not implemented. The package has two production dependencies; no services or credentials are required.

## Active work

None. No owner or blocker is carried forward from the initial implementation.

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

Order reflects product priority. Follow the user's task first. RM-01 is the main product question; RM-02 and RM-03 are the next bounded engineering candidates when implementation work is requested.

| ID | Status | Work | Dependency / completion evidence |
| --- | --- | --- | --- |
| RM-01 | needs-evidence | Validate repeat usefulness on developers' own deployments | Real feedback; no outreach without authorization |
| RM-02 | ready | Add CI for supported Node LTS versions | Existing offline checks |
| RM-03 | ready | Automate CLI and package smoke coverage | Existing manual MVP smoke procedure |
| RM-04 | needs-evidence | Improve bounded asset sampling | Compare strategies without silently expanding scope |
| RM-05 | ready | Group repeated failure evidence in terminal output | Preserve per-bundle JSON and existing statuses |
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

### RM-03 — Automated CLI and package smoke checks

**Acceptance:** deterministic tests run the built executable, covering help/version, bad flags, JSON stdout/stderr separation, verbose output, target failure exits, and omission of original content. Include a package-entry-point check with an isolated synthetic HTTP fixture or equivalent. No third-party websites. Keep build/test ordering explicit and avoid redundant rebuilds. Document any additional test-environment requirement.

### RM-04 — Bounded sampling

**Next action:** compare document-order sampling with an explicit asset filter/limit or a documented first-party strategy on a small controlled set. GitHub's 4-to-16-map increase with doubled sampling motivates this; it does not prove one policy is best.

**Acceptance:** document request cost, discoveries, bias, and skipped counts; propose the smallest useful behavior change. If accepted, add deterministic fixtures and preserve hard shared budgets and visible scope. Update ADR 0002 if discovery policy changes.

### RM-05 — Failure presentation

**Acceptance:** default output groups repeated HTTP outcomes by useful context such as asset host and status. Verbose and JSON retain exact per-bundle evidence. Fixtures cover mixed 403/404 responses, rate-limit pauses, no-reference assets, and limits without calling private maps a defect. Keep output compact and terminal-safe.

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

- **2026-10-10:** Completed RM-11. Added agent onboarding, documentation ownership, architecture and report semantics, accepted decision records, stable work IDs, acceptance criteria, and handoff rules. Runtime behavior unchanged.
- **2026-10-10:** Completed RM-00a/b/c. Narrowed the original idea to local deployment diagnostics after the public-site study. Omitted default guesses and deferred images; retained the broad product hypothesis as unproven.

## Success and stop criteria

Proceed if developers repeatedly use the report to inspect deployments and can explain what it helped them decide. If the compelling examples remain a few hand-picked sites, retain a small educational/diagnostic utility. Favor correctness and clear limits over expanding into a platform.
