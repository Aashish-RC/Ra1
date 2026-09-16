/**
 * Trivet Validation Graph Format Validator
 * Sourced & ported from Rivet (packages/trivet/src/validateValidationGraphFormat.ts) - MIT License
 */

import type { FlowGraph } from '../storage/yamlStorage.js';

export function validateValidationGraphFormat(graph: FlowGraph): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!graph || typeof graph !== 'object') {
    return { valid: false, errors: ['Validation graph must be a valid graph object.'] };
  }

  // Must have graph inputs for expected and actual
  const inputNodes = graph.nodes.filter((n) => n.type === 'graphInput');
  const inputIds = inputNodes.map((n) => (n.data as any)?.id || n.id);

  if (!inputIds.includes('input') && !inputIds.includes('actual') && !inputIds.includes('output')) {
    errors.push('Validation graph should define an input port for the candidate output.');
  }

  // Must have graph output for pass/fail boolean
  const outputNodes = graph.nodes.filter((n) => n.type === 'graphOutput');
  if (outputNodes.length === 0) {
    errors.push('Validation graph must contain at least one GraphOutput node.');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
