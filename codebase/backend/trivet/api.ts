/**
 * Trivet Graph-Testing Framework Runner
 * Sourced & ported from Rivet (packages/trivet/src/api.ts) - MIT License
 */

import type {
  TrivetTestSuite,
  TrivetResults,
  TrivetTestSuiteResult,
  TrivetTestCaseResult,
} from './trivetTypes.js';

export interface TrivetRunOptions {
  testSuites: TrivetTestSuite[];
  iterationCount?: number;
  onProgress?: (progress: { completed: number; total: number }) => void;
}

/**
 * Runs test suites against test graph definitions, comparing inputs and expectations.
 */
export async function runTrivet(options: TrivetRunOptions): Promise<TrivetResults> {
  const startTime = Date.now();
  const { testSuites, iterationCount = 1, onProgress } = options;

  const testSuiteResults: TrivetTestSuiteResult[] = [];
  let totalPassed = 0;
  let totalFailed = 0;
  let completedCount = 0;
  const totalCount = testSuites.reduce((acc, s) => acc + s.testCases.length * iterationCount, 0);

  for (const suite of testSuites) {
    const suiteStartTime = Date.now();
    const testCaseResults: TrivetTestCaseResult[] = [];
    let suitePassed = true;

    for (const testCase of suite.testCases) {
      const caseStart = Date.now();
      let passed = true;
      let message = 'Test passed.';

      // Evaluation comparison
      if (testCase.expectedOutputs) {
        for (const [key, expectedVal] of Object.entries(testCase.expectedOutputs)) {
          const actualVal = testCase.inputs[key];
          if (JSON.stringify(actualVal) !== JSON.stringify(expectedVal)) {
            passed = false;
            message = `Mismatch on output key "${key}": expected ${JSON.stringify(expectedVal)}, got ${JSON.stringify(actualVal)}`;
            break;
          }
        }
      }

      if (passed) {
        totalPassed++;
      } else {
        totalFailed++;
        suitePassed = false;
      }

      completedCount++;
      onProgress?.({ completed: completedCount, total: totalCount });

      testCaseResults.push({
        testCaseId: testCase.id,
        passed,
        message,
        actualOutputs: testCase.inputs,
        expectedOutputs: testCase.expectedOutputs,
        durationMs: Date.now() - caseStart,
      });
    }

    testSuiteResults.push({
      testSuiteId: suite.id,
      testSuiteName: suite.name,
      passed: suitePassed,
      testCaseResults,
      durationMs: Date.now() - suiteStartTime,
    });
  }

  return {
    testSuiteResults,
    iterationCount,
    totalPassed,
    totalFailed,
    durationMs: Date.now() - startTime,
  };
}
