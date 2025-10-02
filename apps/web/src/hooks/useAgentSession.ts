import { createLogger } from '@shared-utils';
import { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { useModelContext } from '../context/ModelProvider';
import { getAgentById } from '../state/agents';
import { AgentMessage, AgentSession, Attachment } from '../types/panels';
import { TldrawApp } from '@tldraw/tldraw';
import JSZip from 'jszip';

const logger = createLogger({ name: '@tljustdraw/web/useAgentSession' });

const createMessageId = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_TYPES = [
  'image/*',
  'application/pdf',
  'text/*',
  // Add more as needed
];

interface RecordingMetadata {
  timestamp: string;
  canvasDiff?: any; // Transaction changes from Tldraw
  chatMessages: AgentMessage[];
}

interface Recording {
  id: string;
  name?: string;
  metadata: RecordingMetadata[];
  startTime: string;
  endTime?: string;
}

export const useAgentSession = (activeAgentId: string, tldrawApp?: TldrawApp): AgentSession & {
  isRecording: boolean;
  recordings: Recording[];
  startRecording: () => void;
  stopRecording: () => void;
} => {
  const [transcript, setTranscript] = useState<AgentMessage[]>([]);
  const [composerValue, setComposerValue] = useState('');
  const [currentAttachments, setCurrentAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const { activeModelId, models } = useModelContext();

  const currentRecordingRef = useRef<Recording | null>(null);
  const changeListenerRef = useRef<(() => void) | null>(null);
  const chatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const activeAgent = useMemo(() => getAgentById(activeAgentId), [activeAgentId]);


  const activeModelName = useMemo(
    () => models.find((m) => m.id === activeModelId)?.name || activeModelId,
    [models, activeModelId]
  );

  // Persistence key for localStorage
  const storageKey = `agent-session-${activeAgentId}`;

  // Load transcript from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed: AgentMessage[] = JSON.parse(saved, (key, value) => {
          if (key === 'attachments' && value) {
            // Reconstruct base64 data URLs if needed, but since data is base64, it should parse fine
            return value;
          }
          return value;
        });
        setTranscript(parsed);
        logger.info('Loaded agent session from localStorage', { agentId: activeAgentId, messageCount: parsed.length });
      } catch (err) {
        logger.error('Failed to load agent session from localStorage', { error: err });
        localStorage.removeItem(storageKey);
      }
    }
  }, [activeAgentId, storageKey]);

  // Load recordings from localStorage
  useEffect(() => {
    const savedRecordings = localStorage.getItem('workspace-recordings');
    if (savedRecordings) {
      try {
        const parsed: Recording[] = JSON.parse(savedRecordings);
        // Limit to last 5
        setRecordings(parsed.slice(-5));
        logger.info('Loaded recordings from localStorage', { count: parsed.length });
      } catch (err) {
        logger.error('Failed to load recordings from localStorage', { error: err });
        localStorage.removeItem('workspace-recordings');
      }
    }
  }, []);

  // Save transcript to localStorage on change
  useEffect(() => {
    if (transcript.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(transcript));
        logger.debug('Saved agent session to localStorage', { agentId: activeAgentId, messageCount: transcript.length });
      } catch (err) {
        logger.error('Failed to save agent session to localStorage', { error: err });
      }
    }
  }, [transcript, activeAgentId, storageKey]);

  // Save recordings to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('workspace-recordings', JSON.stringify(recordings));
      logger.debug('Saved recordings to localStorage', { count: recordings.length });
    } catch (err) {
      logger.error('Failed to save recordings to localStorage', { error: err });
    }
  }, [recordings]);

  // Clear storage when agent changes (optional, or keep per agent)
  useEffect(() => {
    // Optionally clear other agents' storage if space is concern, but for now, persist per agent
  }, [activeAgentId]);

  const addAttachment = useCallback(async (file: File): Promise<void> => {
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds 10MB limit.`);
    }

    // Simple type check - in production, use more robust validation
    const validType = SUPPORTED_TYPES.some(type =>
      type === 'image/*' ? file.type.startsWith('image/') :
      type === 'application/pdf' ? file.type === 'application/pdf' :
      type === 'text/*' ? file.type.startsWith('text/') : false
    );
    if (!validType) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64 = e.target?.result as string;
        const data = base64.split(',')[1]; // Remove data URL prefix
        const preview = file.type.startsWith('image/') ? base64 : undefined;

        const attachment: Attachment = {
          id: createMessageId(),
          name: file.name,
          type: file.type,
          size: file.size,
          data,
          preview,
        };

        setCurrentAttachments(prev => [...prev, attachment]);
        logger.info('Attachment added', { name: file.name, size: file.size });
        resolve();
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }, []);

  const removeAttachment = useCallback((id: string) => {
    setCurrentAttachments(prev => prev.filter(att => att.id !== id));
    logger.info('Attachment removed', { id });
  }, []);

  const clearAttachments = useCallback(() => {
    setCurrentAttachments([]);
    logger.info('Attachments cleared');
  }, []);

  useEffect(() => {
    if (!activeAgent) {
      setTranscript([]);
      setComposerValue('');
      logger.warn('Attempted to hydrate agent session with unknown agent id', { activeAgentId });
      return;
    }

    const introMessage: AgentMessage = {
      id: createMessageId(),
      agentId: activeAgentId,
      author: 'system',
      content: `Connected to ${activeModelName}.`,
      timestamp: new Date().toISOString(),
    };

    setTranscript([introMessage]);
    setComposerValue('');
    logger.info('Hydrated agent session', { agentId: activeAgentId });
  }, [activeAgent, activeAgentId]);

  const sendUserMessage = useCallback(() => {
    const trimmed = composerValue.trim();
    if (!trimmed || !activeAgent) {
      if (!trimmed) {
        logger.debug('Ignoring empty agent composer submission');
      }
      return;
    }

    const timestamp = new Date().toISOString();
    const userMessage: AgentMessage = {
      id: createMessageId(),
      agentId: activeAgentId,
      author: 'user',
      content: trimmed,
      timestamp,
      attachments: [...currentAttachments],
    };

    let attachmentInfo = '';
    if (currentAttachments.length > 0) {
      attachmentInfo = `\n\nAttached files:\n${currentAttachments.map(att => `- ${att.name} (${att.type}, ${(att.size / 1024).toFixed(1)} KB): ${att.data.substring(0, 100)}...`).join('\n')}`;
    }

    let agentEchoContent = `${activeModelName} acknowledges: “${trimmed}”${attachmentInfo ? attachmentInfo : ''}. (Profile model: ${activeAgent.model}, temp=${activeAgent.temperature})`;

    // Mock LLM for inference prompt
    if (trimmed.startsWith('Refine this hand-drawn')) {
      // Mock JSON response for refined structure
      const mockJson = {
        shapes: [
          {
            id: 'refined-1',
            type: 'rectangle',
            x: 100,
            y: 100,
            props: {
              text: 'Refined Box',
              fill: 'blue',
              icon: 'flowchart-basics/box'
            }
          },
          {
            id: 'refined-2',
            type: 'arrow',
            x: 200,
            y: 150,
            props: {
              handleStart: { x: 150, y: 150 },
              handleEnd: { x: 200, y: 150 },
              icon: 'arrow-straight'
            }
          },
          {
            id: 'refined-icon',
            type: 'geo',
            x: 300,
            y: 100,
            props: {
              text: 'Icon Widget',
              fill: 'green',
              icon: 'generic-icons/cog'
            }
          }
        ],
        layout: 'balanced'
      };
      agentEchoContent = `Refined structure: ${JSON.stringify(mockJson, null, 2)}`;
    }

    const agentEcho: AgentMessage = {
      id: createMessageId(),
      agentId: activeAgentId,
      author: 'agent',
      content: agentEchoContent,
      timestamp: new Date().toISOString(),
    };

    setTranscript((previous) => [...previous, userMessage, agentEcho]);
    setComposerValue('');
    clearAttachments();
    logger.info('Appended agent conversation exchange', {
      agentId: activeAgentId,
      userMessageLength: trimmed.length,
      attachmentCount: currentAttachments.length,
    });
  }, [activeAgent, activeAgentId, activeModelName, composerValue]);

  const sendCanvasAction = useCallback(
    (description: string) => {
      if (!activeAgent) {
        logger.warn('Cannot perform canvas action without active agent');
        return;
      }

      const timestamp = new Date().toISOString();
      const systemMessage: AgentMessage = {
        id: createMessageId(),
        agentId: activeAgentId,
        author: 'system',
        content: `${activeModelName} suggests canvas update: ${description}`,
        timestamp,
      };
      setTranscript((previous) => [...previous, systemMessage]);
      logger.info('Agent issued canvas action', { agentId: activeAgentId, description });
    },
    [activeAgent, activeAgentId, activeModelName]
  );

  return {
    activeAgentId,
    transcript,
    composerValue,
    setComposerValue,
    currentAttachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    sendUserMessage,
    sendCanvasAction,
    isRecording,
    recordings,
    startRecording,
    stopRecording,
  };
};
