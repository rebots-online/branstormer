import { AgentProfile, LibraryEntry } from '../../types/panels';
import ModelSelector from '../panels/ModelSelector';
import { useWorkspaceLayoutStore } from '../../state/workspaceLayout';

interface SettingsDrawerProps {
  open: boolean;
  onClose: () => void;
  libraries: LibraryEntry[];
  onToggleLibrary: (libraryId: string) => void;
  agents: AgentProfile[];
  activeAgentId: string;
  onSelectAgent: (agentId: string) => void;
}

const SettingsDrawer = ({
  open,
  onClose,
  libraries,
  onToggleLibrary,
  agents,
  activeAgentId,
  onSelectAgent,
}: SettingsDrawerProps): JSX.Element => {
  const { fontSize, setFontSize } = useWorkspaceLayoutStore();

  const parseSize = (size: string) => parseInt(size, 10);

  return (
    <div
      id="workspace-settings"
      className={`settings-drawer ${open ? 'settings-drawer--open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-hidden={!open}
    >
      <div className="settings-drawer__header">
        <h2>Workspace Settings</h2>
        <button
          type="button"
          onClick={onClose}
          className="settings-drawer__close"
          aria-label="Close settings"
        >
          ✕
        </button>
      </div>

      <div className="settings-drawer__content">
        <section>
          <h3>Model Catalog</h3>
          <ModelSelector label="Active OpenRouter model" />
        </section>

        <section>
          <h3>Libraries</h3>
          <ul className="settings-drawer__list">
            {libraries.map((library) => (
              <li key={library.id}>
                <div>
                  <p className="settings-drawer__item-title">{library.name}</p>
                  <p className="settings-drawer__item-description">{library.description}</p>
                </div>
                <button type="button" onClick={() => onToggleLibrary(library.id)}>
                  {library.enabled ? 'Disable' : 'Enable'}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Agents</h3>
          <ul
            className="settings-drawer__list settings-drawer__list--agents"
            role="radiogroup"
            aria-label="Select agent"
          >
            {agents.map((agent) => (
              <li key={agent.id}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={agent.id === activeAgentId}
                  onClick={() => onSelectAgent(agent.id)}
                >
                  <span className="settings-drawer__item-title">{agent.name}</span>
                  <span className="settings-drawer__item-description">{agent.description}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h3>Text Sizes</h3>
          <div className="settings-drawer__font-controls">
            <div className="font-control">
              <label htmlFor="body-size">Body Text</label>
              <input
                id="body-size"
                type="range"
                min="12"
                max="24"
                step="1"
                value={parseSize(fontSize.body)}
                onChange={(e) => setFontSize('body', `${e.target.value}px`)}
              />
              <span>{fontSize.body}</span>
            </div>
            <div className="font-control">
              <label htmlFor="header-size">Headers</label>
              <input
                id="header-size"
                type="range"
                min="12"
                max="24"
                step="1"
                value={parseSize(fontSize.header)}
                onChange={(e) => setFontSize('header', `${e.target.value}px`)}
              />
              <span>{fontSize.header}</span>
            </div>
            <div className="font-control">
              <label htmlFor="panels-size">Panels</label>
              <input
                id="panels-size"
                type="range"
                min="12"
                max="24"
                step="1"
                value={parseSize(fontSize.panels)}
                onChange={(e) => setFontSize('panels', `${e.target.value}px`)}
              />
              <span>{fontSize.panels}</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default SettingsDrawer;
