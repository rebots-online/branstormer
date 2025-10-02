export type LibrarySourceType = 'builtin' | 'user';

export interface LibraryEntry {
  id: string;
  name: string;
  description: string;
  license: string;
  sourceType: LibrarySourceType;
  itemCount: number;
  enabled: boolean;
  attributionUrl?: string;
}

export type LibraryToggleHandler = (libraryId: string) => void;

export type AgentProvider = 'google' | 'openrouter' | 'ollama';

export interface AgentProfile {
  id: string;
  name: string;
  provider: AgentProvider;
  model: string;
  description: string;
  status: 'online' | 'offline' | 'beta';
  temperature: number;
}

export type AgentAuthor = 'user' | 'agent' | 'system';

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number; // in bytes
  data: string; // base64 encoded content
  preview?: string; // URL for thumbnail (e.g., object URL for images)
}

export interface AgentMessage {
  id: string;
  agentId: string;
  author: AgentAuthor;
  content: string;
  timestamp: string;
  attachments?: Attachment[];
}

export interface AgentSession {
  activeAgentId: string;
  transcript: AgentMessage[];
  composerValue: string;
  setComposerValue: (value: string) => void;
  currentAttachments: Attachment[];
  addAttachment: (file: File) => Promise<void>;
  removeAttachment: (id: string) => void;
  clearAttachments: () => void;
  sendUserMessage: () => void;
  sendCanvasAction: (description: string) => void;
}
