# Test setup and coverage

Run `npm ci` once to install the committed dependencies. The test suite then requires no external network, credentials, environment files, or separately started services.

```sh
npm run check                   # typecheck, build once, run all tests
npm test                        # build once, run all tests
npm test -- test/cli.test.ts     # build once, run executable/package tests
```

`pretest` builds before Vitest, so executable tests cannot silently consume stale `dist/` through these commands. `check` calls `npm test` after typechecking and does not build again. For iteration after a successful build, `npx --no-install vitest run test/cli.test.ts` reuses that build; rebuild first if runtime source changed. Normal `npm pack` still builds through `prepack`. The package test uses `npm pack --ignore-scripts --offline` because the test command has already built the artifact.

## Environment

In addition to the [supported Node/npm setup](../README.md#try-it), executable tests need permission to spawn child processes, listen on an OS-assigned port at `127.0.0.1`, write temporary files, and create a directory symlink. They invoke `npm` and `tar` from PATH. These requirements match the macOS development environment and Ubuntu CI; Windows is not verified by this suite. A restricted sandbox may reject the listener with `listen EPERM`; allow loopback listening and rerun rather than skipping these tests. No fixed port, public website, browser, or downloaded fixture is used.

The suite closes its HTTP server and removes its temporary package/cache directory in teardown. Child processes have finite timeouts and bounded captured output. The fixture is served asynchronously so child fetches cannot deadlock the test process.

## Observable coverage and limits

[CLI tests](../test/cli.test.ts) execute `dist/cli.js` in a separate Node process. They cover help/version (including short aliases and package-version agreement), invalid flags/arity/schemes, JSON parsing and stdout/stderr separation, default and verbose reports, target HTTP failure exit status, successful completion despite an unavailable advertised map, and omission of synthetic generated/original content, symbol names, and inline payloads. The successful JSON scan checks the exact fixture requests to guard against fetching original source URLs. Assertions avoid timestamps, chosen ports, byte totals, and concurrent request ordering.

Subprocess streams are pipes: these tests cover machine-consumable output, not the interactive TTY progress/color branches. Pure renderer tests separately cover intentional color escapes and sanitization.

The package check packs without publishing, extracts the tarball into a temporary directory, reads its `bin.sourcemapped` declaration, checks the shebang, and executes that packaged entry point against the same local HTTP fixture. It links the checkout's installed `node_modules` into the extracted package, keeping project code isolated while remaining offline. This catches omitted compiled files and broken package entry-point paths/imports; it does **not** validate a clean registry dependency installation, npm-generated bin shims, or executable permissions. The historical manual installed-tarball smoke check remains separate evidence; release preparation must still verify installation.
