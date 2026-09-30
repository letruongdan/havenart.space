import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// Schema loader that works in both Vitest and Node environments
const __dirname = dirname(fileURLToPath(import.meta.url));
const loadSchema = (relPath: string) => {
  const fullPath = join(__dirname, relPath);
  if (!existsSync(fullPath)) {
    throw new Error(`Schema file not found at: ${fullPath}`);
  }
  return JSON.parse(readFileSync(fullPath, 'utf8'));
};

const taskSchemaPath = '../../.agents/contracts/task.schema.json';
const handoffSchemaPath = '../../.agents/contracts/handoff.schema.json';
const reviewSchemaPath = '../../.agents/contracts/review.schema.json';

// Test runner detection (Vitest vs Node:test fallback)
let describe: any;
let it: any;
let expect: any;
let Ajv: any;

try {
  const vitest = await import('vitest');
  describe = vitest.describe;
  it = vitest.it;
  expect = vitest.expect;
} catch {
  const nodeTest = await import('node:test');
  const assert = await import('node:assert/strict');
  describe = nodeTest.describe;
  it = nodeTest.it;
  expect = (actual: any) => ({
    toBeDefined: () => assert.ok(actual !== undefined && actual !== null, `Expected value to be defined`),
    toBeTruthy: () => assert.ok(actual, `Expected value to be truthy`),
    toBeFalsy: () => assert.ok(!actual, `Expected value to be falsy`),
    toBe: (expected: any) => assert.strictEqual(actual, expected)
  });
}

try {
  const ajvModule = await import('ajv');
  Ajv = ajvModule.default || ajvModule;
} catch {
  // Built-in JSON Schema Draft-07 / 2020-12 validator fallback
  Ajv = class JsonSchemaValidator {
    compile(schema: any) {
      if (!schema || typeof schema !== 'object') {
        throw new Error('Schema must be an object');
      }
      if (!schema.$schema) {
        throw new Error('Schema missing $schema declaration');
      }
      if (schema.type !== 'object') {
        throw new Error(`Expected schema type to be 'object', got ${schema.type}`);
      }
      if (!schema.properties || typeof schema.properties !== 'object') {
        throw new Error('Schema properties must be defined as an object');
      }
      if (!Array.isArray(schema.required) || schema.required.length === 0) {
        throw new Error('Schema required array must be defined and non-empty');
      }
      for (const req of schema.required) {
        if (!schema.properties[req]) {
          throw new Error(`Required property "${req}" is not defined in properties`);
        }
      }

      // Return validator function that verifies objects against this schema
      return (data: any) => {
        if (!data || typeof data !== 'object') return false;
        // Check required fields
        for (const req of schema.required) {
          if (data[req] === undefined || data[req] === null) return false;
        }
        // Check properties
        for (const [key, value] of Object.entries(data)) {
          const propDef = schema.properties[key];
          if (!propDef) {
            if (schema.additionalProperties === false) return false;
            continue;
          }
          if (propDef.enum && !propDef.enum.includes(value)) {
            return false;
          }
          if (propDef.type === 'string' && typeof value !== 'string') {
            return false;
          }
          if (propDef.type === 'array') {
            if (!Array.isArray(value)) return false;
            if (propDef.minItems && value.length < propDef.minItems) return false;
            if (propDef.items?.enum) {
              for (const item of value) {
                if (!propDef.items.enum.includes(item)) return false;
              }
            }
          }
        }
        return true;
      };
    }
  };
}

describe('Agent Contract Schemas', () => {
  const ajv = new Ajv();
  const taskSchema = loadSchema(taskSchemaPath);
  const handoffSchema = loadSchema(handoffSchemaPath);
  const reviewSchema = loadSchema(reviewSchemaPath);

  it('should compile valid task, handoff, and review schemas', () => {
    const taskValidator = ajv.compile(taskSchema);
    const handoffValidator = ajv.compile(handoffSchema);
    const reviewValidator = ajv.compile(reviewSchema);

    expect(taskValidator).toBeDefined();
    expect(handoffValidator).toBeDefined();
    expect(reviewValidator).toBeDefined();
  });

  it('should validate a compliant task contract and reject invalid task contracts', () => {
    const validateTask = ajv.compile(taskSchema);

    const validTask = {
      id: 'E3.2',
      title: 'Journal editor + autosave',
      owner: 'A4',
      reviewers: ['A1', 'A10'],
      depends_on: ['E3.1'],
      inputs: ['docs/spec/requirements-matrix.md#F4', 'src/lib/db/index.ts'],
      outputs: ['src/components/WritePanel.svelte', 'src/lib/db/drafts.ts'],
      acceptance: ['autosave after 2s idle', 'reload restores draft'],
      tests: ['tests/journal/autosave.spec.ts'],
      risk: 'medium',
      status: 'ready'
    };

    expect(validateTask(validTask)).toBeTruthy();

    // Invalid: missing required 'acceptance' field
    const invalidTaskMissingField = { ...validTask };
    delete (invalidTaskMissingField as any).acceptance;
    expect(validateTask(invalidTaskMissingField)).toBeFalsy();

    // Invalid: unknown agent role
    const invalidTaskBadOwner = { ...validTask, owner: 'UNKNOWN_AGENT' };
    expect(validateTask(invalidTaskBadOwner)).toBeFalsy();
  });

  it('should validate a compliant handoff contract and reject invalid handoff contracts', () => {
    const validateHandoff = ajv.compile(handoffSchema);

    const validHandoff = {
      task: 'E3.2',
      from: 'A4',
      to: 'A10',
      summary: 'Autosave implementation completed',
      changed: ['src/components/WritePanel.svelte', 'src/lib/db/drafts.ts'],
      known_limits: ['duplicate-tab conflict not handled yet'],
      test_command: ['npm run test:journal'],
      evidence: ['tests/reports/journal-autosave.json'],
      questions: ['verify tab-close recovery on WebKit']
    };

    expect(validateHandoff(validHandoff)).toBeTruthy();

    // Invalid: missing 'test_command'
    const invalidHandoff = { ...validHandoff };
    delete (invalidHandoff as any).test_command;
    expect(validateHandoff(invalidHandoff)).toBeFalsy();
  });

  it('should validate a compliant review contract and reject invalid verdicts', () => {
    const validateReview = ajv.compile(reviewSchema);

    const validReview = {
      task: 'E3.2',
      reviewer: 'A10',
      verdict: 'PASS',
      summary: 'Autosave recovery test passes consistently across browsers',
      checklist: {
        tests_passing: true,
        no_network_leaks: true,
        a11y_verified: true
      },
      findings: [],
      followups: ['Add stress test for 100 rapid keystrokes in Phase 2']
    };

    expect(validateReview(validReview)).toBeTruthy();

    // Invalid: ambiguous verdict like 'looks good' is forbidden by contract enum
    const invalidReviewBadVerdict = { ...validReview, verdict: 'LOOKS_GOOD' };
    expect(validateReview(invalidReviewBadVerdict)).toBeFalsy();
  });
});
