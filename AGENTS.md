# Working on sourcemapped

Build a small, trustworthy CLI for publicly advertised source-map metadata. Deployment diagnostics are the focus; broad website archaeology and repeat usefulness remain unproven. Follow the user's task, not every possible roadmap improvement.

## Start here

1. Check `git status --short`; preserve unrelated work.
2. Read [ROADMAP.md](ROADMAP.md) for current state, active work and the relevant acceptance criteria. The queue is context, not permission to start another task.
3. Read the affected source/tests and the relevant links in [docs/README.md](docs/README.md). Source establishes behavior; docs explain intent. Investigate discrepancies.
4. For runtime changes, consult [architecture](docs/architecture.md); for evidence/JSON changes, also consult the [report contract](docs/report-contract.md) and relevant [decisions](docs/decisions/README.md).

Do not load large research snapshots by default. Use their summaries and inspect only relevant evidence.

## Implementation boundaries

- Keep strict TypeScript, NodeNext `.js` imports and small modules. Prefer Node APIs and the existing parsers over new dependencies, frameworks or custom numeric VLQ/HTML parsers.
- `discover.ts` owns reference extraction; `network.ts` owns shared budgets; `analyze.ts` owns metadata checks; `scan.ts` owns orchestration/reporting; `render.ts` owns presentation; `cli.ts` owns invocation. See architecture for details.
- Use structured outcomes for logic, human error strings for display. Preserve evidence across layers. Treat dictionary keys from remote data as untrusted, including inherited object-property names.
- Read package identity from [package.json](package.json) through `src/package.ts`; do not duplicate version literals. Defaults belong in `DEFAULT_LIMITS`, not separately maintained constants.
- Do not edit generated `dist/`, dependencies or tarballs as fixes. Avoid broad refactors or formatting churn unrelated to an observed problem.

## Product invariants

- Inspect bounded static references or one direct JavaScript URL. No implicit browser execution, crawling, guessed maps, original-source fetching or inspected-code execution.
- Reports remain metadata-only: no source bodies, symbol-name arrays or inline payloads. Sanitize untrusted terminal text with `safeText`; JSON stdout must contain one report, with progress on stderr.
- Keep no reference, retrieval failure, invalid, unsupported, skipped and limited outcomes distinct. `checked` means only the implemented checks passed, never full conformance or debugging correctness.
- Preserve the report's denominators: source entries and bundle/map relationships are not globally unique files or HTTP requests. Package paths are evidence, not framework/version/vulnerability proof. See the contract rather than redefining counts here.
- Keep request/byte/time budgets shared, including redirects and failures; preserve rate-limit pauses and parsing limits. More selected assets must not silently raise other budgets.
- Changes to scope, dependencies, discovery policy or compatibility need a small decision record. Ordinary fixes need no ADR. Additive report fields still need documented compatibility and tests.

## Verify proportionately

```sh
npm ci                     # only when installation/lockfile changes require it
npm run check              # typecheck, doc links, one build, offline tests
npm run check:docs         # local Markdown file links only
npm test -- test/scan.test.ts  # focused tests, with a fresh build
node dist/cli.js --help
```

- Reproduce bugs and add tests that detect the actual failure. Include relevant boundary/counterexamples, not just implementation-shaped assertions. Use synthetic responses and loopback fixtures, not public websites.
- Run focused checks while editing and `npm run check` before runtime handoff. Inspect rendered output when presentation changes. For docs-only work, check claims, run `npm run check:docs` and `git diff --check` instead of rerunning runtime tests.
- On failure, preserve useful diagnostics and determine the cause. Do not turn repeated failures into success by skipping checks, blindly retrying or increasing timeouts. Environment restrictions and product defects are different findings.
- Follow [testing and packaging guidance](docs/testing.md) for executable changes and [CI guidance](docs/ci.md) for workflows. Report the boundary actually exercised (built, packed, installed), actual runtime, and local versus remote results. Never infer a pass from another revision.
- Live studies are separate investigations. Preserve dated evidence and source revision; validate the baseline and counterexamples. Synthetic examples do not prove prevalence, demand or adoption. Before/after claims require comparable identity, scope and provenance; unobserved is not absent.

## Keep project memory small and accurate

- Update the relevant roadmap item when starting/finishing substantive work. Keep only current state, active ownership, open acceptance criteria and compact completion links there. Put detailed verification in one dated evidence record or the PR; do not repeat it across summaries, change logs and reviews.
- Before adding guidance, identify a reusable failure mode that existing instructions do not cover. Prefer replacing/merging a rule or improving a test/tool over appending another bullet. A successful task does not require an AGENTS.md change.
- AGENTS.md owns working rules; the roadmap owns the queue; README owns user behavior; architecture/contract own technical semantics; ADRs own consequential decisions. Link to the owner instead of copying its contents. Recheck nearby current-state claims when editing; preserve historical records as history.
- For explicitly observed trials, record review evidence and interventions in [agent runs](docs/agent-runs/README.md). Task-execution grades are not codebase/product scores or independent benchmarks. No automatic high score for green tests, self-grading, or invented precision.
- Finish at the authorized task boundary. If remaining ideas need user evidence, say so rather than manufacturing another feature or research task to keep agents busy.

## Delivery

Make routine reversible decisions autonomously within the task; these docs add no approval gate. Preserve existing authorization. Commit/push when requested, with focused commits and a clean accounting of remaining work; publishing a package or contacting others needs its own authorization. Delegate only when the user/task asks for it. Use `codex/` for new branches unless directed otherwise.
