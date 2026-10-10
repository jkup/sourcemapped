# sourcemapped: research and product decision

Research and implementation began on **2026-10-10**. The experiments preceded the production CLI; the first positive results came from MDN and GitHub. The baseline script is deliberately a separate exploratory instrument.

**Decision: build a small deployment-inspection CLI, but do not claim the “interesting on any popular website” idea is validated.** Only two of sixteen sampled sites exposed usable maps. URL discovery already exists in competing tools. The opportunity is a clear, local report that aggregates evidence and distinguishes unavailable maps from unadvertised ones.

The MVP inspects a single document and its static script/preload references, with direct JavaScript URLs as an equally important input. It reports metadata without recovering files. Speculative URL probes, browser automation, framework guesses, generated-byte coverage, and image export are deferred. See [ROADMAP.md](ROADMAP.md) for priorities and [EVALUATION.md](EVALUATION.md) for the production CLI rerun.

## Competitive landscape and product implications

Research date: 2026-10-10. This is a primary-source review, not hands-on benchmarking of competitors. Real-site availability must be evaluated separately; competitor capabilities do not establish demand or map prevalence.

## What already exists

| Tool | Established strength | Implication for sourcemapped |
| --- | --- | --- |
| [source-map-explorer](https://github.com/danvk/source-map-explorer) | Takes bundle files and their maps, attributes generated size to original files, renders a treemap, and exports JSON/TSV/HTML. Supports unmapped-byte reporting and Chrome execution-coverage input. | Bundle composition and size visualization are mature territory. Website discovery and a concise publication report are a more credible entry point than another treemap. |
| [denandz/sourcemapper](https://github.com/denandz/sourcemapper) | Reconstructs original source trees from local/remote maps or a JavaScript URL. Supports relative, absolute, and inline map references. | Recovering files is already easy. Metadata-only reporting should offer useful conclusions without writing original source contents. |
| [jonluca/source-map-cloner](https://github.com/jonluca/source-map-cloner) | A TypeScript CLI/library that starts at a website URL, discovers maps, recovers source trees, optionally crawls pages, and documents modern chunk discovery including Next.js Flight data. | **Website-level discovery is not a new capability.** The defensible distinction is a bounded, understandable diagnosis with evidence, not “give us a URL.” |
| [Evan Wallace's Source Map Visualization](https://github.com/evanw/source-map-visualization) ([app](https://evanw.github.io/source-map-visualization/)) | Visualizes JavaScript/CSS mappings for debugging generated maps; explicitly designed to handle large maps. | Mapping-level visual explanation already has a focused specialist. A compact website summary addresses a different unit of analysis. |
| [Chrome DevTools source maps](https://developer.chrome.com/docs/devtools/javascript/source-maps) and [Developer Resources](https://developer.chrome.com/docs/devtools/developer-resources) | Debug original code; inspect map load success/errors; attach maps manually; inspect resources in an actual browser session. | DevTools is the strongest substitute. The CLI must save repetitive inspection and provide portable evidence. Static HTML discovery cannot claim the browser's runtime completeness. |
| [Sentry's sourcemaps.io](https://github.com/getsentry/sourcemaps.io) | Starts with a generated JavaScript URL and checks map linkage, HTTP reachability, parsing, and line/column alignment. | Remote-map diagnostics are established too. Website aggregation and local-only operation are useful differences; a single-file URL validator alone is weak positioning. |
| [jkup/source-map-validator](https://github.com/jkup/source-map-validator) | Documents ECMA-426 format/mapping checks, generated-file bounds and coverage, original-source checks, and JSON output. | Deep validation would duplicate adjacent work. Reuse established parsing and state exactly which checks this MVP performs. |

“Source Map Explorer” commonly refers to danvk's tool above; it is not an additional distinct competitor in this assessment. [Sokra's visualization](https://sokra.github.io/source-map-visualization/) also exists, but the fetched page provided no readable documentation, so no detailed capability comparison is asserted.

## What to borrow from whoiz

[whoiz's README](https://github.com/jkup/whoiz) leads with a question and one command. Its tree suppresses repetitive results, emphasizes differences, exposes supporting evidence, and keeps unknown origins explicit. JSON and shareable images are alternate views of the investigation. For sourcemapped, the equivalent success is an understandable finding about a deployment, with no pressure to invent one when maps are absent.

Architecture was additionally inspected in the local sibling checkout (`../whoiz/src/cli.ts`, `scan.ts`, `render/layout.ts`; links to the corresponding [repository source](https://github.com/jkup/whoiz/tree/main/src)). The CLI invokes a scanner returning structured results; discovery, networking, scoring, and presentation are separate modules. A renderer-independent row layout feeds terminal and image output. Progress goes to stderr, preserving stdout for reports. Keep that separation, but avoid introducing image-layout machinery before useful findings justify it.

The useful transfer is information hierarchy: group the ordinary, explain the exceptional, retain inspectable evidence. A source tree containing hundreds of dependency paths is not automatically an interesting report.

## Is the gap real?

**A modest workflow gap is plausible; an underserved market is unproven.** The reviewed tools cover discovery, recovery, visualization, and validation. The remaining opportunity is combining a narrow subset into one polite command that answers: “What source-map information does this deployed page actually publish, and what can I reliably learn from it?”

That is useful for deployment verification and educational exploration. Its entertainment value depends heavily on public-map prevalence. If most runs return no references, attractive terminal output cannot rescue the original broad promise. Do not compensate with speculative framework guesses or broad path probing.

## Feature priorities inferred from this review

1. **Useful:** distinguish no reference, advertised-but-unavailable map, inaccessible script, invalid map, unsupported map, and successfully analyzed map. Retain URL, discovery method, status, and diagnostics.
2. **Useful:** count source entries and embedded content, summarize extensions, and show a short path sample. Counts need denominators and scope; repeated source paths across bundles are not necessarily unique project files.
3. **Useful:** bounded website discovery plus direct JavaScript input; JSON for reproducible comparisons; verbose output for auditing conclusions.
4. **Conditional:** package/build-tool hints backed by exact paths. A dependency path demonstrates that name in a map, not the site's complete framework, package version, or vulnerability status.
5. **Defer:** generated-code coverage until its UTF-16 positions, unmapped segments, line endings, and denominator are explicitly defined and tested. Percentage of bundles with maps is a different metric.
6. **Defer:** image export, exhaustive trees, runtime browser capture, recursive imports, and full conformance validation. These introduce maintenance costs before the central product risk is settled.

## Limits that should shape the product

These are design deductions from the workflows above, not measured prevalence claims:

- A static homepage is one document, not an inventory of every route, authenticated screen, worker, iframe, or lazy-loaded chunk.
- Missing public references do not establish that maps do not exist, and do not imply a broken deployment. A map may be kept private for error monitoring.
- Public maps may describe third-party analytics or widgets; reporting them as the application's original source would mislead users.
- Successful JSON parsing and mapping decoding do not prove semantic accuracy or that the map matches the deployed bundle.
- Source filenames and extensions can be synthetic, transformed, or incomplete. Treat them as map metadata.
- Maps can be much larger than their bundles. Byte, request, redirect, time, and decoding limits are part of correctness; limit-exceeded is not invalid-map.
- A URL CLI can encounter rate limits and bot challenges that a browser does not. Preserve those as observation failures, rather than converting them into “no maps.”

**Recommendation:** pursue a small deployment-inspection utility if real-site experiments produce useful examples, but reserve judgment on the “run it on any popular site” pitch. The product must earn its place through clarity and trust, not novel discovery technology.

---

## Bounded public-website experiment

Run date: **2026-10-10**. Machine-readable observations: [`research/baseline.json`](research/baseline.json). Reproduction harness: `node scripts/probe.mjs` (Node 22+; internet required). These observations describe one anonymous HTTP fetch of each homepage, not the whole application.

## Method

16 deliberately varied public sites: developer platforms, SaaS, documentation, news, and consumer websites. Fetch homepage HTML, resolve redirects and its base URL, collect unique `script src` and script/module preload URLs in document order. Inspect at most 12 assets per site. Prefer `SourceMap`/`X-SourceMap` headers, then sourceMappingURL candidates; otherwise try exactly one sibling `.map` URL. No route crawling, imports, interaction, authentication, original-source requests, secret searching, or recovered source storage.

Maximum 30 HTTP requests per site including redirects; two sites concurrently, requests sequential within each site; 10-second timeout per HTTP request; 2 MB HTML, 4 MB JavaScript, 10 MB maps. Stop a site on HTTP 429. The script identifies itself as `sourcemapped-research/0.1`. It stores URLs, HTTP statuses, errors, counts, extensions, and structural diagnostics only. The run used **273 requests**, plus **one targeted follow-up** to investigate an ambiguous comment candidate.

Baseline validation only checks version 3 and required JSON fields, not VLQ decoding, source-index bounds, or semantic mappings correctness. Therefore “map” below means **accessible, structurally plausible map**, not a fully validated map. Original-source counts are entries summed across maps, not unique files; duplicates may occur. “Embedded” includes empty strings, but excludes null and missing entries.

## Results

| Website | Category | HTML | Static JS references | Assets sampled | Maps | Source entries / embedded |
|---|---|---:|---:|---:|---:|---:|
| linear.app | Developer SaaS | 200 | 250 | 12 | 0 | — |
| sentry.io | Developer SaaS | 200 | 7 | 7 | 0 | — |
| vercel.com | Developer platform | 200 | 44 | 12 | 0 | — |
| github.com | Developer platform | 200 | 92 | 12 | 4 | 36 / 36 |
| vite.dev | Documentation | 200 | 7 | 7 | 0 | — |
| svelte.dev | Documentation | 200 | 24 | 12 | 0 | — |
| react.dev | Documentation | 200 | 11 | 11 | 0 | — |
| developer.mozilla.org | Documentation | 200 | 5 | 5 | 5 | 130 / 130 |
| www.notion.com | SaaS | 200 | 41 | 12 | 0 | — |
| www.figma.com | SaaS | 200 | 27 | 12 | 0 | — |
| www.wikipedia.org | Consumer | 200 | 2 | 2 | 0 | — |
| www.reddit.com | Consumer | 200 | 0 | 0 | 0 | — |
| www.nytimes.com | News | 403 | 0 | 0 | 0 | — |
| www.bbc.com | News | 200 | 60 | 12 | 0 | — |
| vuejs.org | Documentation | 200 | 12 | 12 | 0 | — |
| www.npmjs.com | Developer platform | 403 | 0 | 0 | 0 | — |

**2/16 tested homepages produced maps**; 2/14 among HTTP-200 homepages. Nine maps across 128 sampled assets (7.0%), with 166 embedded source entries. These are convenience-sample observations, not an estimate for the web. There were 582 HTML-discovered references, but only the first 128 across sites were inspected. Large sites are therefore heavily undersampled.

All nine successful maps were explicitly linked from their bundles. **Zero of 95 sibling `.map` guesses succeeded.** This supports omitting speculative probes from the default MVP: almost one third of this study's requests added no maps. The remaining 33 regex reference candidates included nine maps, 23 inaccessible responses, and one false positive described below. Missing a guessed URL does not mean the bundle lacks a map elsewhere; a missing linked map is a different and more actionable observation.

## What was interesting

- **GitHub:** the four successful maps represented 17 TypeScript entries, one JavaScript entry, and 18 extensionless entries. Every entry embedded content. These are concrete, explainable findings that source extensions support; the extensionless entries should not be relabeled as a programming language. The other eight sampled assets had no detected map reference, and sibling guesses returned 404. This does not establish that maps cannot be found elsewhere.
- **MDN:** all five discovered scripts had usable maps. Across them: 109 JavaScript entries, 15 extensionless entries, four CSS entries, one SVG, and one Fluent `.ftl` localization entry. A JavaScript source map can represent styles, images, localization, and runtime code. A source-extension inventory is richer and more honest than treating everything as application TypeScript.
- **Sentry:** all seven guessed sibling map URLs returned 404. A developer tool's marketing homepage does not predict its product application's map policy.
- **Vercel:** all 12 sampled bundles explicitly referenced map URLs that returned 403; “inaccessible” is accurate, “absent” is not.
- **Notion:** 11 sampled bundles explicitly referenced map URLs that returned 404. Distinguishing these advertised URLs from unsuccessful guesses makes the result actionable without claiming that maps must be public.
- **Reddit:** HTTP 200 but no static script references in the received body. This is a discovery limitation, not evidence that Reddit uses no JavaScript.
- **NYTimes and npm:** HTTP 403 at the homepage prevents a meaningful source-map conclusion. Do not present these as successful scans with zero maps.

## A useful prototype failure

The research harness used a broad regex to find map comments. A BBC bundle contained a CSS-loader JavaScript string that constructs a CSS `sourceMappingURL`. The regex treated that string literal as a real JavaScript comment and attempted to decode a fragment as an inline map. A targeted follow-up inspected the context and confirmed the false positive; it is marked `falsePositive: true` in the metadata. **This was not a broken map published by BBC.** The MVP must use a standards-aligned extraction algorithm and have a regression fixture for this case. The baseline harness intentionally remains a documented preliminary instrument, not the production parser.

## Product assessment

The broad pitch “discover what is behind any popular website” is weak on this sample. Most visits yielded little beyond asset counts and no discoverable maps. A screenshot-first product should not be built on the assumption that arbitrary domains reveal an attractive original source tree.

A focused diagnostic utility still looks useful: given a page or JavaScript URL, explain what was inspected, which maps were actually advertised, why each map is accessible or not, and what accessible maps reveal. An anonymous public-homepage scan is a convenient entry point; direct bundle URLs and deliberately published maps may be the stronger repeat-use cases. The promising differentiation is **website-first evidence with trustworthy limits**, not novel source-map parsing or source extraction.

Build the smallest tool, verify it against these observations, and seek usage from developers diagnosing their own deployments before investing in images, framework inference, or recursive discovery. No maps is a legitimate result, never automatically a misconfiguration. The original “another whoiz” hypothesis remains **unproven**.
