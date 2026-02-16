# Contributing

Thanks for your interest in contributing to Skillex.

## Ways to Contribute

1. **Report bugs**: Open an issue with reproduction steps
2. **Suggest features**: Open an issue describing the use case
3. **Improve docs**: Fix typos, clarify explanations, add examples
4. **Write code**: Fix bugs, implement features

## Development Setup

```bash
git clone https://github.com/4meta5/skillex.git
cd skillex

npm install
npm run build
npm test
```

## Project Structure

```
packages/
  project-detector/   # Tech stack detection (leaf, no internal deps)
  semantic-matcher/    # Query matching engine (leaf, no internal deps)
  skill-loader/        # SKILL.md parser (leaf, no internal deps)
  skills/              # Skill library (depends on skill-loader)
  skills-cli/          # CLI interface
  chain/               # Skill chaining system
  workflow-enforcer/   # State machine for workflow enforcement
```

## Code Style

- TypeScript strict mode
- Write tests first (TDD)
- Keep functions small and focused
- Use descriptive variable names

## Testing

```bash
# Unit tests
npm test

# Typecheck
npm run typecheck

# Work on a single package
npm run test -w packages/skill-loader
```

## Submitting Changes

1. Fork the repo
2. Create a branch (`git checkout -b fix/issue-123`)
3. Make your changes
4. Write tests for new functionality
5. Run `npm test` and `npm run typecheck`
6. Commit with a clear message
7. Push and open a PR

## Commit Messages

Keep them concise and descriptive:

```
fix: handle missing SKILL.md gracefully
feat: add embedding fallback to semantic-matcher
docs: clarify project-detector usage
test: add property tests for skill-loader
```

## Questions?

Open an issue or start a discussion. We're happy to help.
