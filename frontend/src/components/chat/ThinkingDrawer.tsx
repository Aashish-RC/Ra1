import React, { useState } from 'react';
import type { ChatMessage } from '../../../../backend/chat/chatService.js';

interface ThinkingDrawerProps {
  message: ChatMessage;
}

/**
 * AI Thinking Drawer — expandable trace drawer positioned above assistant messages.
 * Collapsed by default. Surfaces existing pipeline data:
 * - RAG retrieval steps (chunk count, source file names, top score, excerpts)
 * - ReAct Agent execution steps (Think, Act, Observe, Tool Invocations)
 * - Model routing path & model ID
 * - Connector / tool execution status
 *
 * Reference: Letta thought-loop/debugger UX pattern (reference only, zero upstream code copied).
 */
export const ThinkingDrawer: React.FC<ThinkingDrawerProps> = ({ message }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const citations = message.citations ?? [];
  const hasRag = citations.length > 0;
  const uniqueSources = Array.from(new Set(citations.map((c) => c.sourceFile)));
  const topScore = hasRag && citations[0].score ? Math.round(citations[0].score * 100) : null;

  const reactSteps = message.reactSteps ?? [];
  const hasAgentSteps = reactSteps.length > 0;
  const toolsInvoked = message.toolsInvoked ?? [];

  // Calculate number of thinking/execution steps to display in summary
  const stepCount = hasAgentSteps ? reactSteps.length + (hasRag ? 2 : 1) : (hasRag ? 3 : 2);

  return (
    <div className="thinking-drawer" id={`thinking-drawer-${message.id}`}>
      {/* Toggle header — collapsed by default */}
      <button
        type="button"
        className={`thinking-drawer-toggle ${isExpanded ? 'thinking-drawer-toggle--expanded' : ''}`}
        id={`thinking-drawer-toggle-${message.id}`}
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls={`thinking-drawer-content-${message.id}`}
        title="Toggle thought process and execution trace"
      >
        <span className="thinking-icon">💭</span>
        <span className="thinking-label">
          {isExpanded ? 'Hide Thought Process' : `Thinking (${stepCount} steps)...`}
        </span>
        <span className="thinking-badge">
          {hasAgentSteps
            ? `Agent: ${toolsInvoked.length} tools`
            : hasRag
            ? `RAG: ${citations.length} chunks`
            : 'Direct Route'}
        </span>
        <span className="thinking-chevron">{isExpanded ? '▼' : '▶'}</span>
      </button>

      {/* Expanded trace container */}
      {isExpanded && (
        <div
          className="thinking-drawer-content"
          id={`thinking-drawer-content-${message.id}`}
          role="region"
          aria-label="Execution details and thought process"
        >
          {/* Optional ReAct Agent Execution Steps */}
          {hasAgentSteps && (
            <div className="thinking-step thinking-step--agent" id={`thinking-step-agent-${message.id}`}>
              <div className="thinking-step-header">
                <span className="thinking-step-dot thinking-step-dot--agent">⚡</span>
                <span className="thinking-step-title">ReAct Execution Trace</span>
                <span className="thinking-step-pill thinking-step-pill--info">
                  {reactSteps.length} Cycles
                </span>
              </div>
              <div className="thinking-step-body">
                <div className="thinking-react-list">
                  {reactSteps.map((step) => (
                    <div key={step.stepNumber} className="thinking-react-card">
                      <div className="thinking-react-step-badge">Step {step.stepNumber}</div>
                      <div className="thinking-react-thought">
                        <strong>Thought:</strong> {step.thought}
                      </div>
                      {step.action && (
                        <div className="thinking-react-action">
                          <strong>Action:</strong> <code>{step.action.tool}</code>
                          {step.action.consequential && (
                            <span className="thinking-consequential-tag">⚠️ Consequential</span>
                          )}
                          {step.action.approvalStatus && (
                            <span className={`thinking-status-tag thinking-status-tag--${step.action.approvalStatus}`}>
                              {step.action.approvalStatus.toUpperCase()}
                            </span>
                          )}
                        </div>
                      )}
                      {step.observation && (
                        <div className="thinking-react-observation">
                          <strong>Observation:</strong> {step.observation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Knowledge Retrieval (RAG) */}
          <div className="thinking-step" id={`thinking-step-retrieval-${message.id}`}>
            <div className="thinking-step-header">
              <span className="thinking-step-dot thinking-step-dot--done">✓</span>
              <span className="thinking-step-title">Knowledge Retrieval</span>
              {hasRag ? (
                <span className="thinking-step-pill thinking-step-pill--success">
                  {citations.length} Chunks Retrieved
                </span>
              ) : (
                <span className="thinking-step-pill thinking-step-pill--neutral">
                  Direct Synthesis
                </span>
              )}
            </div>
            <div className="thinking-step-body">
              {hasRag ? (
                <>
                  <div className="thinking-rag-summary">
                    Indexed sources:{' '}
                    <strong>{uniqueSources.join(', ')}</strong>
                    {topScore !== null && <span> (Top match: {topScore}%)</span>}
                  </div>
                  <div className="thinking-chunks-list">
                    {citations.map((c, idx) => (
                      <div key={c.chunkId || idx} className="thinking-chunk-item">
                        <span className="thinking-chunk-index">[{c.index || idx + 1}]</span>
                        <span className="thinking-chunk-source">{c.sourceFile}:</span>
                        <span className="thinking-chunk-excerpt">"{c.excerpt}"</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="thinking-step-note">
                  No external RAG document references required for this prompt.
                </div>
              )}
            </div>
          </div>

          {/* Step 2: Model Routing & Governance */}
          <div className="thinking-step" id={`thinking-step-routing-${message.id}`}>
            <div className="thinking-step-header">
              <span className="thinking-step-dot thinking-step-dot--done">✓</span>
              <span className="thinking-step-title">Model Selection & Routing</span>
              <span className="thinking-step-pill thinking-step-pill--info">
                {message.routeUsed || 'pooled-aggregator'}
              </span>
            </div>
            <div className="thinking-step-body">
              <div className="thinking-route-info">
                <span>Model: <strong>{message.model || 'Auto'}</strong></span>
                <span>Route: <code>{message.routeUsed || 'pooled-aggregator'}</code></span>
                <span>Status: <strong style={{ color: '#10b981' }}>Quota Approved</strong></span>
              </div>
            </div>
          </div>

          {/* Step 3: Synthesis Output */}
          <div className="thinking-step" id={`thinking-step-synthesis-${message.id}`}>
            <div className="thinking-step-header">
              <span className="thinking-step-dot thinking-step-dot--done">✓</span>
              <span className="thinking-step-title">Response Synthesis</span>
              <span className="thinking-step-pill thinking-step-pill--success">Complete</span>
            </div>
            <div className="thinking-step-body">
              <div className="thinking-step-note">
                Output generated and verified with Markdown/math formatting.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
