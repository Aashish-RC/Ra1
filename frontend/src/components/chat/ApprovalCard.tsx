import React from 'react';
import type { ApprovalRequest } from '../../../../backend/chat/chatService.js';

interface ApprovalCardProps {
  approval: ApprovalRequest;
  onResolve: (approvalId: string, decision: 'approved' | 'cancelled') => void;
}

/**
 * Interactive "Ask Permission First" Approval Card.
 *
 * Appears when the ReAct agent is about to execute a consequential action
 * (e.g., sending external email/slack, creating calendar events, deleting files, spending money).
 * Genuinely halts execution until the user clicks Approve or Cancel.
 * Cancelling cleanly aborts with zero side effects.
 */
export const ApprovalCard: React.FC<ApprovalCardProps> = ({ approval, onResolve }) => {
  const isPending = approval.status === 'pending';

  return (
    <div className={`approval-card approval-card--${approval.status}`} id={`approval-card-${approval.approvalId}`}>
      <div className="approval-card-header">
        <div className="approval-card-icon">⚠️</div>
        <div className="approval-card-title-group">
          <div className="approval-card-title">Authorization Required</div>
          <div className="approval-card-subtitle">{approval.toolDisplayName}</div>
        </div>
        <span className={`approval-status-pill approval-status-pill--${approval.status}`}>
          {approval.status.toUpperCase()}
        </span>
      </div>

      <div className="approval-card-reason">
        <span className="approval-reason-icon">🛡️</span>
        <span>{approval.consequentialReason}</span>
      </div>

      {approval.screenshotUrl && (
        <div className="approval-card-screenshot">
          <div className="approval-screenshot-label">Page State Snapshot:</div>
          <img
            src={approval.screenshotUrl}
            alt="Page state snapshot before consequential action"
            className="approval-screenshot-img"
            id="approval-card-screenshot-img"
          />
        </div>
      )}

      {approval.args && Object.keys(approval.args).length > 0 && (
        <div className="approval-card-payload">
          <div className="approval-payload-label">Target Parameters:</div>
          <pre className="approval-payload-pre">
            {JSON.stringify(approval.args, null, 2)}
          </pre>
        </div>
      )}

      {isPending ? (
        <div className="approval-card-actions">
          <button
            type="button"
            className="approval-btn approval-btn--approve"
            id="approval-approve-btn"
            onClick={() => onResolve(approval.approvalId, 'approved')}
          >
            <span>✓</span> Approve & Run
          </button>
          <button
            type="button"
            className="approval-btn approval-btn--cancel"
            id="approval-cancel-btn"
            onClick={() => onResolve(approval.approvalId, 'cancelled')}
          >
            <span>✕</span> Cancel Action
          </button>
        </div>
      ) : (
        <div className="approval-card-resolution">
          {approval.status === 'approved' ? (
            <div className="approval-resolution approval-resolution--approved" id="approval-resolution-approved">
              <span>✓</span> Authorized by user — Action completed
            </div>
          ) : (
            <div className="approval-resolution approval-resolution--cancelled" id="approval-resolution-cancelled">
              <span>✕</span> Cancelled by user — Aborted with zero side effects
            </div>
          )}
        </div>
      )}
    </div>
  );
};
