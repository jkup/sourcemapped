# ADR 0001: Focus on local deployment diagnostics

- Status: Accepted
- Date: 2026-10-10
- Evidence: [research](../../research/landscape-2026-10-10.md), [MVP evaluation](../../research/evaluation-2026-10-10.md)

## Context

The original hypothesis was a `whoiz`-like CLI revealing interesting source trees behind arbitrary websites. In a bounded convenience sample of 16 homepages, only GitHub and MDN provided analyzable maps. Other tools already offer website discovery, source recovery, treemaps, and debugging. This is not evidence of a new market or web-wide map prevalence.

## Decision

Position the MVP as a small, zero-configuration deployment-inspection CLI. Support both page and direct JavaScript URLs. Emphasize what was observed, what maps advertise, and why inspection was incomplete. Process data locally and report metadata without exporting original code, searching for secrets, or contacting an analysis service.

## Alternatives considered

- **General website archaeology:** appealing pitch, but most sampled runs did not expose original sources.
- **Source recovery:** established competition and unnecessary content-handling risk for this diagnostic purpose.
- **Hosted dashboard or image-first experience:** adds maintenance before recurring usefulness is demonstrated.

## Consequences

No-reference is an ordinary outcome, not a warning that a website is misconfigured. Advertised 403/404 responses can be useful even without an original-source inventory. Public marketing pages cannot stand in for whole applications. The core remains maintainable by one developer; image export, hosting, authentication, and plugin systems remain out of scope.

## Revisit when

Developers repeatedly use the tool on their own deployments and identify a concrete unmet workflow. Favor observed repeat use over favorable screenshots from a few hand-picked sites. The next validation step is recorded as RM-01 in the roadmap.
