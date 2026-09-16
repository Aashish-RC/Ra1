# Node Contract Specification & Implementation Guide

This document specifies the TypeScript node contract for the visual canvas system, modeled directly on Ironclad Rivet's core architecture (`packages/core/src/model/NodeBase.ts` and `NodeDefinition.ts`).

---

## 1. Core Interfaces & Field Documentation

### `NodeBase` & `ChartNode`
Every node placed on the canvas satisfies the `NodeBase` contract:

```typescript
export interface NodeBase {
  type: string;
  id: NodeId;
  title: string;
  description?: string;
  isSplitRun?: boolean;
  isSplitSequential?: boolean;
  splitRunMax?: number;
  visualData: VisualData;
  data: unknown;
  variants?: ChartNodeVariant<unknown>[];
  tests?: NodeTestGroup[];
  disabled?: boolean;
  isConditional?: boolean;
}
```

#### Field Details:
- **`type`** (`string`, required): Unique string identifying the node implementation in the registry (e.g. `'code'`, `'chat'`, `'text'`, `'match'`).
- **`id`** (`NodeId`, required): UUID or nanoid string uniquely identifying this specific node instance within a graph.
- **`title`** (`string`, required): Label displayed in the node header bar on the canvas.
- **`description`** (`string`, optional): Optional developer notes, markdown documentation, or user comments for the node.
- **`isSplitRun`** (`boolean`, optional): When enabled, if an input receives an array, the node executes for each item in the array.
- **`isSplitSequential`** (`boolean`, optional): Controls whether split executions run in sequential order rather than in parallel.
- **`splitRunMax`** (`number`, optional): Upper cap on the concurrency of split executions.
- **`visualData`** (`VisualData`, required): Contains the layout coordinates on the canvas:
  - `x`, `y`: Top-left canvas coordinates.
  - `width`, `height`: Dimension overrides.
  - `color`: Custom accent colors `{ border: string; bg: string }`.
  - `zIndex`: Rendering stacking order.
- **`data`** (`unknown`, required): Strongly-typed node configuration state (e.g. CodeNode code string, ChatNode model settings, etc.).
- **`variants`** (`ChartNodeVariant[]`, optional): Alternative data configurations for prompt evaluation or A/B testing.
- **`tests`** (`NodeTestGroup[]`, optional): Inline assertions and test criteria evaluated by the testing framework.
- **`disabled`** (`boolean`, optional): If true, node execution is bypassed during flow evaluation.
- **`isConditional`** (`boolean`, optional): When true, exposes the special `$if` boolean input port.

---

### `NodeInputDefinition` & `NodeOutputDefinition`

Ports define the connection endpoints on the node:

```typescript
export interface NodeInputDefinition {
  id: PortId;
  title: string;
  dataType: string | readonly string[];
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  coerced?: boolean;
  data?: unknown;
}

export interface NodeOutputDefinition {
  id: PortId;
  title: string;
  dataType: string | readonly string[];
  defaultValue?: unknown;
  description?: string;
  data?: unknown;
}
```

#### Field Details:
- **`id`** (`PortId`, required): Identifier unique among ports of the same node (e.g., `'input'`, `'code'`, `'output'`).
- **`title`** (`string`, required): Label displayed alongside the port dot on the canvas.
- **`dataType`** (`string | string[]`, required): Type constraint (`'string'`, `'number'`, `'boolean'`, `'object'`, `'chat-message'`, `'any'`, etc.).
- **`required`** (`boolean`, optional): If true, execution blocks if this input does not receive a connection or value.
- **`defaultValue`** (`unknown`, optional): Fallback value used when the port is not wired.
- **`description`** (`string`, optional): Tooltip text explaining the port's role.
- **`coerced`** (`boolean`, optional): Whether incoming values are automatically converted into the target dataType.

---

### `NodeConnection`
Wires between ports are defined by:

```typescript
export interface NodeConnection {
  outputNodeId: NodeId;
  outputId: PortId;
  inputNodeId: NodeId;
  inputId: PortId;
}
```
- **`outputNodeId`**: Upstream source node emitting data.
- **`outputId`**: Upstream port id.
- **`inputNodeId`**: Downstream target node receiving data.
- **`inputId`**: Downstream input port id.

---

## 2. How to Implement a New Node Type

To create a new node type, follow these 3 steps:

### Step 1: Define the Data Interface and ChartNode Type
```typescript
import { ChartNode, NodeImpl, NodeDefinition, nodeDefinition } from '../contract/index.js';

export interface MyCustomNodeData {
  multiplier: number;
  prefixText: string;
}

export type MyCustomNode = ChartNode<'myCustom', MyCustomNodeData>;
```

### Step 2: Implement the Node Class Extending `NodeImpl`
```typescript
import {
  NodeImpl,
  NodeInputDefinition,
  NodeOutputDefinition,
  Inputs,
  Outputs,
  InternalProcessContext,
} from '../contract/index.js';
import { nanoid } from 'nanoid';

export class MyCustomNodeImpl extends NodeImpl<MyCustomNode> {
  static create(): MyCustomNode {
    return {
      type: 'myCustom',
      id: nanoid(),
      title: 'My Custom Node',
      visualData: { x: 100, y: 100 },
      data: {
        multiplier: 2,
        prefixText: 'Result: ',
      },
    };
  }

  getInputDefinitions(): NodeInputDefinition[] {
    return [
      {
        id: 'value',
        title: 'Input Value',
        dataType: 'number',
        required: true,
        description: 'Number to multiply',
      },
    ];
  }

  getOutputDefinitions(): NodeOutputDefinition[] {
    return [
      {
        id: 'result',
        title: 'Formatted Output',
        dataType: 'string',
        description: 'Multiplied value formatted as text',
      },
    ];
  }

  async process(inputs: Inputs, context: InternalProcessContext): Promise<Outputs> {
    const val = Number(inputs.value ?? 0);
    const calculated = val * this.data.multiplier;
    return {
      result: `${this.data.prefixText}${calculated}`,
    };
  }
}
```

### Step 3: Register the Node Definition
```typescript
import { nodeDefinition } from '../contract/index.js';

export const myCustomNode = nodeDefinition(
  MyCustomNodeImpl,
  'My Custom Node',
  'Data Manipulation',
  'Multiplies an input number and formats it as text.'
);

// In registry:
registry.register(myCustomNode);
```
