import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@shared-utils': resolve(__dirname, '../../packages/shared-utils/src')
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    configureServer(server) {
      server.middlewares.use('/api/openrouter/models', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET');
        res.setHeader('Access-Control-Allow-Headers', 'Accept');

        if (req.method === 'OPTIONS') {
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: 'Method not allowed' }));
          return;
        }

        const mockModels = [
          {
            id: 'x-ai/grok-4-fast:free',
            name: 'Grok 4 Fast (Free)',
            description: 'Default Grok 4 Fast free-tier model.',
            context_length: 262144,
            pricing: { prompt: 0, completion: 0, currency: 'USD' },
            top_provider: { name: 'x-ai' }
          },
          {
            id: 'openai/gpt-4o-mini',
            name: 'GPT-4o Mini',
            description: 'Balanced OpenAI GPT-4o mini.',
            context_length: 128000,
            pricing: { prompt: 0.15, completion: 0.60, currency: 'USD' },
            top_provider: { name: 'openai' }
          },
          {
            id: 'google/gemini-flash-1.5',
            name: 'Gemini Flash 1.5',
            description: 'Fast multimodal Gemini Flash 1.5.',
            context_length: 1048576,
            pricing: { prompt: 0.075, completion: 0.30, currency: 'USD' },
            top_provider: { name: 'google' }
          },
          {
            id: 'anthropic/claude-3.5-sonnet',
            name: 'Claude 3.5 Sonnet',
            description: 'High-performance Claude model.',
            context_length: 200000,
            pricing: { prompt: 3.00, completion: 15.00, currency: 'USD' },
            top_provider: { name: 'anthropic' }
          },
          {
            id: 'meta-llama/llama-3.1-405b-instruct:free',
            name: 'Llama 3.1 405B (Free)',
            description: 'Large Llama model free tier.',
            context_length: 128000,
            pricing: { prompt: 0, completion: 0, currency: 'USD' },
            top_provider: { name: 'meta-llama' }
          },
          {
            id: 'mistralai/mistral-large',
            name: 'Mistral Large',
            description: 'Mistral large model.',
            context_length: 32768,
            pricing: { prompt: 2.00, completion: 6.00, currency: 'USD' },
            top_provider: { name: 'mistralai' }
          }
        ];

        res.statusCode = 200;
        res.end(JSON.stringify({ data: mockModels }));
      });
    }
  }
});
