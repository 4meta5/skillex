import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { showCommand } from './show.js';

vi.mock('@4meta5/skills', () => ({
  createSkillsLibrary: vi.fn()
}));

import { createSkillsLibrary } from '@4meta5/skills';

describe('showCommand', () => {
  let output: string;
  let originalLog: typeof console.log;

  beforeEach(() => {
    output = '';
    originalLog = console.log;
    console.log = (...args: unknown[]) => {
      output += args.join(' ') + '\n';
    };
  });

  afterEach(() => {
    console.log = originalLog;
    vi.restoreAllMocks();
  });

  it('should display extensions when present and non-empty', async () => {
    const mockLibrary = {
      loadSkill: vi.fn().mockResolvedValue({
        metadata: {
          name: 'test-skill',
          description: 'A test skill',
          extensions: 'ext-a, ext-b'
        },
        content: '# Test',
        path: '/tmp/test-skill'
      })
    };
    vi.mocked(createSkillsLibrary).mockReturnValue(mockLibrary as never);

    await showCommand('test-skill');

    expect(output).toContain('Extensions: ext-a, ext-b');
  });

  it('should display (none) when extensions is empty string', async () => {
    const mockLibrary = {
      loadSkill: vi.fn().mockResolvedValue({
        metadata: {
          name: 'test-skill',
          description: 'A test skill',
          extensions: ''
        },
        content: '# Test',
        path: '/tmp/test-skill'
      })
    };
    vi.mocked(createSkillsLibrary).mockReturnValue(mockLibrary as never);

    await showCommand('test-skill');

    expect(output).toContain('Extensions: (none)');
  });

  it('should display (none) when extensions is whitespace only', async () => {
    const mockLibrary = {
      loadSkill: vi.fn().mockResolvedValue({
        metadata: {
          name: 'test-skill',
          description: 'A test skill',
          extensions: '   '
        },
        content: '# Test',
        path: '/tmp/test-skill'
      })
    };
    vi.mocked(createSkillsLibrary).mockReturnValue(mockLibrary as never);

    await showCommand('test-skill');

    expect(output).toContain('Extensions: (none)');
  });

  it('should not display extensions line when extensions is undefined', async () => {
    const mockLibrary = {
      loadSkill: vi.fn().mockResolvedValue({
        metadata: {
          name: 'test-skill',
          description: 'A test skill'
        },
        content: '# Test',
        path: '/tmp/test-skill'
      })
    };
    vi.mocked(createSkillsLibrary).mockReturnValue(mockLibrary as never);

    await showCommand('test-skill');

    expect(output).not.toContain('Extensions:');
  });
});
