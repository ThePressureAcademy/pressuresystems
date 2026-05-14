# Repository Artefact Cleanup Report

Capture date: 2026-05-14

## Scope

This pass checked the repository after the PR #30 release boundary for accidental system, cache, temp, and local build artefacts. It was run from a clean worktree created from `origin/main` on `codex/repo-artifact-hygiene-cleanup`.

No product behaviour, backend logic, portal UI logic, public copy, research packs, sales assets, LinkedIn ad exports, demo content, samples, docs, schema, or migration files were changed.

## Inventory Commands

- `git ls-files` filtered for Windows/macOS system files, temp files, logs, cache folders, build/test outputs, and local env files.
- `git status --ignored --short`
- `git clean -ndX`
- `git clean -nd`

## Files Found

No tracked accidental system artefacts were found.

No ignored-file dry-run deletions were reported by `git clean -ndX`.

No untracked-file dry-run deletions were reported by `git clean -nd` in the cleanup worktree.

One tracked template matched the broad env search and was preserved:

- `backend/.env.example`

Reason preserved: this is an intentional example file, not a local secret file.

## Action Taken

Updated `.gitignore` so common local/system artefacts are ignored before they can be committed.

Added ignore coverage for:

- OS/system files: `.DS_Store`, `Thumbs.db`, `ehthumbs.db`, `desktop.ini`
- Logs: `*.log`, `npm-debug.log*`, `yarn-debug.log*`, `pnpm-debug.log*`
- Local env/secrets: `.env`, `.env.local`, `.env.*.local`
- Node dependencies: `node_modules/`
- Test/coverage outputs: `coverage/`, `.nyc_output/`, `test-results/`, `playwright-report/`, `.playwright/`
- Caches: `.cache/`, `.parcel-cache/`, `.eslintcache`
- Editor swap files: `*.swp`, `*.swo`, `*~`
- Local Vercel metadata: `.vercel/`

## Files Removed

None.

No tracked `desktop.ini`, `Thumbs.db`, `.DS_Store`, or equivalent artefacts were present on clean `origin/main`.

## Files Intentionally Preserved

The following areas were intentionally left untouched:

- `content/liftiq-demo/`
- `content/liftiq-linkedin-ads/`
- `sales/`
- `docs/`
- `research/`
- `backend/samples/`
- `backend/src/`
- `backend/tests/`
- public site files
- PR-generated business assets
- screenshot and export folders that are intentional deliverables

## Files Needing Human Review

None from this clean worktree inventory.

The primary local checkout still contains unrelated dirty files from earlier work. This PR does not assess or clean those local-only changes.

## Validation

Planned validation for this PR:

- `git status`
- `git diff --check`
- tracked system artefact scan
- ignored/untracked dry-run checks

Full backend tests are not required for this pass because it only changes `.gitignore` and this report.

## Known Limitations

- This does not clean Cody's dirty local checkout outside Git.
- This does not delete temporary external worktrees.
- This does not remove intentional generated assets.
- This does not alter product behaviour.
