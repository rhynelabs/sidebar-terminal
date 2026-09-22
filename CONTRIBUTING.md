# Contributing

Bug reports and pull requests are welcome.

## Report a bug

Open a GitHub issue with your operating system, Obsidian version, plugin version and the steps needed to reproduce the problem. Include your shell and Python version for terminal startup issues. Remove private paths, credentials and note contents from logs and screenshots.

## Make a change

Follow the [development guide](docs/development.md) to build and install a local copy. Keep changes focused and authored source files under 300 lines.

Before opening a pull request, run:

```sh
npm test
npm run format:check
npm run build
npm run check:release
```

Describe the behavior being changed and how you verified it. For terminal or layout changes, test in Obsidian and name the platforms you checked. Do not remove capability disclosures or hide shell, filesystem or clipboard access to change a review score.

Contributions are licensed under the project's [MIT License](LICENSE). Preserve dependency license notices.
