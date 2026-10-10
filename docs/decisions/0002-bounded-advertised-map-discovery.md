# ADR 0002: Use bounded static discovery and advertised map references

- Status: Accepted
- Date: 2026-10-10
- Evidence: [baseline experiment](../../RESEARCH.md), [MVP evaluation](../../EVALUATION.md)
- Implementation: [discovery](../../src/discover.ts), [networking](../../src/network.ts)

## Context

Static HTML can reveal useful assets cheaply but misses runtime imports and other routes. Sampling heavily affects findings: GitHub rose from four maps in 12 sampled assets to sixteen in 24. All 95 conventional sibling `.map` guesses in the baseline failed. A broad regex also falsely interpreted a BBC JavaScript string as a map annotation.

## Decision

Inspect one document and a bounded number of its external script/script-preload references, or accept a direct JavaScript resource. Honor base URLs and redirects. Resolve explicit source-map headers or trailing annotations; do not guess map filenames, execute code, or crawl unrelated routes.

Use [ECMA-426's without-parsing JavaScript extraction algorithm](https://tc39.es/ecma426/#sec-javascriptextractsourcemapurl), with standard header precedence and legacy header support. Keep shared request/byte/time limits and parser-allocation limits. Identify the tool in HTTP requests and pause rate-limited origins.

## Alternatives considered

- **Sibling `.map` probing:** increased traffic without successes in this study.
- **Regex search anywhere in JavaScript:** created a confirmed false positive. Apparent discoveries are not worth misleading diagnoses.
- **Browser execution or recursive chunk discovery:** better completeness, but greater dependency weight, request surface, and maintenance.
- **Unlimited asset inspection:** large pages make this costly and unpredictable.

## Consequences

Report static references and explicit sampling scope; never claim all bundles were loaded or inspected. Keep no-reference, fetch failures, and resource limits distinct. Some valid annotations outside the supported extraction variant are missed. Preloads may never run. Default limits live in code and the runtime report rather than this historical decision record.

## Revisit when

Usage shows an important missed class of assets and a bounded method improves results enough to justify its cost. RM-04 evaluates sampling. Browser support or probes need separate evidence and a new decision; they must not appear silently as a “discovery fix.”
