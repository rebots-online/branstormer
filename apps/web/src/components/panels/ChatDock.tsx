import clsx from 'clsx';
import { PropsWithChildren, useEffect } from 'react';

import { ChatDockMode, useWorkspaceLayoutStore } from '../../state/workspaceLayout';
import FloatingPanel from '../layout/FloatingPanel';

interface ChatDockProps {
  title?: string;
  onGenerateDiagram?: (type: 'flowchart' | 'erd') => void;
}

const CHAT_MODE_LABELS: Record<ChatDockMode, string> = {
  horizontal: 'Horizontal dock',
  vertical: 'Vertical dock',
  floating: 'Floating window',
};

const ChatDock = ({
  title = 'Agent Chat',
  children,
}: PropsWithChildren<ChatDockProps>): JSX.Element => {
  const mode = useWorkspaceLayoutStore((state) => state.chatDockMode);
  const setChatDockMode = useWorkspaceLayoutStore((state) => state.setChatDockMode);
  const updatePanel = useWorkspaceLayoutStore((state) => state.updatePanel);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { innerWidth: w, innerHeight: h } = window;
    const chromeHeight = 60;
    const dockPadding = 60;

    if (mode !== 'horizontal') {
      const isVertical = mode === 'vertical';
      updatePanel('chat', {
        visible: true,
        x: isVertical ? w - 320 : w - 440,
        y: isVertical ? chromeHeight : h - 400,
        width: isVertical ? 320 : 400,
        height: isVertical ? h - chromeHeight - dockPadding : 350,
      });
    } else {
      updatePanel('chat', { visible: false });
    }
  }, [mode, updatePanel]);

  const renderModeSwitcher = () => (
    <div className="chat-dock__modes" role="radiogroup" aria-label="Chat layout mode">
      {(Object.keys(CHAT_MODE_LABELS) as ChatDockMode[]).map((modeKey) => (
        <button
          key={modeKey}
          type="button"
          role="radio"
          aria-checked={mode === modeKey}
          className={clsx('chat-dock__mode', mode === modeKey && 'chat-dock__mode--active')}
          onClick={() => setChatDockMode(modeKey)}
        >
          {CHAT_MODE_LABELS[modeKey]}
        </button>
      ))}
    </div>
  );

  if (mode === 'horizontal') {
    return (
      <aside
        className={clsx('chat-dock', 'chat-dock--horizontal')}
        aria-label={`${title} (horizontal)`}
      >
        <header>
          <h2>{title}</h2>
          {renderModeSwitcher()}
          <div className="diagram-generator">
            <select id="diagram-type">
              <option value="flowchart">Flowchart</option>
              <option value="erd">ERD</option>
            </select>
            <button type="button" onClick={() => console.log('Generate diagram clicked')}>Generate Diagram</button>
          </div>
        </header>
        <div className="chat-dock__content">{children}</div>
      </aside>
    );
  }

  return (
    <FloatingPanel
      panelId="chat"
      headerContent={renderModeSwitcher()}
      resizable={true}
    >
      <div className="chat-dock__content">{children}</div>
    </FloatingPanel>
  );
};

export default ChatDock;
