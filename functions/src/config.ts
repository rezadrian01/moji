export interface Config {
  model: string;
  vertexLocation: string;
  projectId: string;
  perCodeDailyLimit: number;
  globalDailyLimit: number;
  timeZone: string;
}

function positiveInt(env: NodeJS.ProcessEnv, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === '') return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return n;
}

export function loadConfig(env: NodeJS.ProcessEnv): Config {
  const model = env.MOJI_MODEL?.trim();
  if (!model) throw new Error('MOJI_MODEL is required');
  return {
    model,
    vertexLocation: env.MOJI_VERTEX_LOCATION?.trim() || 'global',
    projectId: env.GOOGLE_CLOUD_PROJECT?.trim() || env.GCLOUD_PROJECT?.trim() || '',
    perCodeDailyLimit: positiveInt(env, 'MOJI_PER_CODE_LIMIT', 50),
    globalDailyLimit: positiveInt(env, 'MOJI_GLOBAL_LIMIT', 1000),
    timeZone: 'Asia/Jakarta',
  };
}
