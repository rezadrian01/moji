import * as functions from '@google-cloud/functions-framework';
import { loadConfig } from './config.js';
import { createVertexGeminiClient } from './ai/gemini.js';
import { createInviteStore } from './invites/createStore.js';
import { createLogger } from './log.js';
import { handleRequest, type Deps } from './router.js';

// Built lazily once per instance so a missing env var surfaces as a 500, not a failed cold start.
let deps: Deps | undefined;
function getDeps(): Deps {
  if (!deps) {
    const cfg = loadConfig(process.env);
    deps = {
      store: createInviteStore(process.env),
      gemini: createVertexGeminiClient(cfg),
      cfg,
      logger: createLogger(),
      now: () => new Date(),
    };
  }
  return deps;
}

functions.http('api', async (req, res) => {
  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) headers[k] = Array.isArray(v) ? v[0] : v;
  const started = Date.now();
  try {
    const out = await handleRequest({ method: req.method, path: req.path, headers, body: req.body }, getDeps());
    res.status(out.status).json(out.body);
  } catch {
    // Fixed event only: never log the error message or request content.
    createLogger().error({ endpoint: 'unknown', status: 500, latencyMs: Date.now() - started, codeHash: null, reason: 'internal' });
    res.status(500).json({ error: 'internal' });
  }
});
