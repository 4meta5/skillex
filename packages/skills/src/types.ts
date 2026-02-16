import type { SkillCategory, Skill } from '@4meta5/skill-loader';

export { SKILL_CATEGORIES } from '@4meta5/skill-loader';
export type { SkillCategory, SkillMetadata, Skill, ParsedFrontmatter } from '@4meta5/skill-loader';

export interface FileStructure {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

export interface ProjectTemplate {
  name: string;
  description: string;
  skills: string[];
  claudemd: string;
  structure: FileStructure[];
}

export interface InstallOptions {
  location: 'project' | 'user';
  cwd?: string;
}

export interface SkillsLibraryOptions {
  cwd?: string;
}

export interface SkillsLibrary {
  loadSkill(name: string): Promise<Skill>;
  listSkills(category?: SkillCategory): Promise<Skill[]>;
  installSkill(skill: Skill, options: InstallOptions): Promise<void>;
  createProject(template: ProjectTemplate, targetPath: string): Promise<void>;
  extendProject(skills: string[]): Promise<void>;
}
