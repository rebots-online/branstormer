import { createLogger } from '@shared-utils';
import { Tldraw } from '@tldraw/tldraw';
import '@tldraw/tldraw/tldraw.css';
import { useEffect } from 'react';

const logger = createLogger({ name: '@tljustdraw/web/canvas-shell' });

const CanvasShell = (): JSX.Element => {
  useEffect(() => {
    logger.info('Canvas shell mounted');
  }, []);

  return (
    <div className="canvas-shell">
      <Tldraw persistenceKey="tljustdraw-local" />
    </div>
  );
};

export default CanvasShell;
