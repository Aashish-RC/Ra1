import React, { useState, useEffect, useRef } from 'react';

export interface DebuggerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DebuggerPanel: React.FC<DebuggerPanelProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState('ws://localhost:21889');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [logs, setLogs] = useState<Array<{ time: string; text: string }>>([
    { time: new Date().toLocaleTimeString(), text: 'Debugger bridge client initialized.' },
  ]);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  if (!isOpen) return null;

  const appendLog = (text: string) => {
    setLogs((prev) => [...prev, { time: new Date().toLocaleTimeString(), text }]);
  };

  const handleConnect = () => {
    if (status === 'connected' && socketRef.current) {
      socketRef.current.close();
      setStatus('disconnected');
      appendLog('Disconnected from debugging bridge.');
      return;
    }

    setStatus('connecting');
    appendLog(`Attempting connection to ${url}...`);

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        setStatus('connected');
        appendLog('Connected successfully to Rivet live-debugging bridge!');
        ws.send(JSON.stringify({ type: 'handshake', data: { client: 'Rivet Canvas UI' } }));
      };

      ws.onmessage = (event) => {
        appendLog(`Received: ${event.data}`);
      };

      ws.onerror = () => {
        setStatus('disconnected');
        appendLog('Connection error: Debugger bridge server unreachable or not started.');
      };

      ws.onclose = () => {
        setStatus('disconnected');
        appendLog('Connection closed.');
      };
    } catch (err) {
      setStatus('disconnected');
      appendLog(`Connection exception: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="modal-overlay" id="debugger-modal" onClick={onClose}>
      <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Live-Debugging Bridge</div>
          <button type="button" className="modal-close-btn" onClick={onClose} id="debugger-close-btn">
            ✕
          </button>
        </div>

        <div className="modal-content">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Status:</span>
            <span className={`debugger-status-badge ${status}`} id="debugger-status-badge">
              ● {status.toUpperCase()}
            </span>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="debugger-url-input"
              style={{ display: 'block', fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}
            >
              Bridge WebSocket URL
            </label>
            <input
              id="debugger-url-input"
              type="text"
              className="search-input"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="ws://localhost:21889"
              disabled={status === 'connected'}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 6, color: 'var(--text-secondary)' }}>
              Live Execution Event Logs
            </div>
            <div className="debugger-logs-box" id="debugger-logs-box">
              {logs.map((log, i) => (
                <div key={i} className="log-entry">
                  <span className="log-time">[{log.time}]</span>
                  <span>{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            className={`btn ${status === 'connected' ? 'btn-danger' : 'btn-primary'}`}
            id="debugger-connect-btn"
            onClick={handleConnect}
          >
            {status === 'connected' ? 'Disconnect' : status === 'connecting' ? 'Connecting...' : 'Connect to Bridge'}
          </button>
        </div>
      </div>
    </div>
  );
};
