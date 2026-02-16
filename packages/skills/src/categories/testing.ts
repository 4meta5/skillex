import type { SkillCategory } from '../types.js';

/**
 * Legacy category helper retained for API stability.
 * Maps legacy "testing" helper concepts to canonical "principles".
 */
export const testingCategory: SkillCategory = 'principles';

export const testingSkills = [
  'tdd'
] as const;

export type TestingSkill = typeof testingSkills[number];
