import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('list command', () => {
  let tempDir: string;
  let oldHome: string | undefined;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'skills-list-test-'));
    oldHome = process.env.HOME;
    process.env.HOME = tempDir; // isolate from user-level skills
  });

  afterEach(async () => {
    process.env.HOME = oldHome;
    await rm(tempDir, { recursive: true, force: true });
  });

  it('uses --cwd target to list project skills', async () => {
    const projectDir = join(tempDir, 'project');
    const skillDir = join(projectDir, '.claude', 'skills', 'sample-skill');
    await mkdir(skillDir, { recursive: true });

    await writeFile(
      join(skillDir, 'SKILL.md'),
      `---
name: sample-skill
description: Sample skill for list --cwd regression test.
category: principles
---

# Sample Skill
`
    );

    const { listCommand } = await import('./list.js');

    const originalLog = console.log;
    let output = '';
    console.log = (msg: string) => {
      output += msg + '\n';
    };

    try {
      await listCommand({ cwd: projectDir });
    } finally {
      console.log = originalLog;
    }

    expect(output).toContain('sample-skill');
  });
});
