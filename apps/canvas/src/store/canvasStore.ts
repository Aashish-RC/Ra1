import { create } from 'zustand'
import { Node, Edge, applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, XYPosition } from 'reactflow'
import { ProviderId } from '../data/providers'
import { useModelStore } from './model.store'
import { useVaultStore } from './vault.store'

interface CanvasStore {
  nodes: Node[]
  edges: Edge[]
  expandedIds: Set<string>
  vaultProviderEdges: Record<string, Edge>    // keyed by providerId
  vaultModelEdge: Edge | null                  // the single vault↔model edge
  animatingKeyIngress: string | null           // providerId currently animating a key drop

  init: () => void
  toggleExpand: (id: string) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  dropProvider: (providerId: ProviderId, position: XYPosition) => void
  removeProviderNode: (nodeId: string) => void
  onKeyStored: (providerId: string) => void
  onKeyRevoked: (providerId: string) => void
  ensureVaultModelEdge: () => void
  setKeyDropAnimationComplete: () => void
}

function systemNode(id: string, type: string, x: number, y: number): Node {
  return { id, type, position: { x, y }, data: {}, draggable: false, selectable: true, deletable: false }
}

export const useCanvasStore = create<CanvasStore>((set, get) => ({
  nodes: [],
  edges: [],
  expandedIds: new Set(),
  vaultProviderEdges: {},
  vaultModelEdge: null,
  animatingKeyIngress: null,

  init: () => {
    const nodes: Node[] = [
      systemNode('model', 'model-node', 400, 200),
      systemNode('vault', 'vault-node', 120, 200),
    ]
    set({ nodes, edges: [], vaultProviderEdges: {}, vaultModelEdge: null })
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

    const next = new Set(get().expandedIds)
    next.add(nodeId)

    set(s => ({
      nodes: [...s.nodes, newNode],
      edges: [...s.edges],
      expandedIds: next,
    }))

    // Ensure vault↔model edge exists if not already
    get().ensureVaultModelEdge()
  },

  ensureVaultModelEdge: () => {
    const { nodes, vaultModelEdge } = get()
    const hasVault = nodes.some(n => n.id === 'vault')
    const hasModel = nodes.some(n => n.id === 'model')

    if (!hasVault || !hasModel) {
      // Remove the bidirectional edge if either node is missing
      if (vaultModelEdge) {
        set(s => ({
          edges: s.edges.filter(e => e.id !== 'vault-model-permanent'),
          vaultModelEdge: null,
        }))
      }
      return
    }

    // Edge already exists
    if (vaultModelEdge) return

    const newEdge: Edge = {
      id: 'vault-model-permanent',
      source: 'vault',
      target: 'model',
      sourceHandle: 'model-vault-right',
      targetHandle: 'vault-link-left',
      type: 'bidirectional',
      style: { stroke: '#6c63ff55', strokeWidth: 1.5 },
    }

    set(s => ({
      edges: [...s.edges.filter(e => e.id !== 'vault-model-permanent'), newEdge],
      vaultModelEdge: newEdge,
    }))
  },

  onKeyStored: (providerId: string) => {
    const { nodes, vaultProviderEdges } = get()

    // Find the provider node for this providerId
    const providerNode = nodes.find(n => {
      const data = n.data as { providerId?: string } | undefined
      return data?.providerId === providerId && n.type === 'provider-node'
    })
    if (!providerNode) return

    const edgeId = `vault-provider-${providerId}`

    // Create or update the vault-provider edge
    const newEdge: Edge = {
      id: edgeId,
      source: providerNode.id,
      target: 'vault',
      sourceHandle: 'key-out',
      targetHandle: 'vault-in',
      type: 'smoothstep',
      animated: true,
      style: {
        stroke: '#f8961e',
        strokeWidth: 1.5,
        strokeDasharray: '5 3',
        opacity: 1,
      },
      className: 'animated-dash',
    }

    const updatedVaultProviderEdges = {
      ...vaultProviderEdges,
      [providerId]: newEdge,
    }

    set(s => ({
      edges: [...s.edges.filter(e => e.id !== edgeId), newEdge],
      vaultProviderEdges: updatedVaultProviderEdges,
      animatingKeyIngress: providerId,
    }))

    // Ensure vault↔model edge exists
    get().ensureVaultModelEdge()
  },

  onKeyRevoked: (providerId: string) => {
    const edgeId = `vault-provider-${providerId}`
    const { vaultProviderEdges } = get()

    const updated = { ...vaultProviderEdges }
    delete updated[providerId]

    set(s => ({
      edges: s.edges.filter(e => e.id !== edgeId),
      vaultProviderEdges: updated,
    }))
  },

  setKeyDropAnimationComplete: () => {
    set({ animatingKeyIngress: null })
  },

  removeProviderNode: (nodeId) => {
    useModelStore.getState().removeProvider(nodeId)

    // Find the providerId to revoke its key
    const node = get().nodes.find(n => n.id === nodeId)
    const providerId = node?.data?.providerId as string | undefined
    if (providerId) {
      useVaultStore.getState().revokeKey(providerId)
      // Also clean up the vault-provider edge
      get().onKeyRevoked(providerId)
    }

    set(s => ({
      nodes: s.nodes.filter(n => n.id !== nodeId),
      edges: s.edges.filter(e => e.source !== nodeId && e.target !== nodeId),
      expandedIds: new Set([...s.expandedIds].filter(id => id !== nodeId)),
    }))
  },
}))