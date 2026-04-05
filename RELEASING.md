# Releasing

This project uses a minimal GitHub Releases workflow:

1. You create and publish a GitHub Release in the web UI.
2. GitHub Actions builds the Windows installer.
3. The workflow uploads the installer and related files back to that release.

This keeps the repo history clean and avoids committing installer files into the source tree.

## Before You Release

The repository automatically bumps the patch version on pushes to `main` when a commit did not already change the version number.

1. Make sure the app version has been bumped in `package.json`.
2. Make sure the bundled binaries are present in `bin/` and tracked through Git LFS.
3. Push `main` to GitHub.
4. Run the local checks you care about:

   - `npm test`
   - `npm run smoke`
   - `npm run smoke:clip` (optional, slower, network-dependent)

## Publish A Release Without Command Line

1. Open the repository on GitHub.
2. Open the `Releases` page.
3. Choose `Draft a new release`.
4. Create a new tag in the format `vX.Y.Z`.

Example: `v0.1.1`

The release tag must match `package.json` exactly after removing the leading `v`.

Example: `v0.1.6` must match `"version": "0.1.6"`

1. Target the `main` branch.
2. Use the same version for the release title.

Example: `v0.1.1`

1. Add release notes if you want.
2. Publish the release.

After publication, the `Release Installer` GitHub Actions workflow will:

1. Check out the repo with Git LFS objects.
2. Fail immediately if the release tag does not match `package.json`.
3. Install dependencies.
4. Run `npm test`.
5. Run `npm run dist -- --publish never` on Windows.
6. Upload the generated installer assets to the release.

The workflow intentionally disables `electron-builder` publishing in CI because release asset upload is handled by the separate GitHub Release action step.

## What To Download Or Share

End users should download the installer from GitHub Releases, not from the source repository.

The main file to share is the setup `.exe` generated in the release assets.

## If The Workflow Fails

1. Open the `Actions` tab on GitHub.
2. Open the failed `Release Installer` run.
3. Read the failing step.
4. Fix the issue on `main`.
5. Re-run the workflow or publish a fresh release tag if needed.

## Notes

- Do not commit the built installer into the repo.
- The `release/` folder is a build output, not a source artifact.
- The release assets are the right place for installers and future auto-update files.
- Automatic version bumping on `main` only works if GitHub Actions is allowed to push back to the repository.
