# Migration Notes

Packages extracted from [hooks](https://github.com/4meta5/hooks) into skillex.

## Package Map

| Package | Old Location | New Location |
|---------|-------------|-------------|
| @4meta5/chain | hooks/packages/chain | skillex/packages/chain |
| @4meta5/project-detector | hooks/packages/project-detector | skillex/packages/project-detector |
| @4meta5/semantic-matcher | hooks/packages/semantic-matcher | skillex/packages/semantic-matcher |
| @4meta5/skill-loader | hooks/packages/skill-loader | skillex/packages/skill-loader |
| @4meta5/skills | hooks/packages/skills | skillex/packages/skills |
| @4meta5/skills-cli | hooks/packages/cli | skillex/packages/skills-cli |
| @4meta5/workflow-enforcer | hooks/packages/workflow-enforcer | skillex/packages/workflow-enforcer |

## What Stays in Hooks

Hook runtime assets only:

| Asset | Purpose |
|-------|---------|
| `*.sh` scripts (root) | Hook shell scripts (chain-enforcement, setup-shims, etc.) |
| `shims/` | Shim scripts for skill CLI |

No TypeScript packages remain in hooks.

## API Changes

None. All moved packages keep the same public exports. Import paths (`@4meta5/skill-loader`, etc.) are unchanged.

## One Delta from Source

`@4meta5/semantic-matcher` added `@xenova/transformers` as a devDependency for type-checking. This was already installed at the hooks workspace root. The peer dependency contract is unchanged (optional at runtime).
