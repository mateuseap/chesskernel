# Git Workflow

ChessKernel follows a simplified **Gitflow** adapted for a small team.

## Branch Model

```
main ──────────────────────────────────────────── production releases
  ↑ PR + tag on release
develop ───────────────────────────────────────── integration / staging
  ↑ PRs from feature / fix / chore branches
feature/xyz ──────────────── short-lived work branches
fix/issue-description
chore/description
```

### Branch rules

| Branch | Purpose | Merge strategy | Protected |
|--------|---------|----------------|-----------|
| `main` | Production. Every commit is a tagged release. | Squash or merge commit from `develop` PR | Yes |
| `develop` | Integration branch. Always deployable. | Merge commit from feature/fix branches | Yes |
| `feature/*` | New features. Branch from `develop`. | Squash merge into `develop` | No |
| `fix/*` | Bug fixes. Branch from `develop`. | Squash merge into `develop` | No |
| `chore/*` | Deps, CI, tooling. Branch from `develop`. | Squash merge into `develop` | No |
| `hotfix/*` | Critical production bugs. Branch from `main`. | Merge into `main` **and** `develop` | No |

## Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer: Closes #123]
```

**Types:**

| Type | When to use |
|------|-------------|
| `feat` | New user-facing feature |
| `fix` | Bug fix |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |
| `test` | Adding or fixing tests |
| `docs` | Documentation only |
| `chore` | Build system, deps, CI |
| `ci` | CI/CD pipeline changes |

**Examples:**

```
feat(game): support castling via king-to-rook drag

fix(analysis): eval bar height tracks board via CSS Grid instead of ResizeObserver

docs: add git workflow, API contracts, deployment guide

chore(deps): bump chess.js to 1.4.0
```

## Day-to-Day Workflow

```bash
# 1. Start from an up-to-date develop
git checkout develop && git pull origin develop

# 2. Create your branch
git checkout -b feature/spectator-chat

# 3. Commit as you go
git add <files>
git commit -m "feat(chat): add spectator message input"

# 4. Keep in sync with develop (rebase is preferred)
git fetch origin
git rebase origin/develop

# 5. Push and open a PR → develop
git push -u origin feature/spectator-chat
# Open PR on GitHub: feature/spectator-chat → develop
```

## Pull Request Checklist

Before requesting review:

- [ ] `pnpm tsc --noEmit` passes (no TypeScript errors)
- [ ] `pnpm build` succeeds
- [ ] No secrets or `.env` files committed
- [ ] Commit messages follow Conventional Commits
- [ ] PR title summarises what changed (≤70 chars)
- [ ] PR description includes **Summary** and **Test plan**

## Release Process

1. Ensure `develop` is stable and CI is green.
2. Open a PR: `develop → main` titled `release: vX.Y.Z`.
3. PR body: summary of all changes since last release (use `git log main..develop --oneline`).
4. Merge the PR (merge commit — preserves history).
5. Tag the merge commit on `main`:

```bash
git checkout main && git pull
git tag -a v0.2.0 -m "release: v0.2.0"
git push origin v0.2.0
```

6. Create a GitHub Release from the tag — paste the changelog.

### Versioning (Semantic Versioning)

| Increment | When |
|-----------|------|
| MAJOR (1.0.0) | Breaking changes to the public API or data schema migration requiring manual intervention |
| MINOR (0.X.0) | New backward-compatible features |
| PATCH (0.0.X) | Bug fixes, performance improvements |

## Hotfix Process

For critical bugs that need to ship before the next `develop` cycle:

```bash
git checkout main && git pull
git checkout -b hotfix/fix-token-expiry

# fix the bug …

git commit -m "fix(auth): refresh token expiry comparison was using local time"
git push -u origin hotfix/fix-token-expiry

# PR 1: hotfix/fix-token-expiry → main  (merge + tag patch release)
# PR 2: hotfix/fix-token-expiry → develop  (keep develop in sync)
```

## GitHub Branch Protection (recommended settings)

### `main`
- Require PR before merging
- Require at least 1 approval
- Require status checks: `build`, `typecheck`
- Require linear history: off (allow merge commits for release traceability)
- Do not allow force pushes

### `develop`
- Require PR before merging
- Require status checks: `build`, `typecheck`
- Allow force pushes: off
