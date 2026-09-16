/**
 * Trivet Graph-Testing Framework Types
 * Sourced & ported from Rivet (packages/trivet/src/trivetTypes.ts) - MIT License
 */

export interface TrivetTestCase {
  id: string;
  description?: string;
  inputs: Record<string, unknown>;
  expectedOutputs?: Record<string, unknown>;
}

export interface TrivetTestSuite {
  id: string;
  name: string;
  description?: string;
  testGraph: string;
  validationGraph: string;
  testCases: TrivetTestCase[];
}

export interface TrivetTestCaseResult {
  testCaseId: string;
  passed: boolean;
  message?: string;
  actualOutputs?: Record<string, unknown>;
  expectedOutputs?: Record<string, unknown>;
  durationMs: number;
}

export interface TrivetTestSuiteResult {
  testSuiteId: string;
  testSuiteName: string;
  passed: boolean;
  testCaseResults: TrivetTestCaseResult[];
  durationMs: number;
}

export interface TrivetResults {
  testSuiteResults: TrivetTestSuiteResult[];
  iterationCount: number;
  totalPassed: number;
  totalFailed: number;
  durationMs: number;
}
