# openwts — Agent Guide

## Release process

The agent handles releases. No CI involved.

### How to release

1. **Ensure `main` has everything** you want to ship (PR merged, tests green).
2. **Tell the agent** the version you want (patch/minor/major) — or just say "release" and the agent picks the next patch version.
3. **The agent will:**
   - Bump `version` in `package.json`
   - Update `CHANGELOG.md` with a clean summary of commits since the last tag
   - Commit and tag the release
   - Push to GitHub
   - Create a GitHub Release via `gh release create`
   - Publish to npm via `npm publish`

### Changelog format

Keep it simple — group commits under these sections (if there are commits for them):

```
### Features
### Bug Fixes
### Documentation
### Chore
```

Use commit messages as bullet points, link PRs with `[#N](url)`.

### Commit conventions

Use these for clean changelog entries:

```
feat: add <feature>              → "Features" section
fix: <description>               → "Bug Fixes" section
docs: <description>              → "Documentation" section
chore: <description>             → "Chore" section
```
