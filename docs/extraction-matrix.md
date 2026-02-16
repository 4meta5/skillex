# Extraction Matrix

Source of truth for the hooks-to-skillex package migration. Produced in Phase 1. No code moves until Phase 3.

## Package Dispositions

| Package | Disposition | Rationale |
|---------|------------|-----------|
| `@4meta5/skill-loader` | **MOVE** | Pure SKILL.md parser. No enforcement. Leaf dependency (only `yaml`). |
| `@4meta5/project-detector` | **MOVE** | Pure tech stack detection. No enforcement. Leaf dependency. |
| `@4meta5/semantic-matcher` | **MOVE** | Pure search/matching utility. No enforcement. Leaf dependency. |
| `@4meta5/workflow-enforcer` | **MOVE** | State machine for TDD/review gates. Moves to skillex with other packages. |
| `@4meta5/chain` | **MOVE** | Declarative skill chaining. Moves to skillex with other packages. |
| `@4meta5/skills` | **MOVE** | Core skill library. Not enforcement. Depends on `skill-loader` (also moves). |
| `@4meta5/skills-cli` | **MOVE** | Full CLI package moves to skillex. hooks owns hook assets/runtime only. |

## CLI Module Dispositions

The entire `@4meta5/skills-cli` package moves to `skillex/packages/skills-cli`. All modules move together. No split ownership.

## Migration Order

```
Step 1: skill-loader        (leaf, no @4meta5 deps)
Step 2: project-detector    (leaf, parallel with step 1)
Step 3: semantic-matcher    (leaf, parallel with steps 1-2)
Step 4: skills              (depends on skill-loader from step 1)
Step 5: skills-cli           (full CLI package, depends on all above)
Step 6: chain                (depends on nothing within skillex)
Step 7: workflow-enforcer    (depends on nothing within skillex)
```

Steps 1-3 are independent and can execute in parallel. Step 4 depends on step 1. Steps 5-7 can execute in parallel after steps 1-4.

## Extraction Unit Rule (SOTA Convention)

Move unit = module + all direct dependencies + tests.

No partial module moves are allowed in Phase 3.

## Target Layout in Skillex

```
skillex/
  packages/
    skill-loader/
    project-detector/
    semantic-matcher/
    skills/
    skills-cli/
    chain/
    workflow-enforcer/
  docs/
    extraction-matrix.md
    migration-notes.md
  package.json            # workspace root
  PLAN.md
  CLAUDE.md
  AGENTS.md
```

## Interface Contracts (Must Preserve)

### `@4meta5/skill-loader` public API

Functions:
- `loadSkillFromPath`
- `loadSkillsFromDirectory`
- `parseFrontmatter`
- `discoverSupportingFiles`
- `isSkillDirectory`
- `formatSkillMd`
- `isValidCategory`

Types:
- `Skill`
- `SkillMetadata`
- `SkillCategory`
- `ParsedFrontmatter`
- `LoadOptions`

Constants:
- `SKILL_CATEGORIES`

### `@4meta5/skills` public API

Functions:
- `createSkillsLibrary`
- Re-exports from `skill-loader`
- Category exports
- Template exports

Types:
- `Skill`
- `SkillMetadata`
- `SkillCategory`
- `ProjectTemplate`
- `FileStructure`
- `InstallOptions`
- `SkillsLibraryOptions`
- `SkillsLibrary`
- `ParsedFrontmatter`

### `@4meta5/project-detector` and `@4meta5/semantic-matcher`

Preserve current published APIs as-is during extraction.

## API Contract Protection (Phase 3 Hard Rule)

- No public export changes for moved packages during Phase 3.
- If a compatibility adapter is needed, add adapter files instead of changing exported names/signatures.
- Defer export redesign to post-extraction follow-up issues.

## Verification Gate Per Extraction Step

Each extraction step must pass all three gates before moving on:
1. Build
2. Tests
3. Import smoke check for moved package entrypoints

## Dependency Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| CLI loses workspace resolution for moved packages | MEDIUM | Use `file:` protocol during dev. Published versions at release. |
| `skills` re-exports from `skill-loader` break if versions drift | LOW | Both in same skillex workspace. Lock versions together. |
| Matcher extraction fails due to hidden `detector/*` coupling | MEDIUM | Move matcher as a full extraction unit including required detector helpers/types. |
| CLAUDE.md extraction fails because markdown helpers are left behind | MEDIUM | Move `claudemd.ts` with `shared/markdown.ts` as one unit. |
| CLI `detector/` duplicates `project-detector` | LOW | Not blocking. Reconcile after extraction stabilization. |
| npm `repository` fields point to old repo | LOW | Update in Phase 5/6. Not blocking. |
