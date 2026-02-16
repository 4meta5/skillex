import { readdir, readFile, stat } from 'fs/promises';
import { join, basename, isAbsolute } from 'path';
import { parseFrontmatter, isValidCategory, type SkillMetadata } from '@4meta5/skill-loader';
import { parse as parseYaml } from 'yaml';

/**
 * Slop detection patterns
 *
 * Note: These patterns are designed to catch actual slop, not documentation
 * about slop patterns. Patterns that appear in table cells or code blocks
 * explaining what slop looks like should not trigger false positives.
 */
const SLOP_PATTERNS = {
  // Content that indicates the skill is auto-generated test data
  content: [
    /^NEW content with improvements!$/m,
    /^# Test Skill\s*$/m, // Exact match for placeholder heading
  ],
  // Naming patterns that indicate auto-generated skills
  // Tests MUST use test-skill-* pattern - no bypassing allowed
  naming: [
    /^test-skill-[a-z0-9]+$/i,
  ],
  // Placeholder patterns that indicate incomplete content
  // Only match when at the start of a line (not in tables/examples)
  placeholder: [
    /^Lorem ipsum dolor sit amet/im, // Full phrase only
    /^TODO: Add content here/im,
    /^\[Insert .* here\]$/im,
  ]
};

/**
 * Minimum description length for semantic matching to work well
 */
const MIN_DESCRIPTION_LENGTH = 50;

/**
 * Keywords that indicate good trigger conditions in descriptions
 */
const TRIGGER_KEYWORDS = [
  'Use when',
  'use when',
  'Use for',
  'use for',
  'When',
  'Triggers',
  'Invoke when',
  'Apply when',
  'Helps with',
];

export interface QualityMetrics {
  descriptionScore: number;
  hasTriggerConditions: boolean;
  hasSpecificContext: boolean;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  quality?: QualityMetrics;
  skillName?: string;
  path?: string;
}

export interface ValidateCommandResult {
  total: number;
  valid: number;
  invalid: number;
  skills: Record<string, ValidationResult>;
}

interface ValidateOptions {
  cwd?: string;
  path?: string;
  json?: boolean;
}


async function validateAgentMetadata(skillPath: string, skillName: string): Promise<{ errors: string[]; warnings: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const agentMetadataPath = join(skillPath, 'agents', 'openai.yaml');

  try {
    await stat(agentMetadataPath);
  } catch {
    return { errors, warnings };
  }

  let content = '';
  try {
    content = await readFile(agentMetadataPath, 'utf-8');
  } catch (error) {
    errors.push(`Failed to read agents/openai.yaml: ${error}`);
    return { errors, warnings };
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    errors.push(`Invalid agents/openai.yaml: YAML parse error (${error})`);
    return { errors, warnings };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    errors.push('Invalid agents/openai.yaml: top-level object is required');
    return { errors, warnings };
  }

  const obj = parsed as Record<string, unknown>;
  const iface = obj.interface;
  if (!iface || typeof iface !== 'object' || Array.isArray(iface)) {
    errors.push('Invalid agents/openai.yaml: interface object is required');
    return { errors, warnings };
  }

  const interfaceObj = iface as Record<string, unknown>;

  if (interfaceObj.display_name !== undefined && typeof interfaceObj.display_name !== 'string') {
    errors.push('Invalid agents/openai.yaml: interface.display_name must be a string');
  }

  if (interfaceObj.short_description !== undefined) {
    if (typeof interfaceObj.short_description !== 'string') {
      errors.push('Invalid agents/openai.yaml: interface.short_description must be a string');
    } else if (interfaceObj.short_description.length < 25 || interfaceObj.short_description.length > 64) {
      warnings.push('agents/openai.yaml: interface.short_description should be 25-64 chars for UI quality');
    }
  }

  if (interfaceObj.default_prompt !== undefined) {
    if (typeof interfaceObj.default_prompt !== 'string') {
      errors.push('Invalid agents/openai.yaml: interface.default_prompt must be a string');
    } else if (!interfaceObj.default_prompt.includes(`$${skillName}`)) {
      errors.push(`Invalid agents/openai.yaml: interface.default_prompt must mention $${skillName}`);
    }
  } else {
    warnings.push('agents/openai.yaml: missing interface.default_prompt');
  }

  return { errors, warnings };
}

/**
 * Validate a single skill directory
 */
