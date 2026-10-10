# Decision records

ADRs record consequential choices and the evidence behind them. They describe accepted direction; [ROADMAP.md](../../ROADMAP.md) tracks implementation work and priority.

| ID | Status | Decision |
| --- | --- | --- |
| [0001](0001-local-deployment-diagnostics.md) | Accepted | Focus on local deployment diagnostics and metadata |
| [0002](0002-bounded-advertised-map-discovery.md) | Accepted | Bounded static discovery; advertised map references only |
| [0003](0003-analysis-and-report-semantics.md) | Accepted | Existing parser, scoped checks, evidence-first reports |
| [0004](0004-opt-in-asset-limit.md) | Accepted | Opt-in asset selection limit with unchanged shared budgets and report semantics |

Use [template.md](template.md) for a new decision. Assign the next unused four-digit ID and a descriptive filename. Include context, alternatives, consequences, evidence, and what would justify reconsideration. A short record is enough; ordinary fixes need no ADR.

Statuses are `Proposed`, `Accepted`, `Superseded`, and `Rejected`. Accepted means chosen for this project, not standards conformance. To reverse a decision, add a replacement and mark the old record Superseded with a link; preserve its historical reasoning. Update this index and any affected roadmap items in the same change.
