/**
 * Tests for scan command
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { scanCommand } from './scan.js';

describe('scan command', () => {
  let testDir: string;

  beforeAll(async () => {
    testDir = join(tmpdir(), 'scan-test-' + Date.now());
    await mkdir(testDir, { recursive: true });

    // Create a minimal package.json
    await writeFile(
      join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        dependencies: {
          typescript: '^5.0.0',
        },
        devDependencies: {
          vitest: '^1.0.0',
        },
      })
    );

    // Create tsconfig.json
    await writeFile(
      join(testDir, 'tsconfig.json'),
      JSON.stringify({
        compilerOptions: {
          strict: true,
        },
      })
    );
  });

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true });
  });

  describe('--cwd option', () => {
    it('should analyze project at specified directory', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await scanCommand({ cwd: testDir, json: true });
      } finally {
        console.log = originalLog;
      }

      // Output must be pure JSON, parseable from start to end
      const trimmed = output.trim();
      const parsed = JSON.parse(trimmed);

      expect(parsed.detected.languages.some((l: { name: string }) => l.name === 'TypeScript')).toBe(
        true
      );
      expect(parsed.detected.testing.some((t: { name: string }) => t.name === 'Vitest')).toBe(true);
    });

    it('should produce pure JSON output with no preface text', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await scanCommand({ cwd: testDir, json: true });
      } finally {
        console.log = originalLog;
      }

      const trimmed = output.trim();

      // Must start with { and end with } (pure JSON)
      expect(trimmed.startsWith('{')).toBe(true);
      expect(trimmed.endsWith('}')).toBe(true);

      // Must be directly parseable
      expect(() => JSON.parse(trimmed)).not.toThrow();
    });

    it('should work with explicit cwd matching current directory', async () => {
      let output = '';
      const originalLog = console.log;
      console.log = (...args: unknown[]) => {
        output += args.join(' ') + '\n';
      };

      try {
        await scanCommand({ cwd: testDir, json: true });
      } finally {
        console.log = originalLog;
      }

      // Output must be pure JSON
      const trimmed = output.trim();
      const parsed = JSON.parse(trimmed);

      expect(parsed.detected.languages.some((l: { name: string }) => l.name === 'TypeScript')).toBe(
        true
      );
    });
  });
});
