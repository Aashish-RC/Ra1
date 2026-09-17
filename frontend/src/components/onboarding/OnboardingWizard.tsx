import React, { useState, useMemo } from 'react';

export interface OnboardingPreferences {
  useCase: 'coding' | 'writing' | 'data' | 'general';
  answerStyle: 'concise' | 'detailed' | 'step_by_step';
  model: string;
  connectedApps: string[];
}

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (prefs: OnboardingPreferences) => void;
}

const USE_CASES = [
  {
    id: 'coding',
    title: 'Coding & Software Development',
    desc: 'Build apps, write code blocks, test in the live web sandbox.',
    icon: '💻',
  },
  {
    id: 'writing',
    title: 'Document & Content Writing',
    desc: 'Draft formatted rich text docs with Word and PDF export.',
    icon: '📝',
  },
  {
    id: 'data',
    title: 'Data Analysis & Spreadsheets',
    desc: 'Import CSV/Excel tables, run aggregations, render charts.',
    icon: '📊',
  },
  {
    id: 'general',
    title: 'General AI & Visual Canvas',
    desc: 'Visual flow programming, prompt chaining, AI assistant chat.',
    icon: '🚀',
  },
] as const;

const ANSWER_STYLES = [
  {
    id: 'concise',
    title: 'Concise & Direct',
    desc: 'Direct answers, bullet points, zero conversational filler.',
    sample: '• Optimal complexity: O(n log n)\n• Direct implementation provided below.',
  },
  {
    id: 'detailed',
    title: 'Detailed & Comprehensive',
    desc: 'In-depth explanations with architectural background and trade-offs.',
    sample: 'This approach balances memory overhead against runtime execution by caching intermediate states.',
  },
  {
    id: 'step_by_step',
    title: 'Step-by-Step Tutorial',
    desc: 'Numbered progression with clear validation at each phase.',
    sample: '1. Initialize data pipeline.\n2. Configure input transform.\n3. Verify output matches test contract.',
  },
] as const;

const MODEL_OPTIONS = [
  {
    id: '',
    title: 'Auto (Fast & Cost-Efficient)',
    desc: 'OmniRoute dynamic routing based on prompt complexity and token budget.',
    label: '🤖 Auto',
  },
  {
    id: 'anthropic/claude-3-5-sonnet',
    title: 'Claude 3.5 Sonnet',
    desc: 'Frontier model optimized for coding, structured parsing, and math.',
    label: 'Claude 3.5 Sonnet',
  },
  {
    id: 'openai/gpt-4o',
    title: 'GPT-4o',
    desc: 'Frontier reasoning model for multimodal and analytical tasks.',
    label: 'GPT-4o',
  },
] as const;

const APP_OPTIONS = [
  { id: 'slack', name: 'Slack Messaging', desc: 'Send channel messages and alert notifications', icon: '💬' },
  { id: 'http', name: 'HTTP Webhook', desc: 'Call external REST APIs and receive payloads', icon: '🌐' },
  { id: 'openai', name: 'OpenAI Completions', desc: 'Direct access to OpenAI model capabilities', icon: '⚡' },
  { id: 'rag', name: 'Local Documents (RAG)', desc: 'Index text, markdown, and PDF references', icon: '📄' },
] as const;

