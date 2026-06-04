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
  onKeyStored: (providerId: string) => void
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
    set({ nodes, edges: [] })  // no edges on init — edges appear as providers are added
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

    const providerToVault: Edge = {
      id: `e-${nodeId}-vault`,
      source: nodeId,
      target: 'vault',
      ...edgeStyle('#f8961e', false),   // orange, NOT animated until key saved
      style: { stroke: '#f8961e', strokeWidth: 1.5, strokeDasharray: '4 4', opacity: 0.6 },
    }

    const vaultToModel: Edge = {
      id: 'e-vault-model',
      source: 'vault',
      target: 'model',
      ...edgeStyle('#f8961e', false),   // starts non-animated
    }

    // Only add vault-model edge if it doesn't already exist
    const edges = get().edges
    const vaultModelExists = edges.some(e => e.id === 'e-vault-model')

    const next = new Set(get().expandedIds)
    next.add(nodeId)

    set(s => ({
      nodes: [...s.nodes, newNode],
      edges: [
        ...s.edges,
        providerToVault,
        ...(vaultModelExists ? [] : [vaultToModel]),
      ],
      expandedIds: next,
    }))
  },

  onKeyStored: (providerId: string) => {
    set(s => ({
      edges: s.edges.map(e => {
        // Animate the provider→vault edge for this provider
        if (e.source.includes(providerId) && e.target === 'vault') {
          return { ...e, animated: true, style: { stroke: '#f8961e', strokeWidth: 2, opacity: 1 } }
        }
        // Animate vault→model once any key is stored
        if (e.id === 'e-vault-model') {
          return { ...e, animated: true, style: { stroke: '#f8961e', strokeWidth: 2, opacity: 1 } }
        }
        return e
      })
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
