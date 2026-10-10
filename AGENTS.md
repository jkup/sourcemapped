# Working on sourcemapped

## Purpose

Build a small, trustworthy CLI for understanding publicly advertised source maps behind a deployed page or JavaScript URL. Favor useful evidence and clear limits over impressive-looking claims. The initial study supports deployment diagnostics; broad website archaeology remains unproven.

This file is the entry point for agents working anywhere in this repository. Follow the user's current task; the roadmap is context, not authorization to expand that task.

## Start here

1. Read this file and [ROADMAP.md](ROADMAP.md), especially **Current state**, **Active work**, and the relevant item's acceptance criteria.
2. Check `git status --short`. Preserve existing work; do not reset or overwrite unrelated changes.
3. Read [docs/README.md](docs/README.md) for the documentation map. For code changes, read [architecture](docs/architecture.md) and the relevant [decisions](docs/decisions/README.md). For report changes, read the [report contract](docs/report-contract.md).
4. Read the affected source and its tests before editing. Documents explain intent; source establishes current behavior. If they disagree, investigate and fix the discrepancy rather than assuming either is correct.

Avoid loading the large `research/*.json` snapshots by default. Use the research summaries first, then inspect specific observations when needed.

## Setup and verification

Use npm and the committed lockfile. Node.js 22.12+ is required; there are no credentials, environment files, services, or database setup steps.

```sh
npm ci                       # when dependencies are absent or the lockfile changed
npm run typecheck            # strict checks for source and tests
npm test                     # build once, then offline Vitest tests
npm run build                # compile src into dist
npm run check                # typecheck + build once + tests
node dist/cli.js --help
npx --no-install vitest run test/discover.test.ts  # example focused test
```

- For behavior changes, add a regression test that proves the user-visible behavior, run focused tests during iteration, and run `npm run check` before handoff.
- For documentation-only changes, verify claims against source, relative links, commands, and `git diff --check`; a full test rerun is unnecessary unless runtime behavior changed.
- For packaging changes, run `npm pack --dry-run` and inspect the file list. For entry-point changes, also exercise the built CLI and a locally installed tarball. Packing does not publish.
- For executable/package tests, state the boundary actually exercised: built files, a packed artifact, or an installed command. Reusing checkout dependencies does not verify clean dependency installation or npm bin shims. Keep those limits explicit; use a small reversible negative check when useful to confirm the test catches its intended failure.
- For CI changes, use a workflow-aware validator such as `actionlint` when available. Record the actual local Node/npm versions separately from the remote matrix, and tie remote pass claims to a run URL and commit. A local pass is not a remote pass.
- `dist/`, `node_modules/`, and tarballs are generated and ignored. Never edit generated output as the fix.
- [CI](.github/workflows/ci.yml) runs the offline checks on supported Node LTS versions; there is no configured linter. Do not report checks that were not run. If a check is blocked, record the exact limitation and the checks that did run.

## Where changes belong

| Concern | Implementation | Tests |
| --- | --- | --- |
| Target normalization, static HTML, map reference extraction | `src/discover.ts` | `test/discover.test.ts` |
| HTTP, redirects, budgets, rate limits, data URLs | `src/network.ts` | `test/network.test.ts` |
| Map checks, source counts, path/package evidence | `src/analyze.ts` | `test/analyze.test.ts` |
| Scan orchestration, map cache, report aggregation | `src/scan.ts` | `test/scan.test.ts` |
| Terminal presentation and untrusted text | `src/render.ts` | `test/render.test.ts` |
| CLI arguments, stdout/stderr, exit codes | `src/cli.ts` | `test/cli.test.ts` (built subprocesses and packed entry point) |

Keep TypeScript strict and ESM imports compatible with NodeNext (`.js` specifiers in source). Prefer Node APIs and the existing two production dependencies. Reuse `htmlparser2` and `@jridgewell/trace-mapping`; do not add a custom HTML parser or numeric VLQ decoder. Use simple modules rather than introducing a plugin or application framework.

## Correctness rules

