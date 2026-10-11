# Decision records

ADRs record consequential choices and the evidence behind them. They describe accepted direction; [GitHub issues](https://github.com/jkup/sourcemapped/issues) track implementation work.

| ID | Status | Decision |
| --- | --- | --- |
| [0001](0001-local-deployment-diagnostics.md) | Accepted | Focus on local deployment diagnostics and metadata |
| [0002](0002-bounded-advertised-map-discovery.md) | Accepted | Bounded static discovery; advertised map references only |
| [0003](0003-analysis-and-report-semantics.md) | Accepted | Existing parser, scoped checks, evidence-first reports |
| [0004](0004-opt-in-asset-limit.md) | Accepted | Opt-in asset selection limit with unchanged shared budgets and report semantics |
| [0005](0005-structured-retrieval-evidence.md) | Accepted | Additive typed retrieval evidence; display text is not machine state |
| [0006](0006-local-bundler-demo.md) | Accepted | Development-only real-bundler demo with local CLI integration checks |

Use [template.md](template.md) for a new decision. Assign the next unused four-digit ID and a descriptive filename. Include context, alternatives, consequences, evidence, and what would justify reconsideration. A short record is enough; ordinary fixes need no ADR.

Statuses are `Proposed`, `Accepted`, `Superseded`, and `Rejected`. Accepted means chosen for this project, not standards conformance. To reverse a decision, add a replacement and mark the old record Superseded with a link; preserve its historical reasoning. Update this index and any affected issues in the same change.
