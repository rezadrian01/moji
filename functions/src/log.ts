import { createHash } from 'node:crypto';

/** Deliberately has no free-text field: journal text must never reach logs. */
export interface LogEvent {
  endpoint: string;
  status: number;
  latencyMs: number;
  codeHash: string | null;
  reason?: string;
}

export interface Logger {
  info(event: LogEvent): void;
  error(event: LogEvent): void;
}

export function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex').slice(0, 12);
}

export function createLogger(sink: (line: string) => void = (l) => console.log(l)): Logger {
  const write = (level: 'info' | 'error', e: LogEvent): void => {
    // Whitelist fields explicitly so extra runtime properties are dropped.
    const line: Record<string, unknown> = {
      level,
      endpoint: e.endpoint,
      status: e.status,
      latencyMs: e.latencyMs,
      codeHash: e.codeHash,
    };
    if (e.reason !== undefined) line.reason = e.reason;
    sink(JSON.stringify(line));
  };
  return { info: (e) => write('info', e), error: (e) => write('error', e) };
}
