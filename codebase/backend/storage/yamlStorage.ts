/**
 * YAML Flow Storage
 * Implements YAML-based flow storage and project serialization.
 * Sourced & adapted from Rivet's project serialization specs - MIT License
 */

import yaml from 'yaml';
import type { ChartNode, NodeConnection } from '../nodes/contract/index.js';

export interface FlowGraphMetadata {
  id: string;
  name: string;
  description?: string;
  created?: string;
  updated?: string;
  version?: string;
}

export interface FlowGraph {
  metadata: FlowGraphMetadata;
  nodes: ChartNode[];
  connections: NodeConnection[];
}

export interface ProjectFlow {
  version: string;
  metadata: {
    id: string;
    title: string;
    description: string;
  };
  mainGraphId: string;
  graphs: Record<string, FlowGraph>;
}

/**
 * Serializes a FlowGraph or ProjectFlow object to a valid YAML string.
 */
export function serializeFlowToYaml(flow: FlowGraph | ProjectFlow): string {
  return yaml.stringify(flow, {
    indent: 2,
    lineWidth: 0,
    sortMapEntries: true,
  });
}

/**
 * Deserializes a YAML string into a validated FlowGraph object.
 */
export function deserializeFlowFromYaml(yamlString: string): FlowGraph {
  if (!yamlString || typeof yamlString !== 'string') {
    throw new Error('Invalid input: Expected non-empty YAML string.');
  }

  const parsed = yaml.parse(yamlString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Failed to parse YAML: root object is empty or invalid.');
  }

  // Handle both single graph or full project flow YAML
  let graph: FlowGraph;
  if ('graphs' in parsed && parsed.mainGraphId && parsed.graphs[parsed.mainGraphId]) {
    graph = parsed.graphs[parsed.mainGraphId];
  } else if ('nodes' in parsed && 'connections' in parsed) {
    graph = parsed as FlowGraph;
  } else {
    throw new Error('YAML document does not contain valid flow nodes and connections.');
  }

  // Ensure arrays exist
  if (!Array.isArray(graph.nodes)) {
    graph.nodes = [];
  }
  if (!Array.isArray(graph.connections)) {
    graph.connections = [];
  }
  if (!graph.metadata) {
    graph.metadata = {
      id: 'default-graph',
      name: 'Loaded Graph',
    };
  }

  return graph;
}

/**
 * Validates whether a YAML string represents a syntactically and structurally sound flow.
 */
export function validateFlowYaml(yamlString: string): { valid: boolean; error?: string } {
  try {
    deserializeFlowFromYaml(yamlString);
    return { valid: true };
  } catch (err) {
    return { valid: false, error: err instanceof Error ? err.message : String(err) };
  }
}
