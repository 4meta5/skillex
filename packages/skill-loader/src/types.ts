/**
 * Canonical supported skill categories.
 */
export const SKILL_CATEGORIES = [
  'meta',
  'audit',
  'principles',
  'habits',
  'hot'
] as const;

export type SkillCategory = typeof SKILL_CATEGORIES[number];

export interface SkillMetadata {
  name: string;
  description: string;
  category?: SkillCategory;
  'disable-model-invocation'?: boolean;
  'user-invocable'?: boolean;
  'allowed-tools'?: string;
  context?: 'fork' | 'inline';
  agent?: string;
  tools?: string;
  extensions?: string;
}

export interface Skill {
  metadata: SkillMetadata;
  content: string;
  path: string;
  supportingFiles?: string[];
}

export interface ParsedFrontmatter {
  frontmatter: SkillMetadata;
  body: string;
}

export interface LoadOptions {
  maxDepth?: number;
}
