# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please report it privately.

**Do not open a public issue.**

Use [GitHub Security Advisories](https://github.com/4meta5/skillex/security/advisories/new) to report vulnerabilities.

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes

## Response Timeline

- **Acknowledgment**: Within 48 hours
- **Initial assessment**: Within 1 week
- **Resolution**: Depends on severity, typically 2-4 weeks

## Scope

This policy covers:

- All packages in the skillex monorepo
- The skills-cli package
- Bundled skills and templates
- Documentation that could lead to insecure usage

## Out of Scope

- Third-party dependencies (report to their maintainers)
- Community-contributed skills not in this repo
- Issues requiring physical access to a machine

## Security Considerations

This project:

- Reads and writes files to `.claude/skills/` directories
- Parses SKILL.md files (plain Markdown, not executable code)
- Does not transmit telemetry or user data

Skills are Markdown files containing instructions for Claude. They are not executable. However, malicious skills could attempt to manipulate Claude's behavior in unintended ways. Review skill content from untrusted sources before use.
