# RM-01: owner-provided exploratory scan, 2026-10-10

The user identified jonkuperman.com as their own site and chose: “Just explore first; I don't have a recurring need yet.” This is an authorized exploratory observation, not evidence of repeat use or a deployment decision improved.

## Capture and result

- Scanner revision: `ab63813bd6cf8773d232196021fe1634027ab685`; package version 0.1.0; Node 26.10.0.
- Captured at `2026-10-11T04:47:20.013Z` (October 10 in America/Los_Angeles).
- Built with `npm run build`, then ran `node dist/cli.js https://jonkuperman.com --json` with default budgets. Exit status 0. [Original metadata report](jonkuperman-2026-10-10.json).
- Three HTTP requests succeeded with status 200: homepage, Google analytics script and `/scripts/index.js`. Two external scripts discovered and inspected, zero skipped or failed, zero map references found. No scan limit was reached.
- Two inline scripts were counted but not inspected. Downloaded response bodies totaled 510,899 decoded bytes; this is not a browser transfer-size or performance measurement.
- Rendered the saved report in verbose mode without another network scan. It distinguishes no reference from unavailable/invalid maps and shows the scope caveat.

The supported finding is that neither inspected external script advertised a map through the scanner's supported headers/trailing annotations at capture time. It does not establish that no public maps exist elsewhere. No guessed map paths, other routes, imports, dynamic execution or original-source downloads were attempted; no source bodies were saved in the report.

## Product implication and next evidence

### Follow-up: daily.jonkuperman.com

At the user's request, scanned `https://daily.jonkuperman.com/` at `2026-10-11T04:49:40.102Z` (October 10 locally), using revision `3b63a012815128ff15515f459826ffedb7a7e31d`, Node 26.10.0 and unchanged default budgets. Rebuilt, then ran `node dist/cli.js https://daily.jonkuperman.com/ --json`; exit status 0. [Original metadata report](daily-jonkuperman-2026-10-10.json).

The homepage and both discovered external scripts returned HTTP 200. The external scripts were Google's analytics script and Cloudflare's analytics beacon; neither advertised a map. No first-party external JavaScript reference was discovered in this homepage response. One inline script was counted but not inspected. Zero assets failed or were skipped; no scan limit was reached. Total decoded response bytes: 532,873. Inspected verbose rendering of this same saved report without rescanning.

This is another no-reference observation within static scope, not proof of absent maps across the site or of how the site was built. The owner supplied another URL for exploration; no recurring need or deployment decision has yet been reported.

### Assessment

The CLI completed a bounded diagnostic successfully, but this site provided no map metadata to explore. The owner has not yet reported a recurring task or a decision enabled by the result. RM-01 remains needs-evidence; no grade, repeat-use claim or feature demand follows from this run.

Recommendation: retain the current narrow scope. If the owner later encounters a real debugging or publication question, use that question and an explicitly supplied deployment to test usefulness. Do not enable production maps, broaden discovery or build saved-report comparison merely to manufacture a richer demo. No reusable agent-guidance failure was observed, so AGENTS.md is unchanged.
