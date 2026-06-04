import React, { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import ReactFlow, { Background, Controls, BackgroundVariant, EdgeLabelRenderer, ReactFlowProvider, useReactFlow, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { useCanvasStore } from './store/canvasStore'
import { useVaultStore } from './store/vault.store'
import ModelNode from './nodes/ModelNode'
import VaultNode from './nodes/VaultNode'
import ProviderNode from './nodes/ProviderNode'
import BiDirectionalEdge from './edges/BiDirectionalEdge'
import TopBar from './components/TopBar'
import Sidebar from './components/Sidebar'
import ModelsPage from './pages/ModelsPage'
import ModelTestPage from './pages/ModelTestPage'
import { ProviderId } from './data/providers'
import { useChangelogSync } from './hooks/useChangelogSync'

// Enable auto model change detection
const ChangelogInit = () => { useChangelogSync(); return null }

const nodeTypes = {
  'model-node': ModelNode,
  'vault-node': VaultNode,
  'provider-node': ProviderNode,
}

const edgeTypes = {
  bidirectional: BiDirectionalEdge,
}

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { strokeWidth: 1.5, opacity: 0.7 },
}

function KeyParticle() {
  const animating = useCanvasStore(s => s.animatingKeyIngress)
  const nodes = useCanvasStore(s => s.nodes)
  if (!animating) return null

  const providerNode = nodes.find(n => (n.data as any)?.providerId === animating)
  const vaultNode = nodes.find(n => n.id === 'vault')
  if (!providerNode || !vaultNode) return null

  const dx = vaultNode.position.x - providerNode.position.x
  const dy = vaultNode.position.y - providerNode.position.y

  return (
    <EdgeLabelRenderer>
      <div
        className="key-particle nodrag nopan"
        style={{
          position: 'absolute',
          left: providerNode.position.x + 100,
          top: providerNode.position.y + 28,
          '--dx': `${dx}px`,
          '--dy': `${dy}px`,
        } as React.CSSProperties}
      />
    </EdgeLabelRenderer>
  )
}

function Canvas() {
  const { nodes, edges, onNodesChange, onEdgesChange, toggleExpand, dropProvider, init } = useCanvasStore()
  const { fitView } = useReactFlow()
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null)
  const initialized = useRef(false)

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      init()
      useVaultStore.getState().refreshEntries()
      setTimeout(() => fitView({ padding: 0.25, duration: 600 }), 150)
    }
  }, [])

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const providerId = e.dataTransfer.getData('application/ra1-provider') as ProviderId
    if (!providerId || !rfInstance) return

    const bounds = (e.target as HTMLElement).closest('.react-flow')?.getBoundingClientRect()
    if (!bounds) return

    const position = rfInstance.project({
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top,
    })

    dropProvider(providerId, position)
  }, [rfInstance, dropProvider])

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={(_, node) => toggleExpand(node.id)}
      onInit={setRfInstance}
      onDragOver={onDragOver}
      onDrop={onDrop}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      defaultEdgeOptions={defaultEdgeOptions}
      fitView={false}
      panOnDrag
      zoomOnScroll
      minZoom={0.2}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
    >
      <Background variant={BackgroundVariant.Dots} color="#1e1e2e" gap={24} size={1.5} />
      <Controls position="bottom-left" />
      <KeyParticle />
    </ReactFlow>
  )
}

export default function App() {
  const [page, setPage] = useState<'canvas' | 'models' | 'model-test'>('canvas')

  return (
    <ReactFlowProvider>
      <ChangelogInit />
      <div className="app-layout">
        <TopBar page={page} onPageChange={setPage} />
        <div className="app-body">
          <Sidebar />
          {page === 'canvas' ? (
            <div className="app-canvas-wrapper">
              <Canvas />
            </div>
          ) : page === 'models' ? (
            <ModelsPage />
          ) : (
            <ModelTestPage />
          )}
        </div>
      </div>
    </ReactFlowProvider>
  )
}