import { parse as parseYaml } from 'yaml';
import { SKILL_CATEGORIES, type SkillMetadata, type ParsedFrontmatter, type SkillCategory } from './types.js';

/**
 * Type guard to check if a value is a valid SkillCategory
 */
export function isValidCategory(value: unknown): value is SkillCategory {
  return typeof value === 'string' && SKILL_CATEGORIES.includes(value as SkillCategory);
}

/**
 * Validate parsed YAML frontmatter and return typed SkillMetadata
 * @throws Error if validation fails
 */
function validateFrontmatter(parsed: unknown): SkillMetadata {
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid SKILL.md: frontmatter must be an object');
  }

  const obj = parsed as Record<string, unknown>;

  // Validate required fields
  if (obj.name === undefined || obj.name === null) {
    throw new Error('Invalid SKILL.md: missing required "name" field');
  }
  if (typeof obj.name !== 'string') {
    throw new Error('Invalid SKILL.md: "name" field must be a string');
  }

  if (obj.description === undefined || obj.description === null) {
    throw new Error('Invalid SKILL.md: missing required "description" field');
  }
  if (typeof obj.description !== 'string') {
    throw new Error('Invalid SKILL.md: "description" field must be a string');
  }

  // Drop unknown categories silently (older skills may use legacy values)

  // Build validated metadata object
  const metadata: SkillMetadata = {
    name: obj.name,
    description: obj.description,
  };

  // Add optional fields if they exist and are valid
  if (obj.category !== undefined && isValidCategory(obj.category)) {
    metadata.category = obj.category as SkillCategory;
  }
  if (typeof obj['disable-model-invocation'] === 'boolean') {
    metadata['disable-model-invocation'] = obj['disable-model-invocation'];
  }
  if (typeof obj['user-invocable'] === 'boolean') {
    metadata['user-invocable'] = obj['user-invocable'];
  }
  if (typeof obj['allowed-tools'] === 'string') {
    metadata['allowed-tools'] = obj['allowed-tools'];
  }
  if (obj.context === 'fork' || obj.context === 'inline') {
    metadata.context = obj.context;
  }
  if (typeof obj.agent === 'string') {
    metadata.agent = obj.agent;
  }
  if (typeof obj.tools === 'string') {
    metadata.tools = obj.tools;
  }
  if (obj.extensions !== undefined) {
    if (typeof obj.extensions !== 'string') {
      throw new Error('Invalid SKILL.md: "extensions" field must be a comma-separated string');
    }
    metadata.extensions = obj.extensions;
  }

  return metadata;
}

function stripOptionalQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('\'') && trimmed.endsWith('\''))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

/**
 * Recover essential frontmatter fields from imperfect YAML.
 * Some SKILL.md files use unquoted colons in description values.
 */
function parseFrontmatterLoosely(rawFrontmatter: string): Record<string, unknown> {
  const lines = rawFrontmatter.split(/\r?\n/);
  const frontmatter: Record<string, unknown> = {};

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const fieldMatch = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!fieldMatch) {
      continue;
    }

    const key = fieldMatch[1];
    const rawValue = fieldMatch[2];

    if (key === 'description' && !frontmatter.description) {
      const descriptionLines: string[] = [];

      if (rawValue.trim().length > 0 && rawValue.trim() !== '|') {
        descriptionLines.push(rawValue.trim());
      }

      let stopAt = i + 1;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (/^[a-zA-Z0-9_-]+:\s*/.test(next)) {
          stopAt = j;
          break;
        }
        if (next.trim().length > 0) {
          descriptionLines.push(next.trim());
        }
        stopAt = j + 1;
      }

      frontmatter.description = descriptionLines.join(' ').trim();
      i = stopAt - 1;
      continue;
    }

    if (!frontmatter[key]) {
      const normalized = stripOptionalQuotes(rawValue);
      if (normalized === 'true') {
        frontmatter[key] = true;
      } else if (normalized === 'false') {
        frontmatter[key] = false;
      } else {
        frontmatter[key] = normalized;
      }
    }
  }

  return frontmatter;
}

/**
 * Parse YAML frontmatter from SKILL.md content
 *
 * @param content - Raw SKILL.md file content
 * @returns Parsed frontmatter metadata and body content
 * @throws Error if frontmatter format is invalid or required fields are missing
 *
 * @example
 * ```typescript
 * const result = parseFrontmatter(`---
 * name: my-skill
 * description: A helpful skill
 * ---
 *
 * # My Skill
 *
 * Instructions here.
 * `);
 *
 * console.log(result.frontmatter.name); // 'my-skill'
 * console.log(result.body); // '# My Skill\n\nInstructions here.'
 * ```
 */
export function parseFrontmatter(content: string): ParsedFrontmatter {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    throw new Error('Invalid SKILL.md format: missing frontmatter delimiters');
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(match[1]);
  } catch {
    parsed = parseFrontmatterLoosely(match[1]);
  }
  const frontmatter = validateFrontmatter(parsed);

  return {
    frontmatter,
    body: match[2].trim()
  };
}

/**
 * Format a skill back to SKILL.md content
 *
 * @param metadata - Skill metadata for frontmatter
 * @param body - Body content of the skill
 * @returns Formatted SKILL.md content string
 *
 * @example
 * ```typescript
 * const content = formatSkillMd(
 *   { name: 'my-skill', description: 'A skill' },
 *   '# Instructions'
 * );
 * ```
 */
export function formatSkillMd(
  metadata: SkillMetadata,
  body: string
): string {
  const frontmatterLines = ['---'];

  for (const [key, value] of Object.entries(metadata)) {
    if (value !== undefined) {
      frontmatterLines.push(`${key}: ${value}`);
    }
  }

  frontmatterLines.push('---');

  return `${frontmatterLines.join('\n')}\n\n${body}`;
}
