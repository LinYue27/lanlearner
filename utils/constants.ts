// Ebbinghaus Intervals in hours (approximate for d1, d2) then days
// Stage 0: New (Next: +24h)
// Stage 1: 1 day old (Next: +48h)
// Stage 2: 2 days old (Next: +7 days)
// Stage 3: 7 days old (Next: +30 days)
// Stage 4: 30 days old (Next: +165 days)
// Stage 5: Done
export const EBBINGHAUS_INTERVALS_HOURS = [
  24,      // Stage 0 -> 1
  48,      // Stage 1 -> 2
  168,     // Stage 2 -> 3 (7 days)
  720,     // Stage 3 -> 4 (30 days)
  3960,    // Stage 4 -> 5 (165 days)
];

export const MAX_STAGE = 5;

export const APP_STORAGE_KEY = 'lanlearner_data_v1';
