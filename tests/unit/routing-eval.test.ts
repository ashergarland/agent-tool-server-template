import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { serverInstructions } from '../../src/tools/guidance.js';
import { createToolRegistry } from '../../src/tools/registry.js';

const fixtureSchema = z.object({
  cases: z
    .array(
      z.object({
        id: z.string().min(1),
        request: z.string().min(1),
        expectedTool: z.string().min(1).nullable(),
        reason: z.string().min(1),
      }),
    )
    .min(6),
});

const fixtureUrl = new URL('../fixtures/routing-eval.json', import.meta.url);
const fixture = fixtureSchema.parse(JSON.parse(await readFile(fixtureUrl, 'utf8')));

describe('routing evaluation fixture', () => {
  it('uses unique identifiers and non-empty requests and reasons', () => {
    const ids = fixture.cases.map((testCase) => testCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const testCase of fixture.cases) {
      expect(testCase.request.trim().length).toBeGreaterThan(0);
      expect(testCase.reason.trim().length).toBeGreaterThan(0);
    }
  });

  it('references only registered tools and covers an out-of-scope case', () => {
    const registry = createToolRegistry();
    const names = new Set(registry.list().map((tool) => tool.name));
    for (const testCase of fixture.cases) {
      if (testCase.expectedTool !== null) expect(names).toContain(testCase.expectedTool);
    }
    expect(fixture.cases.some((testCase) => testCase.expectedTool === null)).toBe(true);
  });

  it('keeps every expected tool discoverable from the shared server instructions', () => {
    for (const testCase of fixture.cases) {
      if (testCase.expectedTool !== null)
        expect(serverInstructions).toContain(testCase.expectedTool);
    }
  });
});
