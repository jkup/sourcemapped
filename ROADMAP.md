# Running roadmap

Last updated: **2026-10-10**. This is the single work queue and durable handoff for humans and agents. Read [AGENTS.md](AGENTS.md) before implementation and [the decisions](docs/decisions/README.md) before changing direction.

## Current state

The working MVP inspects page/direct JavaScript URLs and reports bounded source-map metadata through terminal, verbose, and JSON output. Research found useful maps on only two of sixteen sampled sites; deployment diagnostics are promising, broad website archaeology is unproven. See [RESEARCH.md](RESEARCH.md) and [EVALUATION.md](EVALUATION.md).

Latest local verification (RM-04, 2026-10-10): **131 tests passed**, strict source/test typechecks and build on Node 26.10.0/npm 11.19.1. Built help and a clean local tarball installation/bin command were exercised against synthetic loopback HTTP. RM-04 was accepted unchanged, committed/pushed, and passed both supported Node CI jobs; see exact evidence below.

Earlier local verification (RM-05, 2026-10-10): **110 tests passed**, strict source/test typechecks, and build on Node 26.10.0/npm 11.19.1. Both supported Node CI jobs also passed for the implementation; see RM-05 for exact revision, run, and review evidence.

Earlier local verification (RM-03, 2026-10-10): **96 tests passed**, strict source/test typechecks, one build, and dry-run package inspection on Node 26.10.0/npm 11.19.1. This includes built-CLI and unpacked-package entry-point checks against synthetic loopback HTTP. The earlier MVP baseline included manual installed-CLI and live MDN smoke checks; those were not rerun for RM-03. This is dated evidence, not a substitute for checking the current revision.

No npm release is recorded in the project history. The RM-04 implementation was committed and pushed to `origin/main`. Its 131-test suite, typechecks, and build passed on GitHub for Node 22 and 24; see RM-04 for the exact run and revision. Automated CLI subprocess and packed-entry-point checks now run in `npm test`; see [test setup](docs/testing.md) for loopback/subprocess requirements and coverage limits. The package still has two production dependencies; no separately started services or credentials are required.

Latest investigation: [RM-06a](research/report-comparison-2026-10-10.md) defines a hypothetical repeat-deployment workflow and conservative comparison semantics using 26 offline before/after pairs. Its local investigation is complete; independent review/delivery remain pending. RM-06 production comparison remains unimplemented pending owner-workflow evidence. Earlier [RM-04a](research/sampling-2026-10-10.md) is committed/pushed and independently reproduced; its selected recommendation is implemented under RM-04.

## Active work

