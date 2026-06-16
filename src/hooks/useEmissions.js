// Custom React hook for local emissions computations
import { calculateDailyEmissions, COMMUTE_EMISSION_RATES, WFH_EMISSION_RATES, LUNCH_EMISSIONS } from '../lib/emissions';

export function useEmissions() {
  return {
    calculateDaily: (log) => calculateDailyEmissions(log),
    commuteRates: COMMUTE_EMISSION_RATES,
    wfhRates: WFH_EMISSION_RATES,
    lunchEmissions: LUNCH_EMISSIONS
  };
}
export default useEmissions;
