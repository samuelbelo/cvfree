# Contributing to cvfree

Thanks for helping. This page explains how the project works so your change lands without friction.

## Getting started

1. Fork and clone the repository.
2. `pnpm install`, then `pnpm dev`. Open http://localhost:3000.
3. You need Chrome, Chromium or Edge installed for the PDF export. Data is written to `./data`.

## Where to start

Small, self-contained changes are the easiest first contribution: a bug fix, a template tweak, a translation, a README correction. Pick an open issue, say you are taking it, and open the PR.

For anything bigger (a new section type, an importer, a change to the resume format, a new template family), open an issue first and describe what you want to build. A short conversation up front saves a PR that does not fit the direction.

## What we review

We review the change and the person behind it, not the tools that produced it. Before you open a PR:

- **You ran it.** Not "it should work": you started the app, did the thing, exported the file, and looked at the result. Say what you checked in the PR.
- **The scope is the issue.** No drive-by refactors in a bug fix.
- **It fits the product.** Private by default, no accounts, no paywall, works without AI.
- **You can explain it.** If a reviewer asks why it is built this way, you have an answer.

## Verification

cvfree has no unit test suite on purpose. Changes are verified against the running app: open the editor, click through what you changed, export the PDF and the DOCX and open them. CI runs lint, the type checker and a production build, and builds the Docker image.

## Commit messages

Releases are cut automatically from the commit messages with [semantic-release](https://semantic-release.gitbook.io/), so they follow [Conventional Commits](https://www.conventionalcommits.org/):

| Prefix | Effect |
| --- | --- |
| `feat: ...` | new minor version |
| `fix: ...` | new patch version |
| `perf: ...`, `docs: ...` | listed in the changelog, no release on their own |
| `chore: ...`, `refactor: ...`, `ci: ...` | not listed |
| `feat!: ...` or a `BREAKING CHANGE:` footer | new major version |

Write the subject in plain words, as a sentence without the final period: `fix: keep the footer text intact in the PDF`. The body, when there is one, says why.

## Pull requests

1. Branch from `main`.
2. Make the change and verify it in the app.
3. `pnpm lint` and `pnpm exec tsc --noEmit` pass.
4. Open the PR against `main`. Fill in the template: what, why, how you tested it.

A maintainer reviews it, usually within a few days. Squash merges keep one conventional commit per PR, so the PR title must follow the format above.

## Releases

Every push to `main` with a `feat` or `fix` commit becomes a release: version bump, `CHANGELOG.md` entry, git tag, GitHub release, and a Docker image at `ghcr.io/samuelbelo/cvfree` tagged with the version, the minor and `latest`. Nothing to do by hand.

## Code of conduct

Be kind and direct. See [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
