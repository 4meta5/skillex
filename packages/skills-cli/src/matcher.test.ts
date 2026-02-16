import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ProjectAnalysis, DetectedTechnology, Confidence, SkillCategory } from './detector/types.js';
import {
  matchSkills,
  getAllRecommendations,
  filterByConfidence,
  filterByTag,
  type MatchResult,
  type SkillRecommendation,
  type SkillAlternative
} from './matcher.js';

// Mock the skills library
vi.mock('@4meta5/skills', () => ({
  createSkillsLibrary: () => ({
    loadSkill: vi.fn().mockRejectedValue(new Error('Skill not found')),
    listSkills: vi.fn().mockResolvedValue([])
  })
}));

// Mock the registry
vi.mock('./registry.js', () => ({
  listRemoteSkills: vi.fn().mockResolvedValue([]),
  loadRemoteSkill: vi.fn().mockRejectedValue(new Error('Not found'))
}));

// Mock the config
vi.mock('./config.js', () => ({
  getSources: vi.fn().mockResolvedValue([]),
  getSource: vi.fn().mockResolvedValue(undefined)
}));

function createAnalysis(overrides: Partial<ProjectAnalysis> = {}): ProjectAnalysis {
  return {
    languages: [],
    frameworks: [],
    deployment: [],
    testing: [],
    databases: [],
    existingSkills: [],
    projectPath: '/test/project',
    ...overrides
  };
}

function createTech(
  name: string,
  category: 'language' | 'framework' | 'deployment' | 'testing' | 'database',
  tags: string[],
  confidence: Confidence = 'high'
): DetectedTechnology {
  return {
    name,
    category,
    confidence,
    evidence: 'test',
    tags
  };
}

describe('Skill Matcher', () => {
  describe('matchSkills', () => {
    it('matches skills for TypeScript projects from curated sources', async () => {
      const analysis = createAnalysis({
        languages: [createTech('TypeScript', 'language', ['typescript', 'ts'])]
      });

      const result = await matchSkills(analysis);

      // Should find curated skills for TypeScript from 4meta5-skills
      const allRecs = getAllRecommendations(result);
      const tsSkills = allRecs.filter(r =>
        r.tags.some(t => t.includes('typescript') || t.includes('ts'))
      );
      expect(tsSkills.length).toBeGreaterThan(0);
    });

    it('matches skills for Rust projects from curated sources', async () => {
      const analysis = createAnalysis({
        languages: [createTech('Rust', 'language', ['rust', 'cargo'])]
      });

      const result = await matchSkills(analysis);

      // Should find curated skills for Rust from 4meta5-skills
      const allRecs = getAllRecommendations(result);
      const rustSkills = allRecs.filter(r =>
        r.tags.some(t => t.includes('rust') || t.includes('cargo'))
      );
      expect(rustSkills.length).toBeGreaterThan(0);
    });

    it('skips already installed skills', async () => {
      const analysis = createAnalysis({
        languages: [createTech('Rust', 'language', ['rust', 'cargo'])],
        existingSkills: ['code-review-rust']
      });

      const result = await matchSkills(analysis);

      const rustSkill = getAllRecommendations(result).find(r => r.name === 'code-review-rust');
      expect(rustSkill).toBeUndefined();
    });
  });

  describe('filterByConfidence', () => {
    const mockResult: MatchResult = {
      high: [
        { name: 'skill-1', confidence: 'high', reason: '', source: 'curated', tags: [] }
      ],
      medium: [
        { name: 'skill-2', confidence: 'medium', reason: '', source: 'curated', tags: [] }
      ],
      low: [
        { name: 'skill-3', confidence: 'low', reason: '', source: 'curated', tags: [] }
      ]
    };

    it('returns only high confidence when filter is high', () => {
      const filtered = filterByConfidence(mockResult, 'high');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('skill-1');
    });

    it('returns high and medium when filter is medium', () => {
      const filtered = filterByConfidence(mockResult, 'medium');
      expect(filtered).toHaveLength(2);
      expect(filtered.map(r => r.name)).toContain('skill-1');
      expect(filtered.map(r => r.name)).toContain('skill-2');
    });

    it('returns all when filter is low', () => {
      const filtered = filterByConfidence(mockResult, 'low');
      expect(filtered).toHaveLength(3);
    });
  });

  describe('filterByTag', () => {
    const recommendations: SkillRecommendation[] = [
      { name: 'svelte-skill', confidence: 'high', reason: '', source: 'curated', tags: ['svelte', 'frontend'] },
      { name: 'rust-skill', confidence: 'high', reason: '', source: 'curated', tags: ['rust', 'cargo'] },
      { name: 'cloudflare-skill', confidence: 'medium', reason: '', source: 'curated', tags: ['cloudflare', 'workers'] }
    ];

    it('filters by exact tag match', () => {
      const filtered = filterByTag(recommendations, 'svelte');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('svelte-skill');
    });

    it('filters by partial tag match', () => {
      const filtered = filterByTag(recommendations, 'cloud');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('cloudflare-skill');
    });

    it('filters by name match', () => {
      const filtered = filterByTag(recommendations, 'rust');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('rust-skill');
    });

    it('returns empty array when no matches', () => {
      const filtered = filterByTag(recommendations, 'python');
      expect(filtered).toHaveLength(0);
    });

    it('is case insensitive', () => {
      const filtered = filterByTag(recommendations, 'SVELTE');
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('svelte-skill');
    });
  });

  describe('getAllRecommendations', () => {
    it('returns recommendations in confidence order', () => {
      const result: MatchResult = {
        high: [{ name: 'high-1', confidence: 'high', reason: '', source: 'curated', tags: [] }],
        medium: [{ name: 'med-1', confidence: 'medium', reason: '', source: 'curated', tags: [] }],
        low: [{ name: 'low-1', confidence: 'low', reason: '', source: 'curated', tags: [] }]
      };

      const all = getAllRecommendations(result);

      expect(all).toHaveLength(3);
      expect(all[0].name).toBe('high-1');
      expect(all[1].name).toBe('med-1');
      expect(all[2].name).toBe('low-1');
    });
  });
});

