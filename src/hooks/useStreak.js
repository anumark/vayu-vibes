// Custom React hook to calculate streak metrics
import { useMemo } from 'react';
import { calculateStreak } from '../lib/emissions';

export function useStreak(logs = []) {
  return useMemo(() => {
    return calculateStreak(logs);
  }, [logs]);
}
export default useStreak;