None. RM-06a local investigation is complete and handed off for independent review. RM-06 implementation has not started; no subsequent task started.

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
| RM-04 | done | Improve bounded asset sampling | Opt-in `--max-assets`; [remote CI](https://github.com/jkup/sourcemapped/actions/runs/38096210967), [run review](docs/agent-runs/0005-asset-limit.md) |
| RM-04a | done | Investigate bounded sampling on controlled fixtures | [Offline study](research/sampling-2026-10-10.md); accepted implementation recorded under RM-04 |
| RM-05 | done | Group repeated failure evidence in terminal output | [110 tests passed remotely](https://github.com/jkup/sourcemapped/actions/runs/38095190779); [run review](docs/agent-runs/0003-failure-presentation.md) |
| RM-06 | needs-evidence | Compare saved metadata reports | Investigation/design under RM-06a; no production implementation authorized |
| RM-06a | done | Investigate conservative saved-report comparison | [Offline study](research/report-comparison-2026-10-10.md); 26 asserted pairs, production work remains under RM-06 |
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

**Next action:** none for the selected implementation; RM-04 is complete. Concrete owner feedback remains absent; synthetic map yield is not adoption evidence.

**Acceptance:** document request cost, discoveries, bias, and skipped counts; propose the smallest useful behavior change. If accepted, add deterministic fixtures and preserve hard shared budgets and visible scope. Update ADR 0002 if discovery policy changes.

**Implementation/evidence (2026-10-10):** [CLI](src/cli.ts) exposes `--max-assets N`, accepting decimal digits for positive safe integers (1–9007199254740991, leading zeros accepted) and forwarding only `maxScripts`. Defaults, document order, direct-JavaScript behavior, all shared budgets and schema version 1 remain unchanged. [ADR 0004](docs/decisions/0004-opt-in-asset-limit.md) extends ADR 0002 and records compatibility; [README](README.md), help, architecture and report-contract docs explain scope and limits. Twenty added [CLI cases](test/cli.test.ts) cover invalid values before any request, boundaries, larger selections with and without additional maps, and exhaustion of the default request cap. One [scanner case](test/scan.test.ts) retains shared-map, 404, redirect and skipped-count accounting with a larger selection.

**Local verification:** Node **26.10.0**, npm **11.19.1**. `npm run build` passed; the focused attempt passed 12 scanner tests but its 36 CLI cases could not start the loopback listener (`listen EPERM`). A sandboxed `npm run check` passed typechecks/build and 95 tests with the same CLI setup limitation. The permitted `npm run check` then passed **131 tests across six files**, typechecks and build. Built `--help` was inspected. `npm pack --dry-run --ignore-scripts --offline` with a temporary cache listed the expected 15 files; the default-cache attempt failed on cache write permissions. A disposable clean install of the local tarball fetched production dependencies from npm and successfully ran its npm bin command for help and two synthetic loopback scans (`--max-assets 1` and `2`); rendered output showed one versus zero skipped assets and unchanged request cap. The earlier offline install attempt failed with `ENOTCACHED`; the successful install used an empty temporary prefix/cache, not checkout dependencies. Scripts were disabled and the already verified build was packed. Temporary installation files were removed. `git diff --check` and changed-document relative links passed. No public-site scan, historical evidence refresh, commit or push occurred. These are implementer-local results with no TTY-progress claim; reviewer delivery and remote evidence follow.

**Review/delivery:** accepted unchanged, committed/pushed as `cfc6c36aeb9e36ffb28be955aa3eea49285c7203`. Reviewer inspected built help and independently passed all 48 CLI/scanner tests. [CI](https://github.com/jkup/sourcemapped/actions/runs/38096210967) passed all 131 tests, typechecks and build on Node 22/24. The [fifth observed run](docs/agent-runs/0005-asset-limit.md) received 9.5/10; AGENTS.md preserves the limit-testing pattern. No remaining selected RM-04 work.

### RM-04a — Controlled sampling investigation

**Acceptance:** compare current document-order selection with explicit limits/filtering or a precisely defined origin policy on small offline fixtures; record request cost, discoveries, bias, skipped counts, reproducible commands, and a bounded recommendation. Keep implementation as separate unfinished work.

**Evidence (2026-10-10):** [Harness](scripts/sampling-study.mjs), [dated method/results](research/sampling-2026-10-10.md), and [metadata snapshot](research/sampling-2026-10-10.json) compare five constructed pages across four policies (20 rows). Current scanner source `c55923a` is reused via injected responses. Request evidence includes a shared map, a 404 map, and a redirect stopped by the shared cap; zero-match policies retain original discovery/exclusion counts in the study format. D2/D4 are checked against the original full-page scan. No public network requests, refreshed historical research, dependencies, or production/report changes.

**Recommendation:** retain document-order defaults; consider only an opt-in asset-limit CLI flag as the smallest next behavior change, retaining all shared budgets. Origin and prefix filters have explicit counterexamples; defer a filter feature pending a concrete deployment workflow. This recommendation is not implementation approval.

**Local verification:** Node 26.10.0/npm 11.19.1; build and harness assertions passed, 20 rows reproduced byte-for-byte, changed-document relative links and `git diff --check` passed. No full production suite rerun or new remote CI claim. These are the implementer's local checks; reviewer evidence follows. At that handoff RM-04a's investigation was complete and RM-04 implementation had not started; later implementation is recorded above.

**Review/delivery:** accepted unchanged at `6dffa28e4ca6e182db1f043145446875a984fe7e`, committed/pushed by the reviewer. Independent reproduction, all row totals, and the prose result table agreed. [Run review](docs/agent-runs/0004-sampling-investigation.md): 9.5/10. [CI](https://github.com/jkup/sourcemapped/actions/runs/38095544909) passed the existing 110-test suite, typechecks, and build on Node 22/24; CI does not run the research harness. At that review the recommendation remained a future choice; its later implementation is recorded under RM-04 above.

### RM-05 — Failure presentation

**Acceptance:** default output groups repeated HTTP outcomes by useful context such as asset host and status. Verbose and JSON retain exact per-bundle evidence. Fixtures cover mixed 403/404 responses, rate-limit pauses, no-reference assets, and limits without calling private maps a defect. Keep output compact and terminal-safe.

**Implementation/evidence (2026-10-10):** [Renderer](src/render.ts) groups failed request attempts by responding host and HTTP status/failure kind, displaying the six largest groups plus an overflow count. Redirects use the responding host; shared maps count one actual attempt rather than one per bundle. Origin pauses and scan limits remain separate findings. Existing verbose evidence and JSON schema/status/count semantics are unchanged; this presentation-only change needs no report migration or ADR. [README](README.md) and [architecture](docs/architecture.md) explain the denominator and bounded display.

**Local verification:** Node **26.10.0**, npm **11.19.1**. Focused renderer suite: 19 passed, including six new synthetic cases covering mixed 403/404, shared maps, redirects, 429/503 pauses, missing references, request/sampling/byte limits, bounded groups, and terminal safety. After first review revision, final `npm run check`: **110 tests across six files**, strict source/test typechecks, and build passed. The first sandbox run passed 86 tests but could not start the existing CLI fixture (`listen EPERM` on `127.0.0.1`); rerunning with loopback permission passed all 102. The first review revision corrected singular/plural wording in pause, scan-limit, and overflow messages, adding eight zero/one/many cases; all 110 tests passed with loopback permission. Built renderer output was also inspected using a synthetic injected-fetch scan; no public-site requests or research refresh occurred. `git diff --check` and changed-document relative links passed. These are local results, not remote Node 22/24 evidence. Implementation agent made no commit or push; reviewer delivery and remote results are recorded below. No subsequent task started.

**Remote verification/review:** [run 38095190779](https://github.com/jkup/sourcemapped/actions/runs/38095190779) passed both Node 22 and Node 24 jobs for implementation `7c2ee0e97ee6b71a5560a73c80a44ce27f9b71d2`. Reviewer accepted after one singular/plural wording revision, independently ran all 19 renderer tests and inspected a separate synthetic built-output example, then committed/pushed. The [third observed run](docs/agent-runs/0003-failure-presentation.md) received 9/10. AGENTS.md now calls out actual rendered count/truncation checks. No remaining RM-05 work.

### RM-06 — Saved-report comparison

**Acceptance to start implementation:** document at least one concrete repeated deployment workflow and a small before/after fixture. Define stable identity across URL hashes, sampling differences, and schema versions before claiming regressions. A changed sample must not be reported as a disappeared map. Keep any implementation local and metadata-only.

**Investigation outcome (2026-10-10):** RM-06a completes the hypothetical workflow, fixture, and identity-design portion. This is not evidence of repeat use or approval to implement. Exact URL observations are possible, but hashes remain unmatched and aggregate changes are not regressions. Production implementation is deliberately deferred while this item remains `needs-evidence`.

**Next action:** obtain an authorized owner workflow and paired reports with capture/scanner provenance and intended publication policy; determine whether exact-URL observations answer the decision. Then select scope and specify input validation/bounds, comparison-output compatibility, provenance handling, terminal/exit semantics, and tests. No comparison CLI/API/schema has been implemented.

### RM-06a — Controlled report-comparison investigation

**Acceptance:** document a hypothetical repeated deployment-checking workflow, reproduce small offline before/after reports from current scanner behavior, define conservative identity/scope/schema/outcome semantics, demonstrate useful changes plus false-regression counterexamples, and recommend whether to implement. Preserve unfinished RM-06 and historical evidence.

**Evidence (2026-10-10):** [Study](research/report-comparison-2026-10-10.md), [harness](scripts/report-comparison-study.mjs), and [metadata evidence](research/report-comparison-2026-10-10.json) contain 23 synthetic scanner captures plus four labeled reader controls and 26 asserted comparison pairs against source `dc55ac9`. Cases include content-slot loss, no-reference/invalid/unavailable/unsupported/limited transitions, retrieval recovery, skipped/failed JavaScript, changed selection, hashed URLs, target/scope/schema incompatibility, redirects, inline linkage, and shared-map relationship counts. All fetches are injected; no external requests or source bodies are persisted.

**Recommendation:** defer production RM-06 pending owner-workflow evidence. Exact URL equality identifies a requested location, not content or lineage; a changed sample and aggregate decline must not be called a disappeared map. The workflow is hypothetical, with no adoption or owner-feedback claims. This is a research proposal, not a changed product/report contract or accepted ADR.

**Local verification:** Node 26.10.0/npm 11.19.1; build and all harness assertions passed; two runs reproduced byte-for-byte. Changed-document relative links and `git diff --check` passed. No full production suite rerun, CLI/API/dependency/schema changes, external scan, outreach, historical refresh, commit or push. The harness is not part of CI; independent reviewer assessment/delivery and remote verification remain pending. No subsequent task started.

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
| RM-04 | 2026-10-10 | Opt-in asset-limit CLI, 21 regression cases and unchanged shared budgets/schema; [131 tests passed remotely](https://github.com/jkup/sourcemapped/actions/runs/38096210967); [run review](docs/agent-runs/0005-asset-limit.md) |
| RM-04a | 2026-10-10 | Controlled offline sampling comparison; [method/results](research/sampling-2026-10-10.md), [harness](scripts/sampling-study.mjs), and [metadata](research/sampling-2026-10-10.json); no production change |
| RM-05 | 2026-10-10 | Bounded request-outcome groups and 14 regression cases; [renderer tests](test/render.test.ts), 110 tests passed remotely; [agent review](docs/agent-runs/0003-failure-presentation.md); implementation `7c2ee0e` |
| RM-06a | 2026-10-10 | Offline comparison investigation; [hypothetical workflow, results and limits](research/report-comparison-2026-10-10.md), [harness](scripts/report-comparison-study.mjs), [metadata](research/report-comparison-2026-10-10.json); RM-06 unimplemented |
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

- **2026-10-10:** Completed RM-06a local investigation: hypothetical deployment workflow, conservative comparison design and 26 asserted offline pairs. Build, deterministic reproduction, relative links and whitespace checks passed. Recommend deferring RM-06 production implementation pending owner-workflow evidence; no user demand claimed. Independent review/delivery pending; no subsequent task started.

- **2026-10-10:** Accepted RM-04 unchanged; committed/pushed and all 131 tests passed on Node 22/24 CI. Recorded grade 9.5/10 and added limit-testing guidance. No subsequent task started.

- **2026-10-10:** Implemented RM-04’s selected opt-in `--max-assets` recommendation, preserving document order, defaults, shared budgets and report semantics. Added 21 deterministic cases; all 131 local tests/typechecks/build passed. Checked help, tarball contents and a clean installed command with synthetic loopback output. Independent review/delivery and remote CI pending; no subsequent task started.

- **2026-10-10:** Accepted RM-04a unchanged after independent reproduction and arithmetic/table checks; committed/pushed, with production CI passing on Node 22/24. Grade 9.5/10; AGENTS.md preserves baseline/counterexample research guidance. RM-04 remains unimplemented, and no subsequent task started.

- **2026-10-10:** Completed RM-04a offline investigation with five synthetic pages and four explicit sampling policies; documented actual request costs and disjoint skipped counts. Proposed an opt-in asset limit while retaining defaults. RM-04 production work remains unimplemented pending review/selection; reviewer assessment and delivery are pending. No subsequent task started.

- **2026-10-10:** Accepted RM-05 after one minor wording revision; committed/pushed and both supported Node CI jobs passed. Recorded grade 9/10 and added rendered-output review guidance. No subsequent task started.

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
