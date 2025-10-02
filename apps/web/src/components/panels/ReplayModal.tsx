import React, { useState, useCallback } from 'react';
import { TldrawApp } from '@tldraw/tldraw';
import { Recording, RecordingMetadata } from '../../hooks/useAgentSession';
import { AgentMessage } from '../../types/panels';

interface ReplayModalProps {
  recordings: Recording[];
  tldrawApp?: TldrawApp;
  onClose: () => void;
}

const ReplayModal: React.FC<ReplayModalProps> = ({ recordings, tldrawApp, onClose }) => {
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([]);

  const handleSelectRecording = (recording: Recording) => {
    setSelectedRecording(recording);
    setCurrentStep(0);
    setChatMessages([]);
  };

  const handlePlay = useCallback(() => {
    if (!selectedRecording || !tldrawApp || isPlaying) return;

    setIsPlaying(true);
    const metadata = selectedRecording.metadata;
    let index = 0;

    const playStep = () => {
      if (index >= metadata.length) {
        setIsPlaying(false);
        return;
      }

      const entry = metadata[index];
      // Apply canvas snapshot if available (assuming canvasDiff is applied via patch, but for simplicity use full snapshot if changed)
      if (entry.canvasDiff) {
        // For diff, tldrawApp.store.applyTransaction or similar; mock for now
        console.log('Applying canvas diff:', entry.canvasDiff);
        // To simulate, perhaps reload from previous, but for basic, log
      }
      // Update chat
      setChatMessages(prev => [...prev, ...entry.chatMessages.slice(-5)]); // Show recent

      setCurrentStep(index + 1);

      index++;
      // Delay based on timestamp delta or fixed
      const delay = 2000; // 2s per step
      setTimeout(playStep, delay);
    };

    playStep();
  }, [selectedRecording, tldrawApp, isPlaying]);

  const handleStop = () => {
    setIsPlaying(false);
  };

  return (
    <div className="replay-modal-overlay" onClick={onClose}>
      <div className="replay-modal" onClick={e => e.stopPropagation()}>
        <h2>Replay Recording</h2>
        {!selectedRecording ? (
          <div className="recordings-list">
            {recordings.map(recording => (
              <div key={recording.id} className="recording-item" onClick={() => handleSelectRecording(recording)}>
                <h3>{recording.name || `Recording ${recording.id.slice(0,8)}`}</h3>
                <p>Start: {new Date(recording.startTime).toLocaleString()}</p>
                {recording.endTime && <p>End: {new Date(recording.endTime).toLocaleString()}</p>}
                <p>Steps: {recording.metadata.length}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="replay-player">
            <div className="player-controls">
              <button onClick={handlePlay} disabled={isPlaying}>Play</button>
              <button onClick={handleStop} disabled={!isPlaying}>Stop</button>
              <button onClick={() => setSelectedRecording(null)}>Back</button>
              <span>Step {currentStep} / {selectedRecording.metadata.length}</span>
            </div>
            <div className="chat-replay">
              <h3>Chat Sync</h3>
              <ul>
                {chatMessages.map(msg => (
                  <li key={msg.id} className={`message-${msg.author}`}>
                    <strong>{msg.author}:</strong> {msg.content}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReplayModal;