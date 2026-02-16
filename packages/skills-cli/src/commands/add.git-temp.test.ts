import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const cloneOrUpdateSourceMock = vi.fn<[], Promise<string>>();
const discoverSkillsInSourceMock = vi.fn<[], Promise<string[]>>();
const copySkillFromSourceMock = vi.fn<[], Promise<void>>();
const getSourceCommitMock = vi.fn<[], Promise<string>>();
const trackInstalledSkillMock = vi.fn<[], Promise<void>>();
const updateClaudeMdMock = vi.fn<[], Promise<{ success: boolean; added: string[] }>>();

vi.mock('../git.js', () => ({
  parseGitUrl: (url: string) => ({ url }),
  extractSourceName: () => 'skills',
  cloneOrUpdateSource: cloneOrUpdateSourceMock,
  discoverSkillsInSource: discoverSkillsInSourceMock,
  copySkillFromSource: copySkillFromSourceMock,
  getSourceCommit: getSourceCommitMock,
  getSkillPathInSource: vi.fn()
}));

vi.mock('../config.js', () => ({
  getDefaults: vi.fn(),
  trackInstalledSkill: trackInstalledSkillMock,
  getSourcesCacheDir: () => tmpdir(),
  getSource: vi.fn(),
  getSources: vi.fn(),
  trackProjectInstallation: vi.fn()
}));

vi.mock('../claudemd.js', () => ({
  updateClaudeMd: updateClaudeMdMock
}));

describe('add --git temp source naming', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await mkdtemp(join(tmpdir(), 'skills-add-git-temp-'));
    await mkdir(join(projectDir, '.claude', 'skills'), { recursive: true });
    await writeFile(join(projectDir, 'CLAUDE.md'), '# Test Project\n\n## Installed Skills\n', 'utf-8');

    cloneOrUpdateSourceMock.mockReset();
    discoverSkillsInSourceMock.mockReset();
    copySkillFromSourceMock.mockReset();
    getSourceCommitMock.mockReset();
    trackInstalledSkillMock.mockReset();
    updateClaudeMdMock.mockReset();

    discoverSkillsInSourceMock.mockResolvedValue(['dogfood', 'tdd']);
    copySkillFromSourceMock.mockResolvedValue();
    getSourceCommitMock.mockResolvedValue('abc12345');
    trackInstalledSkillMock.mockResolvedValue();
    updateClaudeMdMock.mockResolvedValue({ success: true, added: ['dogfood'] });

    const seenNames = new Set<string>();
    cloneOrUpdateSourceMock.mockImplementation(async (source: { name: string }) => {
      if (seenNames.has(source.name)) {
        throw new Error(`fatal: destination path '${source.name}' already exists and is not an empty directory.`);
      }
      seenNames.add(source.name);
      return '/tmp/mock-source';
    });
  });

  afterEach(async () => {
    await rm(projectDir, { recursive: true, force: true });
  });

  it('uses a distinct temp source name across repeated installs from the same git URL', async () => {
    const { addCommand } = await import('./add.js');

    await addCommand(['dogfood'], { git: '../skills', cwd: projectDir });
    await addCommand(['dogfood'], { git: '../skills', cwd: projectDir });

    expect(cloneOrUpdateSourceMock).toHaveBeenCalledTimes(2);
    const names = cloneOrUpdateSourceMock.mock.calls.map(([source]) => source.name);
    expect(new Set(names).size).toBe(2);
    expect(names[0]).toMatch(/^_temp_skills_/);
    expect(names[1]).toMatch(/^_temp_skills_/);
  });

  it('avoids collisions when successive installs choose different skills from same source', async () => {
    const { addCommand } = await import('./add.js');

    await addCommand(['dogfood'], { git: '../skills', cwd: projectDir });
    await addCommand(['tdd'], { git: '../skills', cwd: projectDir });

    expect(cloneOrUpdateSourceMock).toHaveBeenCalledTimes(2);
    const names = cloneOrUpdateSourceMock.mock.calls.map(([source]) => source.name);
    expect(new Set(names).size).toBe(2);
  });
});