/**
 * Onboarding Wizard — optional, skippable 4-question setup modal with live preview.
 * Reference: LobeChat onboarding UX pattern (reference only, zero upstream code copied).
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Default initial preferences
  const [useCase, setUseCase] = useState<'coding' | 'writing' | 'data' | 'general'>('coding');
  const [answerStyle, setAnswerStyle] = useState<'concise' | 'detailed' | 'step_by_step'>('concise');
  const [model, setModel] = useState<string>('');
  const [connectedApps, setConnectedApps] = useState<string[]>(['rag']);

  const toggleApp = (appId: string) => {
    setConnectedApps((prev) =>
      prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId]
    );
  };

  const handleFinish = () => {
    onComplete({ useCase, answerStyle, model, connectedApps });
    onClose();
  };

  const handleSkip = () => {
    onComplete({
      useCase: 'general',
      answerStyle: 'concise',
      model: '',
      connectedApps: ['rag'],
    });
    onClose();
  };

  // Preview data helpers
  const activeStyleSample = useMemo(() => {
    return ANSWER_STYLES.find((s) => s.id === answerStyle)?.sample ?? '';
  }, [answerStyle]);

  const activeModelLabel = useMemo(() => {
    return MODEL_OPTIONS.find((m) => m.id === model)?.label ?? '🤖 Auto';
  }, [model]);

  if (!isOpen) return null;

  return (
    <div className="onboarding-overlay" id="onboarding-overlay" role="dialog" aria-modal="true" aria-label="Welcome Setup Wizard">
      <div className="onboarding-modal" id="onboarding-modal">
        {/* Header */}
        <div className="onboarding-header">
          <div className="onboarding-brand">
            <span className="onboarding-sparkle">✨</span>
            <span className="onboarding-title">Welcome to Ra1 Canvas Studio</span>
            <span className="onboarding-badge">Step {step} of 4</span>
          </div>
          <div className="onboarding-header-actions">
            <button
              type="button"
              className="onboarding-skip-btn"
              id="onboarding-skip-btn"
              onClick={handleSkip}
              title="Skip onboarding and use default settings"
            >
              Skip Setup
            </button>
            <button
              type="button"
              className="onboarding-close-btn"
              id="onboarding-close-btn"
              onClick={handleSkip}
              title="Close wizard"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Split View Body: Left Question / Right Live Preview */}
        <div className="onboarding-split-view">
          {/* Left Column: Question Options */}
          <div className="onboarding-question-pane" id="onboarding-question-pane">
            {step === 1 && (
              <div className="onboarding-step-view" id="onboarding-step-1">
                <h3 className="onboarding-step-heading">What is your primary use case?</h3>
                <p className="onboarding-step-subtext">Choose your focus to pre-configure optimal tools and panels.</p>
                <div className="onboarding-options-list">
                  {USE_CASES.map((uc) => (
                    <button
                      key={uc.id}
                      type="button"
                      className={`onboarding-option-card ${useCase === uc.id ? 'onboarding-option--selected' : ''}`}
                      id={`onboarding-usecase-${uc.id}`}
                      onClick={() => setUseCase(uc.id)}
                    >
                      <span className="onboarding-option-icon">{uc.icon}</span>
                      <div className="onboarding-option-info">
                        <span className="onboarding-option-title">{uc.title}</span>
                        <span className="onboarding-option-desc">{uc.desc}</span>
                      </div>
                      <span className="onboarding-radio-dot" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="onboarding-step-view" id="onboarding-step-2">
                <h3 className="onboarding-step-heading">How would you like the assistant to respond?</h3>
                <p className="onboarding-step-subtext">Tailors the default response format and reasoning depth.</p>
                <div className="onboarding-options-list">
                  {ANSWER_STYLES.map((as) => (
                    <button
                      key={as.id}
                      type="button"
                      className={`onboarding-option-card ${answerStyle === as.id ? 'onboarding-option--selected' : ''}`}
                      id={`onboarding-style-${as.id}`}
                      onClick={() => setAnswerStyle(as.id)}
                    >
                      <span className="onboarding-option-icon">💬</span>
                      <div className="onboarding-option-info">
                        <span className="onboarding-option-title">{as.title}</span>
                        <span className="onboarding-option-desc">{as.desc}</span>
                      </div>
                      <span className="onboarding-radio-dot" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="onboarding-step-view" id="onboarding-step-3">
                <h3 className="onboarding-step-heading">Select default AI model powering</h3>
                <p className="onboarding-step-subtext">You can change models anytime via the chat dropdown.</p>
                <div className="onboarding-options-list">
                  {MODEL_OPTIONS.map((mo) => (
                    <button
                      key={mo.id || 'auto'}
                      type="button"
                      className={`onboarding-option-card ${model === mo.id ? 'onboarding-option--selected' : ''}`}
                      id={`onboarding-model-${mo.id ? mo.id.replace('/', '-') : 'auto'}`}
                      onClick={() => setModel(mo.id)}
                    >
                      <span className="onboarding-option-icon">🤖</span>
                      <div className="onboarding-option-info">
                        <span className="onboarding-option-title">{mo.title}</span>
                        <span className="onboarding-option-desc">{mo.desc}</span>
                      </div>
                      <span className="onboarding-radio-dot" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {step === 4 && (
              <div className="onboarding-step-view" id="onboarding-step-4">
                <h3 className="onboarding-step-heading">Which apps and tools would you like connected?</h3>
                <p className="onboarding-step-subtext">Connectors appear as executable nodes in the canvas palette.</p>
                <div className="onboarding-options-list">
                  {APP_OPTIONS.map((app) => {
                    const isChecked = connectedApps.includes(app.id);
                    return (
                      <button
                        key={app.id}
                        type="button"
                        className={`onboarding-option-card ${isChecked ? 'onboarding-option--selected' : ''}`}
                        id={`onboarding-app-${app.id}`}
                        onClick={() => toggleApp(app.id)}
                      >
                        <span className="onboarding-option-icon">{app.icon}</span>
                        <div className="onboarding-option-info">
                          <span className="onboarding-option-title">{app.name}</span>
                          <span className="onboarding-option-desc">{app.desc}</span>
                        </div>
                        <span className={`onboarding-checkbox ${isChecked ? 'onboarding-checkbox--checked' : ''}`}>
                          {isChecked ? '✓' : ''}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Real-Time Live Preview Pane */}
          <div className="onboarding-preview-pane" id="onboarding-preview-pane">
            <div className="onboarding-preview-header">
              <span className="onboarding-preview-label">👁️ Live Workspace Preview</span>
              <span className="onboarding-preview-tag" id="preview-active-tag">
                {useCase.toUpperCase()}
              </span>
            </div>

            <div className="onboarding-preview-card" id="onboarding-preview-card">
              {/* Dynamic Feature Sandbox/Editor/Table/Canvas mockup */}
              <div className="preview-workspace-view" id={`preview-view-${useCase}`}>
                {useCase === 'coding' && (
                  <div className="preview-mini-sandbox" id="preview-mini-sandbox">
                    <div className="preview-tab-bar">
                      <span className="preview-tab preview-tab--active">App.tsx</span>
                      <span className="preview-tab">Preview ▶</span>
                    </div>
                    <pre className="preview-code-block">
                      <code>{`export function QuickSort(arr: number[]): number[] {\n  if (arr.length <= 1) return arr;\n  const pivot = arr[0];\n  return [...QuickSort(arr.slice(1).filter(x => x < pivot)), pivot, ...QuickSort(arr.slice(1).filter(x => x >= pivot))];\n}`}</code>
                    </pre>
                  </div>
                )}

                {useCase === 'writing' && (
                  <div className="preview-mini-editor" id="preview-mini-editor">
                    <div className="preview-editor-toolbar">
                      <strong>B</strong> <em>I</em> <span className="preview-badge">H1</span> <span className="preview-badge">PDF</span> <span className="preview-badge">Word</span>
                    </div>
                    <div className="preview-doc-body">
                      <h4>Project Design Document</h4>
                      <p>Comprehensive specifications with rich typography and table export ready.</p>
                    </div>
                  </div>
                )}

                {useCase === 'data' && (
                  <div className="preview-mini-table" id="preview-mini-table">
                    <div className="preview-table-header">
                      <span>Region</span><span>Q3 Revenue</span><span>Growth</span>
                    </div>
                    <div className="preview-table-row">
                      <span>North</span><span>$450,000</span><span>+14%</span>
                    </div>
                    <div className="preview-chart-bar-mock">
                      <div className="preview-bar" style={{ width: '80%' }} />
                      <div className="preview-bar" style={{ width: '55%' }} />
                    </div>
                  </div>
                )}

                {useCase === 'general' && (
                  <div className="preview-mini-canvas" id="preview-mini-canvas">
                    <div className="preview-node-mock preview-node-left">Input Prompt</div>
                    <div className="preview-wire-mock">──────▶</div>
                    <div className="preview-node-mock preview-node-right">Model Engine</div>
                  </div>
                )}
              </div>

              {/* Response style preview bubble */}
              <div className="preview-chat-sample" id="preview-chat-sample">
                <div className="preview-sample-header">
                  <span className="preview-model-badge" id="preview-model-badge">{activeModelLabel}</span>
                  <span className="preview-style-label" id="preview-style-label">{answerStyle}</span>
                </div>
                <div className="preview-sample-body" id="preview-sample-text">
                  {activeStyleSample}
                </div>
              </div>

              {/* Connected apps chips */}
              <div className="preview-apps-tray" id="preview-apps-tray">
                <span className="preview-apps-title">Active Integrations:</span>
                <div className="preview-apps-chips">
                  {connectedApps.map((appId) => (
                    <span key={appId} className="preview-app-chip" id={`preview-app-chip-${appId}`}>
                      {appId.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <div className="onboarding-footer">
          <div className="onboarding-progress-dots">
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={`onboarding-dot ${step === i ? 'onboarding-dot--active' : ''} ${step > i ? 'onboarding-dot--done' : ''}`}
              />
            ))}
          </div>

          <div className="onboarding-nav-btns">
            {step > 1 && (
              <button
                type="button"
                className="onboarding-btn onboarding-btn-secondary"
                id="onboarding-back-btn"
                onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))}
              >
                Back
              </button>
            )}

            {step < 4 ? (
              <button
                type="button"
                className="onboarding-btn onboarding-btn-primary"
                id="onboarding-next-btn"
                onClick={() => setStep((s) => (s < 4 ? ((s + 1) as 2 | 3 | 4) : 4))}
              >
                Next Step →
              </button>
            ) : (
              <button
                type="button"
                className="onboarding-btn onboarding-btn-primary"
                id="onboarding-finish-btn"
                onClick={handleFinish}
              >
                Launch Workspace ✨
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
