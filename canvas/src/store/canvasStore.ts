import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, XYPosition } from 'reactflow'
import { ProviderId } from '../data/providers'
import { useModelStore } from './model.store'
import { useVaultStore } from './vault.store'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  expandedIds: Set<string>
  init: () => void
  toggleExpand: (id: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  dropProvider: (providerId: ProviderId, position: XYPosition) => void
  removeProviderNode: (nodeId: string) => void
}

function systemNode(id: string, type: string, x: number, y: number): Node {
  return { id, type, position: { x, y }, data: {}, draggable: false, selectable: true, deletable: false }
}

function edgeStyle(color: string, animated = false): Partial<Edge> {
  return {
    type: 'smoothstep',
    animated,
    style: { stroke: color, strokeWidth: 1.5, opacity: 0.8 },
  }
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  expandedIds: new Set(),

  init: () => {
    const nodes: Node[] = [
      systemNode('model', 'model-node', 400, 200),
      systemNode('vault', 'vault-node', 120, 200),
    ]
    const edges: Edge[] = [
      { id: 'e-vault-model', source: 'vault', target: 'model', ...edgeStyle('#f8961e') },
    ]
    set({ nodes, edges })
  },

  toggleExpand: (id) => {
    const next = new Set(get().expandedIds)
    const isNowOpen = !next.has(id)
    if (isNowOpen) { next.add(id) } else { next.delete(id) }

    if (id === 'model') useModelStore.getState().setModelExpanded(isNowOpen)
    if (id === 'vault') useVaultStore.getState().setExpanded(isNowOpen)

    set({ expandedIds: next })
  },

  onNodesChange: (changes) => {
    const filtered = changes.filter(c => {
      if (c.type === 'remove') {
        const node = get().nodes.find(n => n.id === (c as any).id)
        return node?.deletable !== false
      }
      return true
    })
    set(s => ({ nodes: applyNodeChanges(filtered, s.nodes) }))
  },

  onEdgesChange: (changes) => {
    set(s => ({ edges: applyEdgeChanges(changes, s.edges) }))
  },

  dropProvider: (providerId, position) => {
    const placed = useModelStore.getState().placeProvider(providerId)
    const nodeId = placed.id

    const newNode: Node = {
      id: nodeId,
      type: 'provider-node',
      position,
      data: { nodeId, providerId },
      draggable: true,
      selectable: true,
      deletable: true,
    }

    const newEdge: Edge = {
      id: `e-${nodeId}-model`,
      source: nodeId,
      target: 'model',
      ...edgeStyle('#6c63ff', true),
    }

    const next = new Set(get().expandedIds)
    next.add(nodeId)

    set(s => ({
      nodes: [...s.nodes, newNode],
      edges: [...s.edges, newEdge],
      expandedIds: next,
    }))
  },

  removeProviderNode: (nodeId) => {
    useModelStore.getState().removeProvider(nodeId)
    useVaultStore.getState().revokeKey(nodeId.replace('provider-', ''))
    set(s => ({
      nodes: s.nodes.filter(n => n.id !== nodeId),
      edges: s.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      expandedIds: new Set([...s.expandedIds].filter(id => id !== nodeId)),
    }))
  },
}))