# Roadmap

The 16-site study supports a modest deployment diagnostic utility. It does not establish demand for a general-purpose website archaeology tool. Keep the project small until repeat usage proves otherwise.

## Next: validate usefulness, then release

1. **Try it with developers on their own deployments.** Ask whether the report changes a debugging decision, saves repetitive DevTools inspection, or catches a publication regression. Seek repeat usage, not just screenshots. If these reports do not help, stop expanding the product.
2. **Release hygiene.** Confirm npm-name ownership/availability, choose a scoped name if needed, and add CI across supported Node LTS releases. Review the package tarball and JSON contract before an initial release. Nothing has been published yet.
3. **Make bounded sampling more useful.** GitHub increased from four to sixteen maps when the sample doubled. Evaluate an explicit asset limit/filter or deterministic first-party sampling, always retaining skipped counts. Do not silently claim complete application coverage.
4. **Improve failure explanations.** Group repeated HTTP outcomes by asset host, expose rate-limit pauses clearly, and add concise next-inspection suggestions. Avoid generic advice to publish private maps.

## Then, if developers return

- **Compare saved metadata reports.** Show newly inaccessible maps, changed source-content availability, and changed asset scope. A small local comparison command could make deployment verification repeatable.
- **Broaden tested standards support.** Add inline-script source origins, indexed maps with section-aware counts and offsets, and a published validator integration if available. Run applicable TC39 conformance fixtures before increasing validation claims.
- **Direct local bundle/map pairs.** Investigate whether owner-provided build outputs are more useful than anonymous public-site scans. Avoid silently uploading anything.
- **Richer source summaries.** Show source directory groupings, non-code extensions, and package path evidence. Keep generated-byte attribution separate; add it only with precise UTF-16/line-boundary semantics and meaningful fixtures.

## Deliberately deferred

- **Image export:** only after typical useful reports warrant sharing. A mapless report does not become more informative as a PNG.
- **Browser-assisted discovery:** improves runtime completeness but adds weight and maintenance. Prefer explicit opt-in if evidence supports it.
- **Recursive imports, manifests, route crawling:** broaden requests and bias conclusions. Outside the default scanner.
- **Speculative `.map` probes:** 0/95 successes in the baseline. Require new evidence before investing.
- **Secret extraction, recovered-source export, SaaS, dashboards, authentication, plugins, quality scores:** outside this project's purpose.

## Success and stop criteria

Proceed if developers repeatedly use it to inspect their deployments and can explain what the report helped them decide. Prioritize correctness and understandable limits over feature count. If compelling examples remain a few hand-picked sites, retain this as a small educational/diagnostic utility rather than building a platform or promising “another whoiz.”
