/**
 * Trivet Test Case Format Validator
 * Sourced & ported from Rivet (packages/trivet/src/validateTestCaseFormat.ts) - MIT License
 */

import type { TrivetTestCase } from './trivetTypes.js';

export function validateTestCaseFormat(testCase: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!testCase || typeof testCase !== 'object') {
    return { valid: false, errors: ['Test case must be an object.'] };
  }

  const tc = testCase as Partial<TrivetTestCase>;

  if (!tc.id || typeof tc.id !== 'string') {
    errors.push('Test case must have a valid string "id".');
  }

  if (!tc.inputs || typeof tc.inputs !== 'object' || Array.isArray(tc.inputs)) {
    errors.push('Test case must have an "inputs" object dictionary.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
