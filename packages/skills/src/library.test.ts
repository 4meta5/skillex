import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, rm, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { createSkillsLibrary } from './library.js';
import type { Skill } from './types.js';

describe('createSkillsLibrary', () => {
  let tempDir: string;
  let projectDir: string;
  let projectSkillsDir: string;

  beforeEach(async () => {
    tempDir = join(tmpdir(), `library-test-${Date.now()}`);
    projectDir = join(tempDir, 'project');
    projectSkillsDir = join(projectDir, '.claude', 'skills');

    await mkdir(projectSkillsDir, { recursive: true });

    // Create a project skill
    await mkdir(join(projectSkillsDir, 'test-skill'));
    await writeFile(join(projectSkillsDir, 'test-skill', 'SKILL.md'), `---
name: test-skill
description: A test skill
category: principles
---

Test skill content`);
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe('loadSkill', () => {
    it('loads a skill from project directory', async () => {
      const library = createSkillsLibrary({ cwd: projectDir });

      const skill = await library.loadSkill('test-skill');

      expect(skill.metadata.name).toBe('test-skill');
      expect(skill.content).toBe('Test skill content');
    });

    it('throws when skill not found', async () => {
      const library = createSkillsLibrary({ cwd: projectDir });

      await expect(library.loadSkill('nonexistent')).rejects.toThrow('Skill not found: nonexistent');
    });
  });

  describe('listSkills', () => {
    it('lists all available skills', async () => {
      // Add another skill
      await mkdir(join(projectSkillsDir, 'another-skill'));
      await writeFile(join(projectSkillsDir, 'another-skill', 'SKILL.md'), `---
name: another-skill
description: Another skill
---

Content`);

      const library = createSkillsLibrary({ cwd: projectDir });

      const skills = await library.listSkills();

      expect(skills.length).toBeGreaterThanOrEqual(2);
      expect(skills.map((s: Skill) => s.metadata.name)).toContain('test-skill');
      expect(skills.map((s: Skill) => s.metadata.name)).toContain('another-skill');
    });

    it('filters by category', async () => {
      // Add skill with different category
      await mkdir(join(projectSkillsDir, 'dev-skill'));
      await writeFile(join(projectSkillsDir, 'dev-skill', 'SKILL.md'), `---
name: dev-skill
description: Development skill
category: audit
---

Content`);

      const library = createSkillsLibrary({ cwd: projectDir });

      const testingSkills = await library.listSkills('principles');
      const devSkills = await library.listSkills('audit');

      expect(testingSkills.map((s: Skill) => s.metadata.name)).toContain('test-skill');
      expect(testingSkills.map((s: Skill) => s.metadata.name)).not.toContain('dev-skill');
      expect(devSkills.map((s: Skill) => s.metadata.name)).toContain('dev-skill');
    });
  });

  describe('installSkill', () => {
    it('installs a skill to project location', async () => {
      const library = createSkillsLibrary({ cwd: projectDir });

      const skill = await library.loadSkill('test-skill');

      // Create a new project to install into
      const newProjectDir = join(tempDir, 'new-project');
      await mkdir(newProjectDir, { recursive: true });

      const newLibrary = createSkillsLibrary({ cwd: newProjectDir });
      await newLibrary.installSkill(skill, { location: 'project' });

      const installedContent = await readFile(
        join(newProjectDir, '.claude', 'skills', 'test-skill', 'SKILL.md'),
        'utf-8'
      );

      expect(installedContent).toContain('name: test-skill');
      expect(installedContent).toContain('Test skill content');
    });

    it('copies supporting files', async () => {
      // Add supporting file to skill
      await mkdir(join(projectSkillsDir, 'test-skill', 'examples'), { recursive: true });
      await writeFile(
        join(projectSkillsDir, 'test-skill', 'examples', 'example.md'),
        '# Example'
      );

      const library = createSkillsLibrary({ cwd: projectDir });
      const skill = await library.loadSkill('test-skill');

      // Create a new project to install into
      const newProjectDir = join(tempDir, 'new-project');
      await mkdir(newProjectDir, { recursive: true });

      const newLibrary = createSkillsLibrary({ cwd: newProjectDir });
      await newLibrary.installSkill(skill, { location: 'project' });

      const exampleContent = await readFile(
        join(newProjectDir, '.claude', 'skills', 'test-skill', 'examples', 'example.md'),
        'utf-8'
      );

      expect(exampleContent).toBe('# Example');
    });
  });

  describe('extendProject', () => {
    it('installs skills and updates CLAUDE.md', async () => {
      // Create initial CLAUDE.md
      await writeFile(join(projectDir, 'CLAUDE.md'), '# Project\n\nSome content.');

      const library = createSkillsLibrary({ cwd: projectDir });

      await library.extendProject(['test-skill']);

      // Check CLAUDE.md was updated
      const claudeContent = await readFile(join(projectDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('## Installed Skills');
      expect(claudeContent).toContain('@.claude/skills/test-skill/SKILL.md');
    });

    it('creates CLAUDE.md if it does not exist', async () => {
      // Remove existing CLAUDE.md if any
      const newProjectDir = join(tempDir, 'no-claude-md');
      const newSkillsDir = join(newProjectDir, '.claude', 'skills');
      await mkdir(newSkillsDir, { recursive: true });

      // Create a skill in the new project
      await mkdir(join(newSkillsDir, 'test-skill'));
      await writeFile(join(newSkillsDir, 'test-skill', 'SKILL.md'), `---
name: test-skill
description: A test skill
---

Content`);

      const library = createSkillsLibrary({ cwd: newProjectDir });

      await library.extendProject(['test-skill']);

      const claudeContent = await readFile(join(newProjectDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('## Installed Skills');
      expect(claudeContent).toContain('@.claude/skills/test-skill/SKILL.md');
    });
  });

  describe('createProject', () => {
    it('creates project structure from template', async () => {
      const targetDir = join(tempDir, 'new-project');

      const library = createSkillsLibrary({ cwd: projectDir });

      await library.createProject(
        {
          name: 'test-template',
          description: 'Test template',
          skills: ['test-skill'],
          claudemd: '# Test Project\n\nGenerated from template.',
          structure: [
            { path: 'src', type: 'directory', content: '' },
            { path: 'src/index.ts', type: 'file', content: 'export const x = 1;' }
          ]
        },
        targetDir
      );

      // Check CLAUDE.md
      const claudeContent = await readFile(join(targetDir, 'CLAUDE.md'), 'utf-8');
      expect(claudeContent).toContain('# Test Project');

      // Check file structure
      const indexContent = await readFile(join(targetDir, 'src', 'index.ts'), 'utf-8');
      expect(indexContent).toBe('export const x = 1;');

      // Check skill was installed
      const skillContent = await readFile(
        join(targetDir, '.claude', 'skills', 'test-skill', 'SKILL.md'),
        'utf-8'
      );
      expect(skillContent).toContain('test-skill');
    });
  });
});
