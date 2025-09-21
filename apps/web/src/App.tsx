import { createLogger } from '@shared-utils';
import { useEffect } from 'react';

const logger = createLogger({ name: '@tljustdraw/web' });

const App = (): JSX.Element => {
  useEffect(() => {
    logger.info('tl;justdraw! web scaffold mounted');
  }, []);

  return (
    <main>
      <h1>tl;justdraw! web workspace is live</h1>
      <p>
        Development server is running via <code>pnpm run dev</code>. Shared utilities are linked —
        check the console for logger output.
      </p>
      <p>
        Next steps: integrate canvas, agent, and library panels following the architecture plan.
      </p>
    </main>
  );
};

export default App;
