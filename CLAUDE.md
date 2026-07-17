# openwts — Agent Guide

## Release process

Releases are fully automated via CI. The user only pushes a tag.

### How to release

1. **Ensure `main` has everything** you want to ship.
2. **Create and push a version tag:**

   ```bash
   git tag v0.3.0
   git push origin v0.3.0
   ```

3. **That's it.** The CI workflow (`.github/workflows/release.yml`) handles:
   - Running `git-cliff` to generate `CHANGELOG.md` from conventional commits
   - Committing `CHANGELOG.md` back to `main`
   - Creating a GitHub Release with the latest version's notes

### Commit conventions

The changelog auto-generates from conventional commit prefixes.
Use these formats for clean changelog sections:

```
feat: add <feature>              → "Features" section
feat(<scope>): <message>         → scoped features
fix: <description>               → "Bug Fixes" section
docs: <description>              → "Documentation" section
refactor: <description>          → "Refactor" section
perf: <description>              → "Performance" section
test: <description>              → "Testing" section
chore: <description>             → "Chore" section
chore(release): <version>        → skipped (auto-generated commits)
```

### What NOT to do

- Do NOT manually edit `CHANGELOG.md` — the CI overwrites it.
- Do NOT create GitHub Releases manually — the CI does it.
- Do NOT bump `version` in `package.json` manually — the tag IS the version.

### Configuration files

- `cliff.toml` — git-cliff configuration (commit parsers, grouping, formatting)
- `.github/workflows/release.yml` — the release CI workflow
