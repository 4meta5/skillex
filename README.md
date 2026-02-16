# Skillex

TypeScript libraries for working with Claude Code skills. Parsing, matching, detection, and management.

## Packages

| Package | Description | npm |
|---------|-------------|-----|
| [@4meta5/project-detector](./packages/project-detector) | Detect project tech stack (languages, frameworks, databases, testing, deployment) | [![npm](https://img.shields.io/npm/v/@4meta5/project-detector)](https://npmjs.com/package/@4meta5/project-detector) |
| [@4meta5/semantic-matcher](./packages/semantic-matcher) | Hybrid keyword + embedding matcher with RRF fusion scoring | [![npm](https://img.shields.io/npm/v/@4meta5/semantic-matcher)](https://npmjs.com/package/@4meta5/semantic-matcher) |
| [@4meta5/skill-loader](./packages/skill-loader) | Parse and load SKILL.md files | [![npm](https://img.shields.io/npm/v/@4meta5/skill-loader)](https://npmjs.com/package/@4meta5/skill-loader) |
| [@4meta5/skills](./packages/skills) | Skill library, templates, and project scaffolding | [![npm](https://img.shields.io/npm/v/@4meta5/skills)](https://npmjs.com/package/@4meta5/skills) |

## Quick Start

```bash
npm install
npm run build
npm test
```

Each package is independently usable:

```bash
npm install @4meta5/skill-loader
```

```typescript
import { loadSkillFromPath } from '@4meta5/skill-loader';

const skill = await loadSkillFromPath('.claude/skills/tdd');
```

## What Each Package Does

**skill-loader** reads SKILL.md files. It parses YAML frontmatter, discovers supporting files, and returns structured skill objects. No dependencies on other skillex packages.

**project-detector** analyzes a directory and returns what technologies it uses. Languages, frameworks, testing tools, databases, deployment targets. Reads config files (package.json, Cargo.toml, pyproject.toml, go.mod) and reports confidence levels.

**semantic-matcher** scores how well a query matches a set of candidates. Combines fast keyword matching with embedding similarity using Reciprocal Rank Fusion. Works without embeddings (keyword-only fallback) or with `@xenova/transformers` for full vector search.

**skills** is the high-level library. It loads skills from project and user directories, installs them, scaffolds new projects from templates, and manages CLAUDE.md references. Depends on skill-loader.

## Development

```bash
# Build all packages
npm run build

# Test all packages
npm run test

# Typecheck all packages
npm run typecheck

# Work on a single package
npm run build -w packages/skill-loader
npm run test -w packages/skill-loader
```

## Structure

```
packages/
  project-detector/   # Tech stack detection (leaf, no internal deps)
  semantic-matcher/   # Query matching engine (leaf, no internal deps)
  skill-loader/       # SKILL.md parser (leaf, no internal deps)
  skills/             # Skill library (depends on skill-loader)
```

## License

MIT
