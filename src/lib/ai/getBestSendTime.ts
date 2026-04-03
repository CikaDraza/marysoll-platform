import type { CampaignAnalyticsDocument } from "@/models/CampaignAnalytics";

export interface BestSendTime {
  weekday: string;
  hour: number;
  confidence: number;
}

const WEEKDAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

interface DayHourBucket {
  totalOpenRate: number;
  count: number;
}

/**
 * Analyzes campaign history to predict the best weekday + hour to send.
 * Uses historical open rates correlated with send timestamps.
 *
 * Returns confidence 0 when there is insufficient history.
 */
export function getBestSendTime(
  analytics: Pick<CampaignAnalyticsDocument, "campaignHistory">,
): BestSendTime {
  const history = analytics.campaignHistory ?? [];

  // Need at least 3 data points for a meaningful prediction
  if (history.length < 3) {
    return { weekday: "Tuesday", hour: 10, confidence: 0 };
  }

  // Bucket by weekday (0-6) and hour (0-23)
  const buckets: Record<string, DayHourBucket> = {};

  for (const campaign of history) {
    if (!campaign.createdAt || campaign.openRate == null) continue;

    const date = new Date(campaign.createdAt);
    const weekday = date.getDay();
    const hour = date.getHours();
    const key = `${weekday}:${hour}`;

    if (!buckets[key]) {
      buckets[key] = { totalOpenRate: 0, count: 0 };
    }

    buckets[key].totalOpenRate += campaign.openRate;
    buckets[key].count += 1;
  }

  const keys = Object.keys(buckets);
  if (keys.length === 0) {
    return { weekday: "Tuesday", hour: 10, confidence: 0 };
  }

  // Find bucket with highest average open rate
  let bestKey = keys[0];
  let bestAvg = 0;

  for (const key of keys) {
    const bucket = buckets[key];
    const avg = bucket.totalOpenRate / bucket.count;
    if (avg > bestAvg) {
      bestAvg = avg;
      bestKey = key;
    }
  }

  const [weekdayIndex, hourStr] = bestKey.split(":");
  const weekday = WEEKDAYS[parseInt(weekdayIndex)] ?? "Tuesday";
  const hour = parseInt(hourStr);

  // Confidence scales with data points: 3 pts → ~0.3, 10+ pts → ~0.9
  const confidence = Math.min(0.95, 0.3 + (history.length - 3) * 0.07);

  return {
    weekday,
    hour,
    confidence: Math.round(confidence * 100) / 100,
  };
}