- Static references are not assets observed loading or executing. Keep skipped counts and scan scope visible.
- No map reference, inaccessible JavaScript, inaccessible map, invalid map, unsupported map, and budget limit are different outcomes. Preserve the evidence behind each.
- `checked` means the implemented checks passed, not full ECMA-426 conformance, semantic accuracy, or correct debugging.
- Source counts are entries across bundle/map relationships, not globally unique files. An empty embedded string counts as content; null/missing content does not.
- Package paths are evidence about map metadata, not proof of a site's framework, dependency version, or vulnerability.
- Never substitute bundle availability or source-content percentages for generated-code coverage. No ambiguous quality score.
- Keep reports metadata-only. Do not persist or print source bodies, symbol-name arrays, or inline map payloads; do not fetch original source URLs, search for secrets, or execute inspected code.
- Keep budgets shared across the scan, count redirects and failed HTTP attempts, honor rate-limit pauses, and bound parsing work as well as downloads.
- Sanitize remote text through `safeText` before terminal display. Keep JSON as structured data; progress belongs on stderr, never in JSON stdout.
- Report-contract changes need matching tests, documentation, and a compatibility decision. See [docs/report-contract.md](docs/report-contract.md).

## Tests and field research

Use synthetic maps, native `Response` objects, and injected `fetchImpl` for deterministic tests. Do not make the regular test suite depend on real websites. Prefer boundary cases and observable behavior over tests mirroring implementation details.

Live scans are optional investigations, not routine verification. `scripts/probe.mjs` is a historical exploratory harness with known regex limitations; production behavior lives in `src/`. `scripts/evaluate.mjs` runs the built scanner and overwrites `research/mvp.json`. Both scripts make public network requests and overwrite evidence files.

Only rerun a study when it addresses the task. Preserve earlier observations or deliberately create a dated replacement with method, limits, source revision, and changed conclusions documented. Never silently refresh historical data merely to make tests pass. Do not save fetched JavaScript or original source content as fixtures; create a minimal synthetic reproduction instead.

## Keep project memory current

- Use [ROADMAP.md](ROADMAP.md) as the single running work queue. When starting a listed item, mark it `in-progress` and add a short Active work entry. Do not claim an item merely because it appears next.
- Add a small scoped item for substantive unlisted work. Update status, evidence, next action, and the dated change log when finishing or handing off. Use `blocked` only with a concrete dependency; clear completed ownership entries.
- Keep completed items with evidence links. Do not mark an item done until its acceptance criteria are met. Record remaining work explicitly rather than presenting a partial implementation as complete.
- Add or supersede an ADR for changes to product scope, discovery strategy, validation semantics, privacy, dependency strategy, or report compatibility. Use [the ADR template](docs/decisions/template.md). Ordinary fixes do not require an ADR.
- Update user-facing behavior in README, internal behavior in `docs/`, and verification evidence in the handoff. Avoid copying mutable defaults into multiple documents; link to their source.
- When editing a current-state summary, recheck adjacent claims against Git history, configuration, and available run evidence. Do not carry forward stale statements about publication, pushes, or pending work merely because they were already written; preserve dated historical evidence as history.
- When useful, leave a handoff containing the roadmap ID, changed files, checks and results, unresolved questions, and the next concrete step. Keep the durable state in the roadmap rather than relying on chat history.
- For observed agent trials, have the reviewer record correctness, scope discipline, verification, product judgment, and communication in `docs/agent-runs/`. Separate the agent's work from reviewer interventions and link supporting evidence. Change this guide only for reusable lessons, not to add a rule for every isolated mistake.

## Scope and delivery

Make routine implementation decisions autonomously within the task. These docs do not introduce an extra approval gate for reversible local work. Preserve user authorization already given. Do not publish a package, push changes, or change external services unless the task authorizes it.

Keep changes focused and commits logical when committing is requested. Do not include unrelated work. If creating a branch, use `codex/` unless the user specifies otherwise. Delegate only when the user or task calls for it; assign non-overlapping files and reconcile results before reporting completion.

Images, browser execution, recursive crawling, source export, hosted services, and full conformance validation are not implied extensions of the MVP. Consult the roadmap and decisions before expanding scope.
