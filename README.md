# jurietto.github.io

This repository hosts the data and workflow used to update `commits.json`. The workflow requires a personal access token to push changes back to the repository.

## Setup

1. Create a [GitHub Personal Access Token](https://github.com/settings/tokens) with repo permissions.
2. Add the token as a repository secret named `GH_PAT` (`Settings` -> `Secrets` -> `Actions`).
3. The `update-commits.yml` workflow will use this token to push updates to `commits.json`.

