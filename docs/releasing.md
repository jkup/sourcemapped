# Releasing

The package is `@jkup/sourcemapped`; the executable is `sourcemapped`. Public visibility and the npm registry are set in `package.json`.

1. Update the version and lockfile when needed. Run `npm run check`.
2. Run `npm pack --dry-run` and review the file list. Only compiled code, package metadata, README and license belong in the tarball.
3. Run `npm pack`, then `node scripts/verify-install.mjs ./jkup-sourcemapped-VERSION.tgz`. This installs from a fresh cache/prefix and checks the command against local demo fixtures; registry access is required for dependencies.
4. Commit and push. Verify CI for that commit on both supported Node versions.
5. With publication authorized, run `npm publish --access public`. Complete npm's authentication challenge if requested.
6. Run `node scripts/verify-install.mjs @jkup/sourcemapped@VERSION` against the registry package.
7. Tag the verified release `vVERSION`, push the tag, and create a short GitHub release.

Do not reuse an already published version. Keep credentials out of Git and release notes. The demo and research files stay in the repository, not in the npm package.
