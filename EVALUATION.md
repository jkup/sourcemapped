# MVP evaluation

Evaluated **2026-10-10** using the built TypeScript scanner on the same 16 homepages as the preliminary study. Reproduce with `npm run build && node scripts/evaluate.mjs`. Full structured evidence lives in [`research/mvp.json`](research/mvp.json); no original source content is persisted.

The evaluation uses the production scanner with its defaults: 24 inspected script/preload references per page, 60 HTTP requests maximum per scan including redirects, three concurrent requests per scan, eight-second HTTP timeout, 8 MiB per response, and 64 MiB total response bytes. The evaluation harness runs at most two sites concurrently. It does not guess sibling `.map` URLs. This differs from the baseline's 12 assets and optional guessing, so bundle-level percentages are not a controlled before/after performance comparison.

“Checked” means a map passed the MVP's implemented structural, VLQ framing, decoded segment, index, and position checks. It does not certify complete ECMA-426 conformance or correct execution-time debugging. Source entries are summed per bundle/map and are not globally unique source files.

## Observations

| Homepage | Discovered | Inspected | Checked maps | Unavailable advertised maps | Source entries / embedded | Outcome |
|---|---:|---:|---:|---:|---:|---|
| linear.app | 250 | 24 | 0 | 0 | — | No reference in sample |
| sentry.io | 7 | 7 | 0 | 0 | — | No reference |
| vercel.com | 44 | 24 | 0 | 24 | — | Linked maps returned 403 |
| github.com | 92 | 24 | 16 | 0 | 160 / 160 | Useful original-source metadata |
| vite.dev | 7 | 7 | 0 | 0 | — | No reference |
| svelte.dev | 24 | 24 | 0 | 0 | — | No reference |
| react.dev | 11 | 11 | 0 | 0 | — | No reference |
| developer.mozilla.org | 5 | 5 | 5 | 0 | 130 / 130 | Every discovered asset mapped |
| www.notion.com | 41 | 24 | 0 | 23 | — | Linked maps returned 404 |
| www.figma.com | 27 | 24 | 0 | 0 | — | No reference in sample |
| www.wikipedia.org | 2 | 2 | 0 | 0 | — | No reference |
| www.reddit.com | 0 | 0 | 0 | 0 | — | HTTP 200, no static references |
| www.nytimes.com | 0 | 0 | 0 | 0 | — | Homepage HTTP 403 |
| www.bbc.com | 61 | 24 | 0 | 0 | — | No reference in sample |
| vuejs.org | 12 | 12 | 0 | 0 | — | No reference |
| www.npmjs.com | 0 | 0 | 0 | 0 | — | Homepage HTTP 403 |

Totals: **298 HTTP requests; 583 static references, 212 inspected, 371 skipped by asset limits; 21 checked maps; 47 inaccessible advertised maps; 144 assets with no detected map reference.** Downloads totaled 19,786,268 bytes (about 18.9 MiB). No script-fetch failures, invalid maps, unsupported maps, or map-size limits occurred in this run. Two homepage failures are distinct from those script-level results.

The positive-site rate remains **2/16**, or 2/14 HTTP-200 homepages. About **9.9% of inspected bundles** had checked maps. Neither rate estimates prevalence on the whole web: this is a small selected homepage sample, assets are truncated in document order, and dynamic imports and other routes are not inspected.

## What the added analysis actually reveals

GitHub's larger sample grew from four structurally plausible maps to 16 checked maps, representing 160 source entries: 64 JavaScript, 62 TypeScript, 11 TSX, five CSS, and 18 Other. Source-path evidence identifies packages such as `@github/catalyst`, `@github/relative-time-element`, and `@primer/behaviors`. These are observed path tokens, not proof of exact versions or a site-wide technology inventory.

MDN's five maps contain 130 entries: 109 JavaScript, four CSS, and 17 Other. Source-path evidence includes `@fluent/bundle`, `@mozilla/glean`, `lit-html`, and `lit-element`. Every GitHub and MDN source entry in this scan embeds content: **290/290** in total. The CLI can report that without saving or displaying the code.

The BBC false positive from the preliminary regex harness disappears with the production extractor: no purported invalid inline map. This is a concrete accuracy improvement, not an improved map on BBC's side. BBC's discovered count changed from 60 to 61 between requests; live HTML is not a stable fixture.

Vercel and Notion are informative despite unavailable maps: **advertised but inaccessible** is distinct from **no reference found**. This distinction is particularly useful for a developer checking a deployment. It does not imply that keeping maps private is wrong.

## Product questions

1. **Is the output interesting?** Yes on MDN and GitHub; usually modest elsewhere. Most sites provide asset inventory, a bounded scope statement, and no original-source inventory.
2. **Does it reveal otherwise difficult information?** It saves repetitive DevTools and network inspection across bundles. It does not unlock new information or replace a debugger.
3. **Is it useful without maps?** Sometimes: advertised 403/404 map URLs and exact scope are useful diagnostics. A bare no-reference result has limited repeat value.
4. **Are conclusions trustworthy?** They are grounded in request evidence and defined metrics. Static-only discovery, truncation, path-based inference, and partial validation must remain visible. Live HTTP outcomes can vary by region, time, or automation defenses.
5. **Is it meaningfully different?** The cohesive URL-to-report workflow and precise evidence are the distinction. Competitors already handle extraction, bundle treemaps, and debugging well.
6. **Would someone share a screenshot?** The positive examples are plausible screenshot material. This study is not user research and cannot demonstrate demand or sharing behavior. Do not build image export on that assumption.
7. **Can one person maintain it?** The current bounded scanner, standard parser dependencies, JSON schema, and terminal output are a reasonable scope. Browser automation, recursive imports, complete semantic validation, and visual dashboards would substantially increase it.

## Recommendation

Continue as a small deployment-inspection utility and validate it with developers checking their own published assets. Use MDN as the positive demo, Vercel/Notion as explicit-link diagnostics, and Linear as an honest limited scan. Prioritize regression fixtures, direct-JavaScript workflows, stable JSON evidence, and clear distinctions between unavailable, invalid, unsupported, and uninspected data.

Defer images, framework badges, recursive crawling, and broad claims about recovering a website's source tree. The experiment justifies a useful MVP; it does **not** establish another broadly compelling `whoiz` yet.

## Final engineering verification

- `npm run check`: strict source/test TypeScript checks, **80 passing Vitest tests**, and a successful build.
- `npm pack`: a 16.7 kB package containing compiled code, declarations, README, license, and package metadata; no research observations or recovered sources in the package.
- Installed that tarball into an isolated temporary directory and exercised its executable against a synthetic localhost HTTP fixture: homepage discovery, JavaScript and map fetching, `--json`, `--verbose`, metadata-only output, help/version, invalid flags, and target-failure exit codes all passed.
- A final live `node dist/cli.js developer.mozilla.org` run again reported 5/5 analyzed maps and 130/130 embedded source entries. No original source text was written to disk.

The committed full-site snapshot precedes the final additive `extensions` metadata field and small HTTP/inline-decoding fixes. Those changes have regression tests; the aggregate study counts and its conclusions are unchanged. This is a point-in-time observation, not a golden fixture for today's web.

The package has not been published and no remote commits were pushed.
