import { useRef, useEffect } from 'react'
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getBezierPath } from 'reactflow'
import './BiDirectionalEdge.css'

export default function BiDirectionalEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
}: EdgeProps) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  })

  const labelId = `bi-label-${id}`
  const labelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = labelRef.current
    if (!el) return
    el.style.setProperty('--bi-label-x', `${(sourceX + targetX) / 2}px`)
    el.style.setProperty('--bi-label-y', `${(sourceY + targetY) / 2}px`)
  }, [sourceX, sourceY, targetX, targetY])

  return (
    <>
      <defs>
        <marker id="arrowStart" markerWidth={8} markerHeight={6} refX={2} refY={3} orient="auto-start-reverse">
          <polygon points="0 0, 8 3, 0 6" fill="#6c63ff88" />
        </marker>
        <marker id="arrowEnd" markerWidth={8} markerHeight={6} refX={6} refY={3} orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="#6c63ff88" />
        </marker>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#6c63ff55',
          strokeWidth: 1.5,
          markerStart: 'url(#arrowStart)',
          markerEnd: 'url(#arrowEnd)',
        }}
      />
      <EdgeLabelRenderer>
        <div
          id={labelId}
          ref={labelRef}
          className="bi-edge-label nodrag nopan"
        >
          <div className="bi-edge-label-key">🔑 key storage</div>
          <div className="bi-edge-label-access">⚡ access on request</div>
        </div>
      </EdgeLabelRenderer>
    </>
  )
}
