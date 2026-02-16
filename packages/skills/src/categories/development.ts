import type { SkillCategory } from '../types.js';

/**
 * Legacy category helper retained for API stability.
 * Maps legacy "development" helper concepts to canonical "principles".
 */
export const developmentCategory: SkillCategory = 'principles';

export const developmentSkills = [
  'tdd',
  'dogfood',
  'model-router',
  'rick-rubin',
  'refactor-suggestions'
] as const;

export type DevelopmentSkill = typeof developmentSkills[number];
