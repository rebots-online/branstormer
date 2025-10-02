import { FormEvent, useState, useEffect, DragEvent, ChangeEvent } from 'react';
import ReplayModal from './ReplayModal';

import PanelHeader from './PanelHeader';
import { AgentProfile, AgentSession, Attachment } from '../../types/panels';
import { TldrawApp } from '@tldraw/tldraw';
import mermaid from 'mermaid';

interface AgentPanelProps {
  agents: AgentProfile[];
  activeAgentId: string;
  onSelect: (agentId: string) => void;
  session: AgentSession;
  tldrawApp?: TldrawApp;
}

const AgentPanel = ({ agents, activeAgentId, onSelect, session, tldrawApp }: AgentPanelProps): JSX.Element => {
  const { transcript, composerValue, setComposerValue, sendUserMessage, sendCanvasAction, currentAttachments, addAttachment, removeAttachment, isRecording, startRecording, stopRecording, recordings } =
    session;
  const [showReplayModal, setShowReplayModal] = useState(false);
  const [canvasAction, setCanvasAction] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSnapshot = async () => {
    if (!tldrawApp) {
      console.warn('Tldraw app not available for snapshot');
      return;
    }

    try {
      const imageBlob = await tldrawApp.exportAsImage({ format: 'png' });
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(imageBlob);
      });

      // Download
      const url = base64;
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `workspace-snapshot-${Date.now()}.png`;
      anchor.click();

      // Optionally attach to chat
      const imageFile = new File([base64.split(',')[1]], 'snapshot.png', { type: 'image/png' });
      await addAttachment(imageFile);

      console.log('Snapshot captured and attached');
    } catch (err) {
      console.error('Failed to capture snapshot:', err);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendUserMessage();
  };

  const handleCanvasAction = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = canvasAction.trim();
    if (trimmed) {
      sendCanvasAction(trimmed);
      setCanvasAction('');
    }
  };

  const handleFiles = async (files: FileList) => {
    try {
      setError(null);
      for (let i = 0; i < files.length; i++) {
        await addAttachment(files[i]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add attachment');
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFiles(files);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = ''; // Reset input
    }
  };

  const downloadAttachment = (attachment: Attachment) => {
    const link = document.createElement('a');
    link.href = `data:${attachment.type};base64,${attachment.data}`;
    link.download = attachment.name;
    link.click();
  };

  const handleTriggerInference = async () => {
    if (!tldrawApp) {
      console.warn('Tldraw app not available for inference');
      return;
    }

    const currentPageId = tldrawApp.currentPageId;
    const selectedIds = tldrawApp.selectedShapeIds;
    let capturedContext;

    if (selectedIds.length === 0) {
      // Full board context
      const allShapes = Object.values(tldrawApp.document.pages[currentPageId]?.shapes || {});
      let boardImage = null;
      try {
        const imageBlob = await tldrawApp.exportAsImage({ format: 'png' });
        boardImage = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(imageBlob);
        });
      } catch (err) {
        console.warn('Failed to export board image:', err);
      }
      capturedContext = {
        type: 'full-board',
        elements: allShapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          props: shape.props,
        })),
        image: boardImage,
      };
    } else {
      // Selected elements
      const selectedShapes = selectedIds.map(id => tldrawApp.getShape(id)).filter(Boolean);
      capturedContext = {
        type: 'selection',
        elements: selectedShapes.map(shape => ({
          id: shape.id,
          type: shape.type,
          x: shape.x,
          y: shape.y,
          props: shape.props,
        })),
      };
    }

    const elementsJson = JSON.stringify(capturedContext.elements, null, 2);
    const prompt = `Refine this hand-drawn ${capturedContext.type} into a neat, balanced representation using appropriate library icons/widgets. Elements: ${elementsJson}. Output JSON with shapes, positions, icon references from libraries.`;

    setComposerValue(prompt);

    if (capturedContext.image) {
      const imageFile = new File([capturedContext.image.split(',')[1]], 'board.png', { type: 'image/png' });
      await addAttachment(imageFile);
    }

    sendUserMessage();
  };

  return (
    <div className="panel-content">
      <PanelHeader title="Agents" subtitle="Invite a co-pilot to assist on the board" />

      <div className="agent-roster" role="tablist" aria-label="Available agents">
        {agents.map((agent) => (
          <button
            key={agent.id}
            type="button"
            role="tab"
            aria-selected={agent.id === activeAgentId}
            className={`agent-pill ${agent.id === activeAgentId ? 'agent-pill--active' : ''}`}
            onClick={() => onSelect(agent.id)}
          >
            <span className="agent-pill__name">{agent.name}</span>
            <span className="agent-pill__meta">{agent.model}</span>
            <span className={`agent-pill__status agent-pill__status--${agent.status}`}>
              {agent.status === 'online' ? 'Online' : agent.status === 'beta' ? 'Beta' : 'Offline'}
            </span>
          </button>
        ))}
      </div>

      <section className="agent-transcript" aria-label="Agent conversation">
        <ul>
          {transcript.map((message) => (
            <li key={message.id} className={`agent-message agent-message--${message.author}`}>
              <div className="agent-message__meta">
                <span className="agent-message__author">{message.author}</span>
                <time dateTime={message.timestamp}>
                  {new Date(message.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </time>
              </div>
              <p>{message.content}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="message-attachments">
                  <h5>Attachments:</h5>
                  <ul>
                    {message.attachments.map((att) => (
                      <li key={att.id}>
                        {att.preview ? (
                          <img src={att.preview} alt={att.name} width={100} />
                        ) : (
                          <span className="attachment-icon">📄</span>
                        )}
                        <span>{att.name}</span>
                        <button type="button" onClick={() => downloadAttachment(att)}>Download</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <form className="agent-composer" onSubmit={handleSubmit}>
        <label htmlFor="agent-message">Message the agent</label>
        <div
          className={`composer-drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <textarea
            id="agent-message"
            name="agent-message"
            value={composerValue}
            onChange={(event) => setComposerValue(event.target.value)}
            rows={3}
            placeholder={dragOver ? "Drop files here..." : "Ask for help with conversation, drawing, or layout changes"}
          />
          <input
            type="file"
            multiple
            accept="image/*,application/pdf,text/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-upload-label">
            📎 Attach files
          </label>
        </div>
        {currentAttachments.length > 0 && (
          <div className="current-attachments">
            <h4>Attached files:</h4>
            <ul>
              {currentAttachments.map((att) => (
                <li key={att.id} className="attachment-item">
                  {att.preview ? (
                    <img src={att.preview} alt={att.name} width={50} height={50} />
                  ) : (
                    <span className="attachment-icon">📄</span>
                  )}
                  <span>{att.name} ({(att.size / 1024).toFixed(1)} KB)</span>
                  <button type="button" onClick={() => removeAttachment(att.id)}>Remove</button>
                  <button type="button" onClick={() => downloadAttachment(att)}>Download</button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <button type="submit" className="send-button" disabled={currentAttachments.length > 0 && !composerValue.trim()}>
          Send
        </button>
      </form>

      <div className="panel-actions">
        <button type="button" onClick={handleSnapshot} title="Capture workspace snapshot">
          📷
        </button>
        <button type="button" onClick={handleToggleRecording} title={isRecording ? "Stop recording" : "Start recording"}>
          {isRecording ? '⏹️' : '🎥'}
        </button>
        {/* Placeholder for replay button */}
        <button type="button" title="Replay recording" disabled>
          ▶️
        </button>
      </div>
      <div className="panel-actions">
        <button type="button" onClick={handleSnapshot} title="Capture workspace snapshot">
          📷
        </button>
        <button type="button" onClick={handleToggleRecording} title={isRecording ? "Stop recording" : "Start recording"}>
          {isRecording ? '⏹️' : '🎥'}
        </button>
        <button type="button" onClick={handleOpenReplay} title="Replay recording">
          ▶️
        </button>
      </div>

      {showReplayModal && (
        <ReplayModal
          recordings={recordings}
          tldrawApp={tldrawApp}
          onClose={() => setShowReplayModal(false)}
        />
      )}
    </div>
  );
};

export default AgentPanel;
