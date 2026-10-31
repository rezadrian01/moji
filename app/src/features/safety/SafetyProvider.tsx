// STUB: diganti oleh Task 19 (support sheet sungguhan). Nama & signature tetap.
import type { RiskLevel } from '@/domain/types';

type SafetyApi = { show(level: Exclude<RiskLevel, 'none'>, entryId: string | null): void };

const noopSafety: SafetyApi = { show: () => {} };

export function SafetyProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export function useSafety(): SafetyApi {
  return noopSafety;
}
