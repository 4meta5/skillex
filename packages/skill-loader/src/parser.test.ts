import { describe, it, expect } from 'vitest';
import { parseFrontmatter, formatSkillMd } from './parser.js';
import { SKILL_CATEGORIES } from './types.js';

describe('parseFrontmatter', () => {
  it('parses valid SKILL.md content', () => {
    const content = `---
name: test-skill
description: A test skill
---

# Test Skill

This is the body.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('test-skill');
    expect(result.frontmatter.description).toBe('A test skill');
    expect(result.body).toBe('# Test Skill\n\nThis is the body.');
  });

  it('parses all frontmatter fields', () => {
    const content = `---
name: complete-skill
description: A complete skill
category: principles
disable-model-invocation: true
user-invocable: false
allowed-tools: Read, Write, Bash
context: fork
agent: test-agent
---

Content here.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('complete-skill');
    expect(result.frontmatter.description).toBe('A complete skill');
    expect(result.frontmatter.category).toBe('principles');
    expect(result.frontmatter['disable-model-invocation']).toBe(true);
    expect(result.frontmatter['user-invocable']).toBe(false);
    expect(result.frontmatter['allowed-tools']).toBe('Read, Write, Bash');
    expect(result.frontmatter.context).toBe('fork');
    expect(result.frontmatter.agent).toBe('test-agent');
  });

  it('throws on missing frontmatter delimiters', () => {
    const content = 'Just some content without frontmatter';

    expect(() => parseFrontmatter(content)).toThrow('Invalid SKILL.md format');
  });

  it('throws on missing name field', () => {
    const content = `---
description: Missing name
---

Content`;

    expect(() => parseFrontmatter(content)).toThrow('missing required "name" field');
  });

  it('throws on missing description field', () => {
    const content = `---
name: no-description
---

Content`;

    expect(() => parseFrontmatter(content)).toThrow('missing required "description" field');
  });

  it('handles empty body', () => {
    const content = `---
name: empty-body
description: Has empty body
---

`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('empty-body');
    expect(result.body).toBe('');
  });

  it('handles multiline description', () => {
    const content = `---
name: multiline-desc
description: |
  This is a multiline
  description that spans
  multiple lines
---

Body content.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('multiline-desc');
    expect(result.frontmatter.description).toContain('multiline');
    expect(result.frontmatter.description).toContain('multiple lines');
  });

  it('handles unquoted colons in description values', () => {
    const content = `---
name: colon-desc
description: Comprehensive test-driven development: TDD workflow, test suggestions from diff,
test generation, and property-based testing.
category: principles
---

Body content.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('colon-desc');
    expect(result.frontmatter.description).toContain('Comprehensive test-driven development: TDD workflow');
    expect(result.frontmatter.category).toBe('principles');
  });
});

describe('parseFrontmatter - type safety', () => {
  it('should throw on invalid YAML that parses to non-object', () => {
    // YAML that parses to a string instead of object
    const content = `---
"just a string value"
---

Body content`;

    expect(() => parseFrontmatter(content)).toThrow(/invalid|name|description/i);
  });

  it('should throw when name is not a string', () => {
    const content = `---
name: 123
description: A description
---

Body`;

    // name should be a string, not a number
    expect(() => parseFrontmatter(content)).toThrow(/name.*string|invalid.*name/i);
  });

  it('should throw when description is not a string', () => {
    const content = `---
name: valid-name
description:
  - item1
  - item2
---

Body`;

    // description should be a string, not an array
    expect(() => parseFrontmatter(content)).toThrow(/description.*string|invalid.*description/i);
  });

  it('should preserve extensions when it is a string', () => {
    const content = `---
name: ext-skill
description: A skill with extensions
extensions: ext-a, ext-b
---

Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.extensions).toBe('ext-a, ext-b');
  });

  it('should not include extensions when absent', () => {
    const content = `---
name: no-ext
description: A skill without extensions
---

Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.extensions).toBeUndefined();
  });

  it('should preserve empty string extensions', () => {
    const content = `---
name: empty-ext
description: A skill with empty extensions
extensions: ""
---

Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.extensions).toBe('');
  });

  it('should throw on non-string extensions (array)', () => {
    const content = `---
name: bad-ext
description: A skill with array extensions
extensions:
  - ext-a
  - ext-b
---

Body`;

    expect(() => parseFrontmatter(content)).toThrow(/extensions.*string/i);
  });

  it('should parse tools field from agent definitions', () => {
    const content = `---
name: function-analyzer
description: Performs per-function deep analysis
tools: Read, Grep, Glob
---

Agent instructions here.`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.name).toBe('function-analyzer');
    expect(result.frontmatter.tools).toBe('Read, Grep, Glob');
  });

  it('should not include tools when absent', () => {
    const content = `---
name: no-tools
description: A skill without tools
---

Body`;

    const result = parseFrontmatter(content);

    expect(result.frontmatter.tools).toBeUndefined();
  });

  it('should accept unknown category values without throwing', () => {
    const content = `---
name: valid-name
description: Valid description
category: not-a-valid-category
---

Body`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('valid-name');
    // Unknown category should be dropped, not cause a crash
    expect(result.frontmatter.category).toBeUndefined();
  });

  it('should accept legacy category values from older skills', () => {
    const content = `---
name: legacy-skill
description: A skill with old category
category: testing
---

Body`;

    const result = parseFrontmatter(content);
    expect(result.frontmatter.name).toBe('legacy-skill');
    expect(result.frontmatter.category).toBeUndefined();
  });

  it('should accept all supported categories', () => {
    for (const category of SKILL_CATEGORIES) {
      const content = `---
name: category-${category}
description: A skill validating category compatibility behavior
category: ${category}
---

Body`;

      const result = parseFrontmatter(content);
      expect(result.frontmatter.category).toBe(category);
    }
  });
});

describe('formatSkillMd', () => {
  it('formats basic skill metadata', () => {
    const content = formatSkillMd(
      { name: 'test-skill', description: 'A test skill' },
      '# Instructions'
    );

    expect(content).toContain('---');
    expect(content).toContain('name: test-skill');
    expect(content).toContain('description: A test skill');
    expect(content).toContain('# Instructions');
  });

  it('includes optional fields when present', () => {
    const content = formatSkillMd(
      {
        name: 'full-skill',
        description: 'A full skill',
        category: 'principles',
        'user-invocable': true
      },
      'Body'
    );

    expect(content).toContain('category: principles');
    expect(content).toContain('user-invocable: true');
  });

  it('omits undefined fields', () => {
    const content = formatSkillMd(
      {
        name: 'minimal-skill',
        description: 'Minimal',
        category: undefined
      },
      'Body'
    );

    expect(content).not.toContain('category');
    expect(content).not.toContain('undefined');
  });

  it('round-trips with parseFrontmatter', () => {
    const original = {
      name: 'roundtrip-skill',
      description: 'Testing roundtrip'
    };
    const body = '# Test Content\n\nSome instructions.';

    const formatted = formatSkillMd(original, body);
    const parsed = parseFrontmatter(formatted);

    expect(parsed.frontmatter.name).toBe(original.name);
    expect(parsed.frontmatter.description).toBe(original.description);
    expect(parsed.body).toBe(body);
  });
});
