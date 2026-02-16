# PLAN.md

## One-Sentence Goal
Spin out skills packages that are not about hook installation or enforcement from `../hooks` into `skillex`, while keeping both repos stable and deferring publish/release until extraction and cleanup are complete in both places.

## Simplicity Principle (Hard Rule)
Move one capability at a time with explicit ownership and tests, not broad rewrites.

## Resolved Decisions
- `skillex` is the new home for skill-focused packages that do not enforce hooks.
- `hooks` remains focused on hook installation, hook execution, and enforcement flow.
- Publishing is deferred until both repos complete all non-publish tasks in this plan.
- Migration happens by extraction with compatibility shims only where required.
- New exploratory package ideas are tracked as issues first, not implemented inline during extraction.

## Roles and Contract

### Implementer
- Makes code and docs changes in the active phase only.
- Keeps writes inside `skillex` unless a later phase explicitly touches `../hooks`.

### Reviewer
- Verifies phase acceptance criteria with commands and artifacts.
- Rejects scope creep that mixes extraction with unrelated architecture work.

### Human Approver
- Approves phase transitions.
- Approves when to begin `../hooks` edits in later phases.
- Approves release timing after both repos are ready.

## Repository Invariants
- Until Phase 3 starts, all writes stay in `/Users/amar/agi/skillex`.
- Any moved package keeps behavior parity before interface changes.
- Every extracted package keeps or gains tests in its new location.
- `PLAN.md` in this repo is the source of truth for this spinout.

## Phase Plan

## Phase 0: Tooling + Skill Activation Baseline

### Tasks
- Install hooks from `../hooks` into `skillex`:
  - `setup-shims`
  - `skill-forced-eval`
  - `semantic-router`
  - `usage-tracker`
- Install relevant skills from `../skills` into `skillex`:
  - `rick-rubin`
  - `tdd`
  - `code-review-ts`
  - `refactor-suggestions`
  - `repo-hygiene`
  - `dogfood`
  - `fresh-eyes`
  - `paul-graham`
- Ensure dual runtime references are aligned by setting `AGENTS.md` to mirror `CLAUDE.md`.

### Acceptance Criteria
- `.claude/hooks/*` contains all four requested hooks.
- `.claude/skills/*` contains all eight requested skills.
- `CLAUDE.md` references all eight installed skills.
- `AGENTS.md` mirrors `CLAUDE.md` (symlink or exact equivalent).

### Verification Evidence
- `node ../hooks/packages/cli/bin/skills.js hook add setup-shims skill-forced-eval semantic-router usage-tracker -C /Users/amar/agi/skillex` succeeded.
- `node ../hooks/packages/cli/bin/skills.js add rick-rubin tdd code-review-ts refactor-suggestions repo-hygiene dogfood fresh-eyes paul-graham -C /Users/amar/agi/skillex` succeeded.
- `node ../hooks/packages/cli/bin/skills.js claudemd sync -C /Users/amar/agi/skillex` reported in-sync state.
- `ls -l /Users/amar/agi/skillex/AGENTS.md` confirms `AGENTS.md -> CLAUDE.md`.
- `rg -n "@\\.claude/skills/.*/SKILL\\.md" /Users/amar/agi/skillex/CLAUDE.md` confirms all requested skill references.

## Phase 1: Scope Carving and Extraction Map

### Tasks
- Inventory `../hooks/packages/*` and classify each package as:
  - stays in `hooks` (installation/enforcement/runtime hook behavior), or
  - candidate for `skillex` (skill catalog, skill tooling, non-enforcement utilities).
- Define target package layout in `skillex` and migration order.
- Define interface contracts that must stay compatible during migration.
- Identify any cross-package dependencies that need temporary adapters.

### Acceptance Criteria
- Written extraction matrix exists in `skillex` docs.
- Each package in `../hooks/packages` has a disposition: `stay`, `move`, or `split`.
- A dependency risk list exists with mitigation notes.

