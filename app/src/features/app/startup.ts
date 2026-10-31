import { useWeeklyInsightOnForeground } from '@/features/insights/useWeeklyInsight';
import { usePendingSafetyOnForeground } from '@/features/safety/usePendingSafety';

/** Alat tim (data contoh) hanya untuk build development atau build internal dengan EXPO_PUBLIC_DEV_TOOLS=1. */
export const DEV_TOOLS_ENABLED: boolean = __DEV__ || process.env.EXPO_PUBLIC_DEV_TOOLS === '1';

/** Tugas latar saat aplikasi dibuka atau kembali aktif. Dipanggil sekali di root layout. */
export function useStartupTasks(): void {
  useWeeklyInsightOnForeground();
  usePendingSafetyOnForeground();
}
