import { createLogger } from '@shared-utils';
import { useCallback, useEffect, useState } from 'react';

import CanvasShell from './components/canvas/CanvasShell';
import AppLayout from './components/layout/AppLayout';
import AgentPanel from './components/panels/AgentPanel';
import LibraryPanel from './components/panels/LibraryPanel';
import { useAgentSession } from './hooks/useAgentSession';
import { AGENT_PROFILES } from './state/agents';
import { LIBRARIES, toggleLibrary } from './state/libraries';
import { LibraryEntry } from './types/panels';

const logger = createLogger({ name: '@tljustdraw/web/app' });

const App = (): JSX.Element => {
  const [libraries, setLibraries] = useState<LibraryEntry[]>(LIBRARIES);
  const [activeAgentId, setActiveAgentId] = useState<string>(AGENT_PROFILES[0]?.id ?? '');

  const agentSession = useAgentSession(activeAgentId);
  const initialLibraryCount = LIBRARIES.length;
  const totalAgentCount = AGENT_PROFILES.length;

  useEffect(() => {
    logger.info('tl;justdraw! workspace mounted', {
      libraryCount: initialLibraryCount,
      agentCount: totalAgentCount,
    });
  }, [initialLibraryCount, totalAgentCount]);

  const handleToggleLibrary = useCallback((libraryId: string) => {
    setLibraries((previous) => {
      const nextState = toggleLibrary(previous, libraryId);
      const toggled = nextState.find((library) => library.id === libraryId);
      logger.info('Library toggled', {
        libraryId,
        enabled: toggled?.enabled ?? false,
      });
      return nextState;
    });
  }, []);

  const handleSelectAgent = useCallback((agentId: string) => {
    setActiveAgentId(agentId);
    logger.info('Active agent selected', { agentId });
  }, []);

  useEffect(() => {
    if (!activeAgentId) {
      logger.warn('No active agent configured');
    }
  }, [activeAgentId]);

  return (
    <main>
      <AppLayout
        librarySlot={<LibraryPanel libraries={libraries} onToggle={handleToggleLibrary} />}
        canvasSlot={<CanvasShell />}
        agentSlot={
          <AgentPanel
            agents={AGENT_PROFILES}
            activeAgentId={activeAgentId}
            onSelect={handleSelectAgent}
            session={agentSession}
          />
        }
      />
    </main>
  );
};

export default App;
