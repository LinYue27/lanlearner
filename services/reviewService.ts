import { EBBINGHAUS_INTERVALS_HOURS, MAX_STAGE } from '../utils/constants';

export const calculateNextReview = (currentStage: number, lastReviewDate: number = Date.now()): number => {
  if (currentStage >= MAX_STAGE) return lastReviewDate + (365 * 24 * 60 * 60 * 1000); // 1 year later (effectively done)
  
  const hoursToAdd = EBBINGHAUS_INTERVALS_HOURS[currentStage] || 24;
  return lastReviewDate + (hoursToAdd * 60 * 60 * 1000);
};