## Phase 2: Issue Backlog for New Skillex Packages

### Tasks
- Create issue: `skill-repl`.
- Create issue: `skill-search` for external skill search (explicitly not `skill-cli list/scan`).
- Create issue: `skill-sota` for storing skill SOTA conventions and suggesting merge/split/update opportunities.
- Capture clear non-goals and success criteria for each issue.

### Acceptance Criteria
- Three issues exist with scope, non-goals, and acceptance criteria.
- Each issue links back to this plan.

## Phase 3: Extraction Execution (Skillex-First, Hooks-Later)

### Tasks
- Move selected non-enforcement packages into `skillex` in small batches.
- Keep package APIs stable or provide explicit compatibility adapters.
- Port tests and CI wiring needed for moved packages.
- Update local docs in `skillex` to reflect new package ownership.
- Only after `skillex` side is stable, update `../hooks` to remove moved code and point to `skillex` where needed.

### Acceptance Criteria
- Moved packages build and pass tests in `skillex`.
- `../hooks` builds after cleanup and no longer owns moved package internals.
- Ownership boundaries are documented in both repos.

## Phase 4: Hooks Repo Follow-Up Issues (Post-Extraction)

### Tasks
- Create issue in `hooks`: explore/extending leaner hooks repo with plugins, including criteria for when to prefer hooks vs plugins.
- Create issue in `hooks`: explore optimal enforcement architecture for PI agent extensions.
- Create issue in `hooks`: explore optimal layering of hooks and/or plugins.
- Create issue in `hooks`: remove usage tracker hook and extract tracking into `skillex` tools for global skill and enforcement metrics interoperability.

### Acceptance Criteria
- Four hooks follow-up issues exist with concrete investigation questions.
- Usage-tracker extraction issue defines migration path and backward-compat requirements.

## Phase 5: Docs + Cross-Repo Reference Updates

### Tasks
- Update `hooks` README to reference `skillex` for extracted package ownership.
- Update `skills` README to reference `skillex` and adjust hooks-related claims.
- Add migration notes describing where each moved capability now lives.

### Acceptance Criteria
- Both READMEs contain consistent ownership references.
- Migration notes map old package paths to new package paths.

## Phase 6: Deferred Publish and Release (Only After Phases 1-5 Complete in Both Repos)

### Tasks
- Open source and publish packages from the new `skillex` repo.
- Cut release with changelog in `skillex`.
- Publish updated `hooks` packages after extraction.
- Cut release with changelog in `hooks`.

### Acceptance Criteria
- Both repos have complete changelog entries tied to extraction commits.
- Published artifacts and README references are consistent across repos.
- No publish step begins before all prior phases are complete.

## Deferred Constraint
- Publishing, tagging, and release work is explicitly blocked until both `skillex` and `hooks` finish all non-publish tasks in this plan.

## Phase Status Ledger

| Phase | Status | Notes |
| --- | --- | --- |
| 0 Tooling + Skill Activation Baseline | Completed | Verified with install + sync commands and reference checks; ready to start Phase 1 |
| 1 Scope Carving and Extraction Map | Pending | - |
| 2 Issue Backlog for New Skillex Packages | Pending | - |
| 3 Extraction Execution | Pending | - |
| 4 Hooks Repo Follow-Up Issues | Pending | - |
| 5 Docs + Cross-Repo References | Pending | - |
| 6 Deferred Publish and Release | Pending | Blocked by phases 1-5 |

## Operational Loop
1. Approve next phase.
2. Implement only that phase.
3. Verify acceptance criteria with evidence.
4. Update ledger status and notes.
5. Queue out-of-scope ideas into backlog issues.

## Definition of Done
- Non-enforcement skill packages are owned by `skillex`.
- `hooks` is lean and focused on installation/enforcement behavior.
- New package ideas are tracked with clear issues and boundaries.
- Docs in both repos reflect the new split.
- Release and publish happen only after extraction and cleanup are complete.
