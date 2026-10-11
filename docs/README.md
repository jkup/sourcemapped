# Project documentation

Start with [AGENTS.md](../AGENTS.md) for the working protocol and [ROADMAP.md](../ROADMAP.md) for current work. This directory records implementation context and durable decisions; it is not a second task queue.

## Find the right document

| Question | Read |
| --- | --- |
| How do I install and run it? | [README](../README.md) |
| What should I work on, and what is already done? | [Running roadmap](../ROADMAP.md) |
| What changed in the maintenance pass? | [RM-12 maintenance evidence](maintenance/2026-10-10.md) |
| Where does a behavior belong? | [Architecture](architecture.md) |
| How do executable/package tests run locally? | [Test setup and coverage](testing.md) |
| What does CI run and how are its versions maintained? | [CI maintenance](ci.md) |
| How did observed agent tasks perform? | [Agent run reviews](agent-runs/README.md) |
| What do JSON fields and statuses mean? | [Report contract](report-contract.md) |
| Why was this scope chosen? | [Decision records](decisions/README.md) |
| Does the product idea hold up? | [Research](../RESEARCH.md) and [MVP evaluation](../EVALUATION.md) |
| What has an owner-provided deployment shown? | [RM-01 exploratory observation](../research/jonkuperman-2026-10-10.md) |
| How do sampling policies compare on controlled fixtures? | [RM-04a offline study](../research/sampling-2026-10-10.md) |
| What can saved-report comparisons safely establish? | [RM-06a offline study and proposed semantics](../research/report-comparison-2026-10-10.md) |
| Where is the supporting evidence? | [Baseline snapshot](../research/baseline.json) and [MVP snapshot](../research/mvp.json) |

## Documentation ownership

- **AGENTS.md:** concise contributor instructions and invariants.
- **ROADMAP.md:** current status, priorities, open acceptance criteria and completion links; not duplicated verification logs.
- **README.md:** installation, supported behavior, examples, and user-facing limits.
- **Architecture and report contract:** how current code fits together and what its output means.
- **ADRs:** decisions, rejected alternatives, tradeoffs, and conditions for reconsideration.
- **Maintenance records:** dated findings and verification for cross-cutting maintenance; no numeric self-grades.
- **Agent run reviews:** reviewer grades, supporting evidence, interventions, and lessons carried into AGENTS.md; no separate task queue.
- **Research/evaluation:** dated observations. Preserve their historical meaning when code or websites change.

Update the document that owns a fact and link to it elsewhere. Prefer repository-relative links and runnable commands without machine-specific paths. Date new decisions and evidence. Documentation can be wrong: reconcile discrepancies against code, tests, and the original evidence.
