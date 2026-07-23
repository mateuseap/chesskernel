# Contributing to ChessKernel

Thank you for considering a contribution!

## Getting Started

1. Fork the repository.
2. Follow the [Development Setup](./docs/deployment/setup.md#development-setup) guide.
3. Read the [Git Workflow](./docs/development/git-workflow.md) before opening a PR.

## What to Work On

- Check open [GitHub Issues](https://github.com/mateuseap/chesskernel/issues).
- Feature requests are welcome: open an issue to discuss before implementing.
- Bug reports: please include steps to reproduce, expected vs. actual behaviour, and browser/OS.

## Code Style

- TypeScript strict mode, no `any` unless absolutely necessary.
- No `console.log` in production paths.
- Keep files under 800 lines; prefer many focused modules.
- No mutation: use spread / immutable patterns.
- Conventional Commits format for all commit messages.

## Pull Request Process

1. Branch from `develop` (`feature/*` or `fix/*`).
2. Run `pnpm tsc --noEmit` and `pnpm build` before pushing.
3. Open a PR targeting `develop`.
4. Fill in the PR template (Summary + Test plan).
5. At least one maintainer review required before merge.

## Reporting Security Issues

Do **not** open a public issue for security vulnerabilities. Email `mateuseap@mateuseap.com` with details.

## License

By contributing, you agree your contributions are licensed under the [MIT License](./LICENSE).
