# Releasing Sidebar Terminal

Publisher and copyright holder: **Rhynelabs**. Plugin ID: **sidebar-terminal**. License: **MIT**.

## Current status

The source is published at [rhynelabs/sidebar-terminal](https://github.com/rhynelabs/sidebar-terminal). The [Community listing](https://community.obsidian.md/plugins/sidebar-terminal) was published on 22 September 2026 under Rhynelabs. Direct installation is enabled. Version 0.1.2 removes the CSS lint findings and optional ZIP, and adds verified GitHub artifact attestations. Its automated review completed on 22 September 2026 with **Health: Excellent** and **Review: Satisfactory**. All five checks passed: attestations for JavaScript and CSS, network and dependency checks, and byte-for-byte JavaScript build reproduction. The only remaining findings are two capability warnings for shell execution and filesystem access, plus a recommendation for user-initiated clipboard access. These capabilities remain disclosed; both ratings are not Excellent. Malware and obfuscation scans were unavailable and are not claimed as passed. The release workflow and the latest branch checks pass on all three platforms. See GitHub Releases for available builds.

macOS has been exercised live. Before the first stable release, complete the Linux and Windows checks below and record their results. A successful local build does not guarantee acceptance by Obsidian's review.

## Verify the release

```sh
npm ci
npm test
npm run format:check
npm run build
npm run check:release
```

- Run the CI matrix on macOS, Ubuntu and Windows in the publisher's repository.
- Test a standard installation containing **only** `main.js`, `manifest.json` and `styles.css`.
- On each supported OS, start the default shell, resize nested splits, paste Unicode and multiline text, and verify terminal shortcuts.
- Start a command preset and interrupt it; the configured shell must remain usable.
- Close a tab containing a foreground job and background child processes; verify they have ended.
- Verify theme switching, a narrow settings window, preset add/edit/remove, optional executable paths and saved-layout restoration.
- Confirm the plugin name and ID are still available in the Community directory.
- Review README disclosures for system access and external CLI tools.

## Publish on GitHub

1. Use the publisher repository `rhynelabs/sidebar-terminal` and keep repository and author URLs current.
2. Set the same semantic version in `manifest.json` and `package.json`, update `package-lock.json` and `versions.json`, and update `CHANGELOG.md`.
3. Commit the reviewed source and tag it with the exact version, such as `0.1.0`, **without** a `v` prefix.
4. Push the source and tag. The release workflow runs the platform checks and creates a **draft** GitHub release with the three required assets, signed build-provenance attestations and formatted release notes.
5. Inspect the draft and publish it after the checklist is complete.

The Python transport and license notices are embedded into `main.js`; font data and license notices are embedded into `styles.css`. Users need an installed Python runtime, plus pywinpty on Windows. The plugin never downloads or installs those dependencies.

## Submit to Obsidian

Use the current [Community directory submission guide](https://docs.obsidian.md/plugins/releasing/submit-plugin). Sign in with the publisher's Obsidian account, link the correct GitHub account, and add the repository to the directory. The manifest must be committed on the default branch and its version must have a published GitHub release.

The directory runs its own review. Address any findings in source and release a new version. Do not advertise the plugin as available through Obsidian until review has completed and installation is enabled.

## Reference

- [Manifest naming and fields](https://docs.obsidian.md/Reference/Manifest)
- [Submission requirements](https://docs.obsidian.md/community-directory/submission-requirements-for-plugins)
- [Developer policies and disclosures](https://docs.obsidian.md/community-directory/developer-policies)

Requirements last checked: 22 September 2026.
