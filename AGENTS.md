# Working on sourcemapped

Read [ROADMAP.md](ROADMAP.md), check `git status`, and preserve unrelated changes. Work on the requested task; the roadmap is not permission to start another one.

## Code

- Keep strict TypeScript and NodeNext `.js` imports. Prefer Node APIs and existing parsers over new dependencies.
- Module boundaries: discovery extracts references; networking owns shared budgets; analysis checks metadata; scan orchestrates; render presents; CLI handles invocation. See [architecture](docs/architecture.md).
- Use typed outcomes for logic and error strings for display. Remote dictionary keys may match inherited object properties.
- Package identity comes from `package.json` through `src/package.ts`; scan defaults come from `DEFAULT_LIMITS`.
- Edit source, not generated `dist/`, dependencies or tarballs. Keep refactors tied to the task.

## Behavior

- Inspect static references or one direct JavaScript URL. Do not execute inspected code, crawl, guess map URLs or fetch original sources.
- Reports contain metadata, not source bodies, symbol-name arrays or inline map payloads. Sanitize remote terminal text with `safeText`; progress goes to stderr, JSON alone to stdout.
- Keep missing references, failed retrieval, invalid, unsupported, skipped and limited outcomes distinct. A checked map passed our implemented checks, not full conformance testing.
- Preserve count meanings and shared budgets, including redirects and failures. See the [report contract](docs/report-contract.md) before changing evidence or JSON.
- Record consequential scope, dependency or compatibility choices in a short [decision](docs/decisions/README.md). Ordinary fixes do not need one.

## Verification

- Reproduce bugs with meaningful regression cases. Use synthetic responses and local fixtures rather than public websites in tests.
- Run focused tests while editing and `npm run check` before handing off code changes. Inspect actual terminal output for presentation changes; keep clean default reports short and diagnostics in `--verbose`.
- Investigate failures instead of skipping checks, blindly retrying or increasing timeouts. Preserve useful child-process diagnostics.
- Follow [testing guidance](docs/testing.md) for executable/package changes. Distinguish built, packed and installed checks, and local results from CI results on another revision.
- For docs-only changes, run `npm run check:docs` and `git diff --check`. Check claims as well as links.

## Documentation and delivery

- README is for users; roadmap is for priorities; architecture/contract explain behavior; decisions explain tradeoffs. Link instead of repeating information.
- Replace outdated guidance rather than appending task logs. Add a rule only for a recurring failure that tests or tooling cannot address better.
- Keep dated research clearly historical. Synthetic fixtures and successful scans do not establish demand or web-wide prevalence.
- Make routine reversible decisions without extra approval. Honor the user's existing commit/push/publication instructions. Delegate only when asked; use `codex/` for new branches.
