import { useEffect, useRef, useState, useCallback } from 'react'
import './App.css'
import ReactFlow, { Background, Controls, BackgroundVariant, ReactFlowProvider, useReactFlow, ReactFlowInstance } from 'reactflow'
import 'reactflow/dist/style.css'
import { useCanvasStore } from './store/canvasStore'
import { useVaultStore } from './store/vault.store'
import ModelNode from './nodes/ModelNode'
import VaultNode from './nodes/VaultNode'
import ProviderNode from './nodes/ProviderNode'
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

const defaultEdgeOptions = {
  type: 'smoothstep',
  style: { strokeWidth: 1.5, opacity: 0.7 },
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