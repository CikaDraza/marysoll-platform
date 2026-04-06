import { Queue } from "bullmq";
import IORedis from "ioredis";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set");
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  // Prevent serverless functions from hanging indefinitely when Redis is slow.
  // connectTimeout: give up after 5s if TCP connection cannot be established.
  // commandTimeout:  fail individual commands after 8s (well inside Vercel's 10s limit).
  connectTimeout: 5000,
  commandTimeout: 8000,
  tls: process.env.REDIS_URL.startsWith("rediss://") ? {} : undefined,
});

export const emailCampaignQueue = new Queue("email-campaign-queue", {
  connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 200,
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 5000,
    },
  },
});

export interface SendCampaignJobData {
  campaignId: string;
}
