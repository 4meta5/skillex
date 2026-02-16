/**
 * Property-based tests for the library module
 *
 * These tests use fast-check to verify invariants of the skills library.
 * Run separately from unit tests due to longer execution time:
 *   npm run test:property
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createSkillsLibrary } from './library.js';
import { SKILL_CATEGORIES } from './types.js';
import type { Skill, SkillCategory } from './types.js';

// Custom arbitraries
const skillNameArb = fc.stringMatching(/^[a-z][a-z0-9-]{2,20}$/);

// YAML-safe description: alphanumeric without trailing/leading spaces
const descriptionArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{4,20}$/)
  .map(s => s.trim());

// Body content: simple alphanumeric
const bodyContentArb = fc.stringMatching(/^[a-z0-9]{0,50}$/);
const categoryArb = fc.constantFrom<SkillCategory>(...SKILL_CATEGORIES);

// Generate valid skill data
const skillDataArb = fc.record({
  name: skillNameArb,
  description: descriptionArb,
  body: bodyContentArb,
  category: fc.option(categoryArb, { nil: undefined })
});

function createSkillMd(data: { name: string; description: string; body: string; category?: SkillCategory }): string {
  let yaml = `name: ${data.name}\ndescription: ${data.description}`;
  if (data.category) {
    yaml += `\ncategory: ${data.category}`;
  }
  return `---\n${yaml}\n---\n\n${data.body}`;
}

// Helper to create isolated temp directory for each test iteration
async function withTempDirs<T>(fn: (projectDir: string, skillsDir: string) => Promise<T>): Promise<T> {
  const tempDir = join(tmpdir(), `lib-prop-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const projectDir = join(tempDir, 'project');
  const skillsDir = join(projectDir, '.claude', 'skills');

  try {
    await mkdir(skillsDir, { recursive: true });
    return await fn(projectDir, skillsDir);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

describe('createSkillsLibrary property tests', () => {
  describe('loadSkill', () => {
    it('should always return skill with matching name', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (projectDir, skillsDir) => {
            const skillDir = join(skillsDir, skillData.name);
            await mkdir(skillDir, { recursive: true });
            await writeFile(join(skillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir });
            const skill = await library.loadSkill(skillData.name);

            expect(skill.metadata.name).toBe(skillData.name);
          });
        }),
        { numRuns: 25 }
      );
    });

    it('should throw for non-existent skills', async () => {
      await fc.assert(
        fc.asyncProperty(skillNameArb, async (name) => {
          await withTempDirs(async (projectDir) => {
            const library = createSkillsLibrary({ cwd: projectDir });
            await expect(library.loadSkill(name)).rejects.toThrow(`Skill not found: ${name}`);
          });
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('listSkills', () => {
    it('should list all skills when no category filter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb, { minLength: 1, maxLength: 4 }),
          async (skills) => {
            await withTempDirs(async (projectDir, skillsDir) => {
              // Create skills with unique names
              const uniqueSkills = skills.map((skill, i) => ({
                ...skill,
                name: `${skill.name}-${i}`
              }));

              for (const skill of uniqueSkills) {
                const dir = join(skillsDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir });
              const listed = await library.listSkills();

              expect(listed.length).toBe(uniqueSkills.length);
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should filter by category correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb.map(s => ({ ...s, category: 'principles' as SkillCategory })), { minLength: 1, maxLength: 3 }),
          fc.array(skillDataArb.map(s => ({ ...s, category: 'audit' as SkillCategory })), { minLength: 1, maxLength: 3 }),
          async (testingSkills, devSkills) => {
            await withTempDirs(async (projectDir, skillsDir) => {
              const allSkills = [
                ...testingSkills.map((s, i) => ({ ...s, name: `testing-${i}` })),
                ...devSkills.map((s, i) => ({ ...s, name: `dev-${i}` }))
              ];

              for (const skill of allSkills) {
                const dir = join(skillsDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir });

              const filteredTesting = await library.listSkills('principles');
              const filteredDev = await library.listSkills('audit');

              expect(filteredTesting.length).toBe(testingSkills.length);
              expect(filteredDev.length).toBe(devSkills.length);

              filteredTesting.forEach((skill: Skill) => {
                expect(skill.metadata.category).toBe('principles');
              });
              filteredDev.forEach((skill: Skill) => {
                expect(skill.metadata.category).toBe('audit');
              });
            });
          }
        ),
        { numRuns: 10 }
      );
    });
  });

  describe('installSkill', () => {
    it('should install skill to project location', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (projectDir, skillsDir) => {
            // Create skill
            const skillDir = join(skillsDir, skillData.name);
            await mkdir(skillDir, { recursive: true });
            await writeFile(join(skillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir });
            const skill = await library.loadSkill(skillData.name);

            // Create another project to install into
            const otherProjectDir = join(projectDir, '..', 'other-project');
            await mkdir(otherProjectDir, { recursive: true });

            const otherLibrary = createSkillsLibrary({ cwd: otherProjectDir });
            await otherLibrary.installSkill(skill, { location: 'project' });

            const installedPath = join(otherProjectDir, '.claude', 'skills', skillData.name, 'SKILL.md');
            const installedContent = await readFile(installedPath, 'utf-8');

            expect(installedContent).toContain(`name: ${skillData.name}`);
          });
        }),
        { numRuns: 15 }
      );
    });

    it('installed skill should be loadable', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (projectDir, skillsDir) => {
            // Create skill
            const skillDir = join(skillsDir, skillData.name);
            await mkdir(skillDir, { recursive: true });
            await writeFile(join(skillDir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir });
            const originalSkill = await library.loadSkill(skillData.name);

            // Create another project to install into
            const otherProjectDir = join(projectDir, '..', 'other-project');
            await mkdir(otherProjectDir, { recursive: true });

            const otherLibrary = createSkillsLibrary({ cwd: otherProjectDir });
            await otherLibrary.installSkill(originalSkill, { location: 'project' });

            const loadedSkill = await otherLibrary.loadSkill(skillData.name);

            expect(loadedSkill.metadata.name).toBe(skillData.name);
          });
        }),
        { numRuns: 15 }
      );
    });
  });

  describe('extendProject', () => {
    it('should install all specified skills', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(skillDataArb, { minLength: 1, maxLength: 3 }),
          async (skills) => {
            await withTempDirs(async (projectDir, skillsDir) => {
              // Create skills with unique names
              const uniqueSkills = skills.map((skill, i) => ({
                ...skill,
                name: `${skill.name}-${i}`
              }));

              for (const skill of uniqueSkills) {
                const dir = join(skillsDir, skill.name);
                await mkdir(dir, { recursive: true });
                await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
              }

              const library = createSkillsLibrary({ cwd: projectDir });
              await library.extendProject(uniqueSkills.map(s => s.name));

              // Verify all skills are in CLAUDE.md
              const claudeMdContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
              for (const skill of uniqueSkills) {
                expect(claudeMdContent).toContain(`@.claude/skills/${skill.name}/SKILL.md`);
              }
            });
          }
        ),
        { numRuns: 10 }
      );
    });

    it('should update or create CLAUDE.md with skill references', async () => {
      await fc.assert(
        fc.asyncProperty(skillDataArb, async (skillData) => {
          await withTempDirs(async (projectDir, skillsDir) => {
            // Create skill
            const dir = join(skillsDir, skillData.name);
            await mkdir(dir, { recursive: true });
            await writeFile(join(dir, 'SKILL.md'), createSkillMd(skillData));

            const library = createSkillsLibrary({ cwd: projectDir });
            await library.extendProject([skillData.name]);

            const claudeMdContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
            expect(claudeMdContent).toContain(`@.claude/skills/${skillData.name}/SKILL.md`);
          });
        }),
        { numRuns: 15 }
      );
    });
  });
});

describe('invariant tests', () => {
  it('listSkills().length >= loadSkill() successes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(skillDataArb, { minLength: 0, maxLength: 4 }),
        async (skills) => {
          await withTempDirs(async (projectDir, skillsDir) => {
            const uniqueSkills = skills.map((skill, i) => ({
              ...skill,
              name: `skill-${i}`
            }));

            for (const skill of uniqueSkills) {
              const dir = join(skillsDir, skill.name);
              await mkdir(dir, { recursive: true });
              await writeFile(join(dir, 'SKILL.md'), createSkillMd(skill));
            }

            const library = createSkillsLibrary({ cwd: projectDir });
            const listed = await library.listSkills();

            let loadableCount = 0;
            for (const skill of uniqueSkills) {
              try {
                await library.loadSkill(skill.name);
                loadableCount++;
              } catch {
                // Skill not loadable
              }
            }

            expect(listed.length).toBeGreaterThanOrEqual(loadableCount);
          });
        }
      ),
      { numRuns: 10 }
    );
  });

  it('loading then installing then loading should preserve skill data', async () => {
    await fc.assert(
      fc.asyncProperty(skillDataArb, async (skillData) => {
        await withTempDirs(async (projectDir, skillsDir) => {
          // Create skill
          const dir = join(skillsDir, skillData.name);
          await mkdir(dir, { recursive: true });
          await writeFile(join(dir, 'SKILL.md'), createSkillMd(skillData));

          const library = createSkillsLibrary({ cwd: projectDir });

          // Load -> Install (to another project) -> Load cycle
          const original = await library.loadSkill(skillData.name);

          const otherProjectDir = join(projectDir, '..', 'other-project');
          await mkdir(otherProjectDir, { recursive: true });
          const otherLibrary = createSkillsLibrary({ cwd: otherProjectDir });
          await otherLibrary.installSkill(original, { location: 'project' });
          const reloaded = await otherLibrary.loadSkill(skillData.name);

          // Core metadata should be preserved
          expect(reloaded.metadata.name).toBe(original.metadata.name);
          expect(reloaded.metadata.description).toBe(original.metadata.description);
          if (original.metadata.category) {
            expect(reloaded.metadata.category).toBe(original.metadata.category);
          }
        });
      }),
      { numRuns: 15 }
    );
  });
});
