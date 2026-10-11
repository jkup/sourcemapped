# Roadmap

## First release

`@jkup/sourcemapped@0.1.0` is available on [npm](https://www.npmjs.com/package/@jkup/sourcemapped).

- [x] Simplify repository documentation.
- [x] Set package identity and verify a clean installation.
- [x] Add a logo and concise README with usage examples.
- [x] Publish, test the registry package, and tag the release.

## Next

- Collect feedback from people checking their own deployments. Prioritize concrete problems over adding more scan modes.
- Investigate unsupported maps when someone supplies a reproducible example.
- Consider local bundle/map inputs or saved-report comparison when there is a clear workflow for them.

The tool will remain a bounded CLI for advertised source-map metadata. Browser execution, crawling, guessed map URLs, and source export are outside the current scope.

See [technical decisions](docs/decisions/README.md) for design context and [research](research/README.md) for early experiments. Older task logs remain in Git history.