export async function validateSkill(skillPath: string): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const skillName = basename(skillPath);

  // Check for slop naming pattern
  for (const pattern of SLOP_PATTERNS.naming) {
    if (pattern.test(skillName)) {
      errors.push(`Skill name "${skillName}" matches slop pattern (test-skill-*). This appears to be auto-generated test data.`);
    }
  }

  // Check if SKILL.md exists
  const skillMdPath = join(skillPath, 'SKILL.md');
  let skillMdExists = false;
  try {
    const stats = await stat(skillMdPath);
    skillMdExists = stats.isFile();
  } catch {
    skillMdExists = false;
  }

  if (!skillMdExists) {
    errors.push('SKILL.md not found');
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Read and parse SKILL.md
  let content: string;
  try {
    content = await readFile(skillMdPath, 'utf-8');
  } catch (error) {
    errors.push(`Failed to read SKILL.md: ${error}`);
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Check for slop content patterns
  for (const pattern of SLOP_PATTERNS.content) {
    if (pattern.test(content)) {
      errors.push(`Content contains slop/placeholder pattern: "${pattern.source}"`);
    }
  }

  for (const pattern of SLOP_PATTERNS.placeholder) {
    if (pattern.test(content)) {
      errors.push(`Content contains placeholder pattern: "${pattern.source}"`);
    }
  }

  // Parse and validate frontmatter using canonical parser from skill-loader
  let metadata: SkillMetadata;
  let body: string;
  try {
    const parsed = parseFrontmatter(content);
    metadata = parsed.frontmatter;
    body = parsed.body;
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      valid: false,
      errors,
      warnings,
      skillName,
      path: skillPath
    };
  }

  // Check for unknown category in the raw content
  const categoryMatch = content.match(/^category:\s*(.+)$/m);
  if (categoryMatch) {
    const rawCategory = categoryMatch[1].trim();
    if (!isValidCategory(rawCategory)) {
      warnings.push(`Unknown category "${rawCategory}". Valid categories: meta, audit, principles, habits, hot.`);
    }
  }

  // Quality checks for description
  const description = metadata.description;
  let descriptionScore = 0;
  let hasTriggerConditions = false;
  let hasSpecificContext = false;

  if (description) {
    // Check description length
    if (description.length < MIN_DESCRIPTION_LENGTH) {
      warnings.push(`Description is too short (${description.length} chars). Recommend at least ${MIN_DESCRIPTION_LENGTH} chars for good semantic matching.`);
      descriptionScore = description.length / MIN_DESCRIPTION_LENGTH;
    } else {
      descriptionScore = 0.5; // Base score for meeting minimum length
    }

    // Check for trigger conditions
    hasTriggerConditions = TRIGGER_KEYWORDS.some(keyword => description.includes(keyword));
    if (!hasTriggerConditions) {
      warnings.push('Description lacks trigger conditions. Add phrases like "Use when..." to help with skill discovery.');
    } else {
      descriptionScore += 0.25;
    }

    // Check for specific context markers (error messages, file types, etc.)
    hasSpecificContext = /["'].*["']/.test(description) || // Quoted strings (error messages)
      /\.(ts|js|py|rs|go|md|json)\b/.test(description) || // File extensions
      /\([1-3]\)/.test(description) || // Numbered lists
      /\berror\b/i.test(description); // Error mentions

    if (hasSpecificContext) {
      descriptionScore += 0.25;
    }
  }

  const agentMetadataValidation = await validateAgentMetadata(skillPath, skillName);
  errors.push(...agentMetadataValidation.errors);
  warnings.push(...agentMetadataValidation.warnings);

  // Check for referenced files that don't exist
  const referenceMatches = body.match(/\[.*?\]\(references\/.*?\)/g);
  if (referenceMatches && referenceMatches.length > 0) {
    const referencesDir = join(skillPath, 'references');
    try {
      await stat(referencesDir);
    } catch {
      errors.push('SKILL.md references files in references/ directory but the directory does not exist');
    }
  }

  const valid = errors.length === 0;

  return {
    valid,
    errors,
    warnings,
    quality: {
      descriptionScore: Math.min(1, descriptionScore),
      hasTriggerConditions,
      hasSpecificContext
    },
    skillName,
    path: skillPath
  };
}

/**
 * Validate command - validates all skills or a specific skill in a project
 */
export async function validateCommand(options: ValidateOptions = {}): Promise<ValidateCommandResult> {
  const cwd = options.cwd || process.cwd();
  const skillsDir = join(cwd, '.claude', 'skills');
  const isAbsolutePath = options.path ? isAbsolute(options.path) : false;

  const results: ValidateCommandResult = {
    total: 0,
    valid: 0,
    invalid: 0,
    skills: {}
  };

  // Check if skills directory exists (only when needed)
  if (!isAbsolutePath) {
    try {
      await stat(skillsDir);
    } catch {
      // No skills directory
      if (!options.json) {
        console.log('No .claude/skills directory found.');
      }
      return results;
    }
  }

  // Get list of skills to validate
  let skillDirs: string[];

  if (options.path) {
    // Validate specific skill
    const specificPath = isAbsolute(options.path)
      ? options.path
      : join(skillsDir, options.path);
    try {
      await stat(specificPath);
      skillDirs = [specificPath];
    } catch {
      if (!options.json) {
        console.error(`Skill not found: ${options.path}`);
      }
      return results;
    }
  } else {
    // Validate all skills
    try {
      const entries = await readdir(skillsDir, { withFileTypes: true });
      skillDirs = entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name);
    } catch {
      return results;
    }
  }

  // Validate each skill
  for (const skillDir of skillDirs) {
    const skillPath = isAbsolute(skillDir) ? skillDir : join(skillsDir, skillDir);
    const skillName = isAbsolute(skillDir) ? basename(skillDir) : skillDir;
    const result = await validateSkill(skillPath);

    results.total++;
    results.skills[skillName] = result;

    if (result.valid) {
      results.valid++;
    } else {
      results.invalid++;
    }

    // Output results if not JSON mode
    if (!options.json) {
      if (result.valid) {
        if (result.warnings.length > 0) {
          console.log(`! ${skillName}`);
          for (const warning of result.warnings) {
            console.log(`  - ${warning}`);
          }
        } else {
          console.log(`+ ${skillName}`);
        }
      } else {
        console.log(`x ${skillName}`);
        for (const error of result.errors) {
          console.log(`  - ${error}`);
        }
      }
    }
  }

  // Summary
  if (!options.json && results.total > 0) {
    console.log('');
    console.log(`Validated ${results.total} skill(s): ${results.valid} valid, ${results.invalid} invalid`);
  }

  return results;
}
