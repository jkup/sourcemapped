# Project documentation

Start with [AGENTS.md](../AGENTS.md) for the working protocol and [ROADMAP.md](../ROADMAP.md) for current work. This directory records implementation context and durable decisions; it is not a second task queue.

## Find the right document

| Question | Read |
| --- | --- |
| How do I install and run it? | [README](../README.md) |
| What should I work on, and what is already done? | [Running roadmap](../ROADMAP.md) |
| Where does a behavior belong? | [Architecture](architecture.md) |
| What does CI run and how are its versions maintained? | [CI maintenance](ci.md) |
| What do JSON fields and statuses mean? | [Report contract](report-contract.md) |
| Why was this scope chosen? | [Decision records](decisions/README.md) |
| Does the product idea hold up? | [Research](../RESEARCH.md) and [MVP evaluation](../EVALUATION.md) |
| Where is the supporting evidence? | [Baseline snapshot](../research/baseline.json) and [MVP snapshot](../research/mvp.json) |

## Documentation ownership

- **AGENTS.md:** concise contributor instructions and invariants.
- **ROADMAP.md:** status, priorities, acceptance criteria, blockers, and handoffs.
- **README.md:** installation, supported behavior, examples, and user-facing limits.
- **Architecture and report contract:** how current code fits together and what its output means.
- **ADRs:** decisions, rejected alternatives, tradeoffs, and conditions for reconsideration.
- **Research/evaluation:** dated observations. Preserve their historical meaning when code or websites change.

Update the document that owns a fact and link to it elsewhere. Prefer repository-relative links and runnable commands without machine-specific paths. Date new decisions and evidence. Documentation can be wrong: reconcile discrepancies against code, tests, and the original evidence.
