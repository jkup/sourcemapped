# ADR 0006: Commit a local real-bundler demo

- Status: Accepted
- Date: 2026-10-10
- Related work: RM-13

## Context and decision

Owner-supplied sites did not advertise maps within static scope. Existing synthetic fixtures exercise edge cases but do not demonstrate current bundler output. The user requested a committed, repeatable demo.

Use esbuild as a development-only dependency to bundle a two-module TypeScript counter. Generate linked source maps with embedded content and a separate no-map build. The [esbuild source-map API](https://esbuild.github.io/api/#sourcemap) distinguishes linked maps, which advertise their location, from external maps without that annotation; this demo deliberately uses linked maps.

Commit source, HTML and configuration under `examples/demo/`. Build artifacts stay in memory. A small server exposes explicit routes only on an ephemeral loopback port. The demo command scans both pages with the built CLI and exits, with an opt-in serve mode for browser use. Tests share the build/server setup, independently inspect generated input and verify CLI reports and exact HTTP requests. Runtime dependencies and production discovery policy stay unchanged.

## Alternatives, consequences and limits

Public sites are unstable test fixtures. Hand-authored maps remain valuable for edge cases but cannot substitute for a bundler integration. A framework starter, hosted deployment or committed generated bundle would add maintenance without helping this bounded test.

esbuild adds a development dependency with platform-specific binaries; the lockfile and Node 22/24 CI cover installation and integration. Output bytes and mapping counts may change with upgrades; tests check semantic outcomes rather than snapshots. This is neither a conformance suite nor demand validation. Revisit the single-bundler scope only when a concrete compatibility case warrants it.
