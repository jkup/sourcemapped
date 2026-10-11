# Continuous integration

[The workflow](../.github/workflows/ci.yml) runs on pushes and pull requests with GitHub-hosted Ubuntu runners. Each Node matrix entry installs the committed lockfile with `npm ci`, then runs `npm run check` (source/test typechecking, one build, then offline Vitest tests). It does not invoke either research script or scan public websites. Installation still requires network access to download dependencies and actions. The CLI tests require loopback listening, subprocesses, temporary-directory writes, npm, and tar; see [test setup](testing.md).

The workflow grants only `contents: read`, does not persist checkout credentials, and requires no configured secrets. Package-manager caching is disabled to keep this small workflow simple. Both matrix jobs can finish even when one fails; each has a ten-minute timeout.

Version selection verified on **2026-10-10**:

- The [Node release table](https://nodejs.org/en/about/previous-releases) lists 22 and 24 as supported LTS lines, 20 as EOL, and 26 as Current. Both selected majors satisfy the package's Node engine requirement. Revisit the matrix when Node enters or leaves LTS; major selectors allow compatible patch updates.
- Official releases are [checkout v7.0.1](https://github.com/actions/checkout/releases/tag/v7.0.1) and [setup-node v7.1.0](https://github.com/actions/setup-node/releases/tag/v7.1.0). The workflow uses these explicit release tags. Their [checkout](https://raw.githubusercontent.com/actions/checkout/v7.0.1/action.yml) and [setup-node](https://raw.githubusercontent.com/actions/setup-node/v7.1.0/action.yml) manifests use the Node 24 action runtime, independently of the project's test matrix. Recheck release notes and runtime compatibility when updating the actions.

Local checks cannot establish a GitHub Actions pass. When reporting CI results, link to the actual run and identify the tested commit.