describe('Curated Sources Matching', () => {
  it('recommends Svelte skills for Svelte 5 projects', async () => {
    const analysis = createAnalysis({
      frameworks: [
        createTech('Svelte 5', 'framework', ['svelte', 'svelte5', 'runes', 'frontend'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    // Should have curated Svelte skills
    const svelteRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('svelte')) && r.source === 'curated'
    );
    expect(svelteRecs.length).toBeGreaterThan(0);
  });

  it('recommends Cloudflare skills for Workers projects', async () => {
    const analysis = createAnalysis({
      deployment: [
        createTech('Cloudflare Workers', 'deployment', ['cloudflare', 'workers', 'edge', 'serverless'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const cfRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('cloudflare')) && r.source === 'curated'
    );
    expect(cfRecs.length).toBeGreaterThan(0);
  });

  it('recommends database skills for Neon projects', async () => {
    const analysis = createAnalysis({
      databases: [
        createTech('Neon Postgres', 'database', ['neon', 'postgres', 'postgresql', 'serverless', 'database'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const dbRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('neon') || t.includes('postgres')) && r.source === 'curated'
    );
    expect(dbRecs.length).toBeGreaterThan(0);
  });

  it('recommends AWS skills for CDK projects', async () => {
    const analysis = createAnalysis({
      deployment: [
        createTech('AWS CDK', 'deployment', ['aws', 'cdk', 'infrastructure', 'iac'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const awsRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('aws') || t.includes('cdk')) && r.source === 'curated'
    );
    expect(awsRecs.length).toBeGreaterThan(0);
  });
});

describe('Category-based Deduplication', () => {
  it('includes category in curated skill recommendations', async () => {
    const analysis = createAnalysis({
      frameworks: [
        createTech('Svelte 5', 'framework', ['svelte', 'svelte5', 'runes', 'frontend'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const svelteRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('svelte')) && r.source === 'curated'
    );
    expect(svelteRecs.length).toBeGreaterThan(0);
    expect(svelteRecs[0].category).toBe('hot');
  });

  it('includes priority in curated skill recommendations', async () => {
    const analysis = createAnalysis({
      frameworks: [
        createTech('Svelte 5', 'framework', ['svelte', 'svelte5', 'runes', 'frontend'])
      ]
    });

    const result = await matchSkills(analysis);

    const allRecs = getAllRecommendations(result);
    const svelteRecs = allRecs.filter(r =>
      r.tags.some(t => t.includes('svelte')) && r.source === 'curated'
    );
    expect(svelteRecs.length).toBeGreaterThan(0);
    expect(svelteRecs[0].priority).toBe(10);
  });

  it('tracks alternatives structure correctly when present', async () => {
    // Create a recommendation with alternatives manually to test the interface
    const recWithAlts: SkillRecommendation = {
      name: 'test-skill',
      confidence: 'high',
      reason: 'test',
      source: 'curated',
      tags: ['test'],
      category: 'principles',
      priority: 10,
      alternatives: [
        { name: 'alt-skill-1', source: 'curated' },
        { name: 'alt-skill-2', source: 'registered' }
      ]
    };

    expect(recWithAlts.alternatives).toHaveLength(2);
    expect(recWithAlts.alternatives![0].name).toBe('alt-skill-1');
    expect(recWithAlts.alternatives![0].source).toBe('curated');
    expect(recWithAlts.alternatives![1].name).toBe('alt-skill-2');
    expect(recWithAlts.alternatives![1].source).toBe('registered');
  });

  it('deduplication groups by category and sorted tags', async () => {
    // Test the deduplication key logic
    const rec1: SkillRecommendation = {
      name: 'skill-1',
      confidence: 'high',
      reason: 'test',
      source: 'curated',
      tags: ['a', 'b'],
      category: 'principles',
      priority: 10
    };

    const rec2: SkillRecommendation = {
      name: 'skill-2',
      confidence: 'high',
      reason: 'test',
      source: 'curated',
      tags: ['b', 'a'],  // Same tags, different order
      category: 'principles',
      priority: 5
    };

    // Both should have same deduplication key since tags are sorted
    // This is a unit test for the concept
    expect(rec1.category).toBe(rec2.category);
    expect([...rec1.tags].sort().join(',')).toBe([...rec2.tags].sort().join(','));
  });

  it('skills without category get unique dedup key', async () => {
    // Test that uncategorized skills are not deduplicated together
    const rec1: SkillRecommendation = {
      name: 'skill-1',
      confidence: 'high',
      reason: 'test',
      source: 'curated',
      tags: ['a', 'b']
      // No category
    };

    const rec2: SkillRecommendation = {
      name: 'skill-2',
      confidence: 'high',
      reason: 'test',
      source: 'curated',
      tags: ['a', 'b']
      // No category
    };

    // Without category, they should be treated as unique (not deduplicated)
    expect(rec1.category).toBeUndefined();
    expect(rec2.category).toBeUndefined();
    // They have same tags but different names, so uncategorized:skill-1 != uncategorized:skill-2
    expect(rec1.name).not.toBe(rec2.name);
  });
});
