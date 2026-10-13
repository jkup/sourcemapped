# Local source-map demo

From the repository root, after `npm ci`:

```sh
npm run demo
```

This builds the scanner and bundles a tiny TypeScript counter with esbuild in two modes, starts a server on an OS-assigned `127.0.0.1` port, scans the mixed page using the real CLI, prints one compact report, and closes the server. No public website or external service is involved. Build artifacts are generated in memory and never committed.

| Page | Build | Expected report |
| --- | --- | --- |
| `/mapped/` | Minified bundle with a linked map and embedded source | 1 analyzed map, 2 TypeScript source entries, 2 embedded sources |
| `/unmapped/` | Same app with source maps disabled | 1 inspected asset, no map reference |
| `/mixed/` | Mapped app plus an unmapped extra script | 2 inspected assets, maps analyzed for 1, 1 with no reference |
| `/validation/` | Two valid mapped bundles and one deliberately corrupted map | 3 retrieved maps, 2 checked, 1 invalid; 3 source entries from the good maps |

To keep the server open and try the counter in a browser:

```sh
npm run --silent demo -- --serve
```

The `--silent` npm option hides npm command banners, not build errors. Use `npm run --silent demo -- --all` to print all four reports, or combine `--all --serve`.

Open the printed `/mixed/` URL and use the navigation to switch scenarios. Clicking the button increments the counter. You can also pass any scenario URL to `node dist/cli.js <url> --json` in another terminal. Ctrl+C stops the server. The port changes between runs; no fixed-port service, hosting or deployment is required.

The [source](src/app.ts) and [formatting module](src/format.ts) are shared by both builds. A mixed page combines the mapped build with an additional unmapped script. [Build/server configuration](fixture.mjs) serves only the generated pages, bundles and map; it does not expose arbitrary local files. The original-source sentinel comment deliberately appears in the map so tests can detect accidental source export.

## Validation demo

Start with `npm run --silent demo -- --all` to see the good and bad results together. For the exact validation diagnostic, start the server with `--serve`, then use its printed port:

```sh
node dist/cli.js http://127.0.0.1:<port>/validation/ --verbose
```

The validation page has the mapped counter, a separately bundled formatting module, and a copy of that module whose map has an out-of-range source index. The bad map is valid JSON with valid VLQ framing, so it reaches maplint's mapping validator. Its rejection must not prevent the two good maps from contributing metadata. No original source files are fetched.

## Regression coverage

```sh
npm test -- test/demo.test.ts
```

The [integration tests](../../test/demo.test.ts) independently establish that esbuild's map embeds the source, then run the built CLI through HTTP. They check analyzed metadata, nonzero mappings, the no-map counterexample, JSON source-text omission and exact requests (no original-source fetching or map guessing). All four scenarios run in ordinary `npm run check` and CI. The demo source and tooling are also typechecked. Installation needs registry access; subsequent builds/tests are local.

This is a reproducible example of bundler compatibility and a contributor demo. It does not establish full source-map conformance, browser debugging correctness or product demand. See [ADR 0006](../../docs/decisions/0006-local-bundler-demo.md).

Initial verification (2026-10-10): `npm run check` passed all 139 tests on Node 26.10.0, including both fresh esbuild 0.28.2 builds. `npm run demo` printed the expected reports and exited. In serve mode, both pages loaded and their counters incremented from 0 to 1; Ctrl+C shut down cleanly. No production scanner changes were needed.
