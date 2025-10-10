# Versioning Incident Report - nexlog

**Date:** 2025-10-10
**Severity:** HIGH
**Status:** IDENTIFIED - REMEDIATION IN PROGRESS

---

## Executive Summary

A critical versioning error occurred in nexlog's release history where version 4.x.x was completely skipped, jumping directly from `3.1.0` to `5.0.0`. This incident was caused by improper handling of changesets and manual version bumps, likely involving AI-assisted development.

## Timeline of Events

### August 27, 2025 - The Initial Error

**23:20 UTC+2** - Commit `b5058c1`
- **Action:** Manual creation of v4.0.0
- **File:** `package.json` set to `"version": "4.0.0"`
- **Changeset:** Created `major-rewrite-v4.md` describing v4.0.0 features
- **Problem:** This commit was never properly released

**21:32 UTC+0** - Commit `12c5c7c`
- **Action:** Changesets automation triggered
- **Expected:** Release v4.0.0 to npm
- **Actual:** Released v5.0.0 to npm
- **Root Cause:** Changesets calculated next major version from npm's `3.1.0`, ignoring the manual `4.0.0` in the previous commit

### September 1-2, 2025 - Continued Development

- `v5.1.0` released (Sept 1)
- `v5.2.0` released (Sept 1)
- `v5.2.1` released (Sept 2)

### October 10, 2025 - Git History Rewrite

**14:56-15:04 UTC+2** - Claude Code attribution cleanup
- **Action:** Rebased commits to remove Claude attribution
- **Side Effect:** Git commit hashes changed
- **Impact:** Git tags now point to non-existent commits in main branch

**15:04 UTC+2** - Current v5.2.2 Release Attempt
- **Status:** FAILED - CI tests failing
- **Blocker:** Lint errors preventing publication
- **npm:** v5.2.2 not published
- **GitHub Release:** v5.2.2 not created

---

## Impact Assessment

### npm Registry

```
Published Versions:
✅ 2.2.1, 2.2.2, 2.2.3
✅ 3.0.0, 3.0.1, 3.1.0
❌ 4.0.0 (MISSING - never published)
❌ 4.x.x (ENTIRE MINOR VERSION RANGE MISSING)
✅ 5.0.0, 5.1.0, 5.2.0, 5.2.1
⏳ 5.2.2 (pending - CI blocked)
```

### Git Repository

```
Tags Status:
✅ v3.1.0 → commit e813467 (correct)
❌ v5.2.1 → commit 442bcc2 (points to backup-before-cleanup branch)
⚠️  v5.2.0 → Draft release (not finalized)
```

### CHANGELOG.md

```
Contains entries for BOTH v4.0.0 and v5.0.0:
- v5.0.0: "Complete rewrite and modernization of nexlog v4.0.0" ← mentions v4
- v4.0.0: Full feature list (but never released)
```

---

## Root Cause Analysis

### Primary Cause: Manual Version Bump + Automated Changesets Conflict

1. **Human/AI Error:** Commit `b5058c1` manually set `package.json` to `4.0.0`
2. **Automation Failure:** Changesets ignored the manual version, calculated from npm's last version (`3.1.0`)
3. **Semver Math:** `3.1.0` + major bump = `4.0.0` expected, but got `5.0.0`
4. **Likely Cause:** Double major bump or changesets misconfiguration

### Contributing Factors

- **AI-Assisted Development:** Patterns suggest AI (possibly Claude) managed releases without proper validation
- **Lack of CI Checks:** No validation to catch version number inconsistencies
- **Manual Intervention:** Mixed manual and automated version management

---

## Remediation Plan

### Phase 1: Immediate Fixes (In Progress)

- [ ] Fix CI lint errors preventing v5.2.2 publication
- [ ] Ensure v5.2.2 publishes successfully to npm via CI/CD
- [ ] Create proper GitHub Release for v5.2.2

### Phase 2: Git History Cleanup

- [ ] Move v5.2.1 tag from `442bcc2` to correct commit `de6a604`
- [ ] Finalize v5.2.0 Draft release
- [ ] Verify all tags point to commits in main branch

### Phase 3: Documentation & Prevention

- [ ] Document version 4.x.x skip in CHANGELOG
- [ ] Add prominent notice in README about version history
- [ ] Implement CI check to prevent version number gaps
- [ ] Add pre-commit hooks for version validation

### Phase 4: Communication (Optional)

- [ ] GitHub Discussion explaining the version skip
- [ ] Update npm package description to note version history
- [ ] Consider whether to publish retroactive v4.x.x (NOT RECOMMENDED)

---

## Technical Decisions

### Decision 1: Do NOT Retroactively Publish v4.x.x

**Rationale:**
- v5.x.x has been live for 40+ days
- Users expect v5.x.x to be current
- Retroactive publishing would confuse semver expectations
- npm doesn't allow unpublishing after 72 hours

**Action:** Document the skip, move forward with v5.x.x

### Decision 2: Keep CHANGELOG History

**Rationale:**
- Transparency about what happened
- Historical record of intended v4.0.0 features
- Helps users understand version jump

**Action:** Add explanatory note in CHANGELOG

### Decision 3: Forward-Only Git History

**Rationale:**
- Rewriting published history is dangerous
- Tags can be moved safely
- Focus on fixing future releases

**Action:** Clean up tags, document incident, improve processes

---

## Prevention Measures

### Automated Checks (To Implement)

```yaml
# .github/workflows/version-check.yml
name: Version Validation
on: [pull_request]
jobs:
  check-version:
    runs-on: ubuntu-latest
    steps:
      - name: Validate version sequence
        run: |
          # Compare package.json version with npm
          # Ensure no gaps in semver sequence
          # Fail if major version jumps more than 1
```

### Manual Process Updates

1. **Never manually edit** `package.json` version
2. **Always use** `changeset add` for version bumps
3. **Always verify** `changeset version` output before committing
4. **Always check** npm registry before publishing

### AI Development Guidelines

1. **Validate versions** against npm before any release
2. **Double-check** changesets configuration
3. **Never skip** pre-publish validation steps
4. **Document decisions** in commit messages

---

## Current Status

**Last Updated:** 2025-10-10 15:13 UTC+2

- ✅ Incident identified and documented
- ✅ Root cause determined
- ⏳ v5.2.2 publication blocked by CI (lint errors)
- ⏳ Git tag cleanup pending
- ⏳ Prevention measures pending implementation

---

## Lessons Learned

1. **Automation + Manual Intervention = Chaos:** Pick one approach and stick to it
2. **Trust but Verify:** Even with AI assistance, validate everything
3. **Semver is Sacred:** Version numbers have meaning, gaps confuse users
4. **CI is Critical:** Automated checks could have caught this early
5. **Documentation Matters:** Transparent incident reports build trust

---

## References

- Affected Commits: `b5058c1`, `12c5c7c`, `eeccfa0`
- Changesets Documentation: https://github.com/changesets/changesets
- Semver Specification: https://semver.org/
