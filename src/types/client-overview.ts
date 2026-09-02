import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i);
const isoDateSchema = z.string().datetime();
const optionalLegacyStringSchema = z.preprocess(
  (value) => value === null ? undefined : value,
  z.string().optional(),
);

export const clientOverviewQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).default(() => new Date().getMonth() + 1),
  year: z.coerce.number().int().min(2000).max(2200).default(() => new Date().getFullYear()),
  appointmentPage: z.coerce.number().int().min(1).default(1),
  appointmentLimit: z.coerce.number().int().min(5).max(50).default(10),
});

export const clientOverviewSchema = z.object({
  period: z.object({ month: z.number().int(), year: z.number().int() }),
  client: z.object({
    id: objectIdSchema,
    name: z.string(),
    email: z.string(),
    phone: optionalLegacyStringSchema,
    instagram: optionalLegacyStringSchema,
    tiktok: optionalLegacyStringSchema,
    birthday: isoDateSchema.nullable(),
    status: z.string(),
    isEmailVerified: z.boolean(),
    createdAt: isoDateSchema,
    lastActive: isoDateSchema.nullable(),
  }),
  appointments: z.object({
    items: z.array(z.object({
      id: objectIdSchema,
      serviceName: z.string(),
      date: z.string(),
      time: z.string(),
      status: z.string(),
      potentialValue: z.number().nullable(),
      realizedValue: z.number().nullable(),
      request: z.object({
        note: z.string().optional(),
        referenceUrl: z.string().optional(),
        attachments: z.array(z.object({ url: z.string().url() })),
      }).nullable(),
    })),
    pagination: z.object({
      page: z.number().int(),
      limit: z.number().int(),
      totalCount: z.number().int(),
      totalPages: z.number().int(),
      hasNextPage: z.boolean(),
      hasPrevPage: z.boolean(),
    }),
  }),
  insights: z.object({
    available: z.boolean(),
    potential: z.number().optional(),
    realized: z.number().optional(),
    total: z.number().int().optional(),
    completed: z.number().int().optional(),
    cancelled: z.number().int().optional(),
    noShow: z.number().int().optional(),
    testimonialCount: z.number().int().optional(),
    lastVisit: z.object({ date: z.string(), time: z.string() }).nullable().optional(),
    nextAppointment: z.object({ date: z.string(), time: z.string() }).nullable().optional(),
    topThree: z.boolean().optional(),
    withoutPrice: z.number().int().optional(),
    topClients: z.array(z.object({
      clientId: z.string().nullable(), name: z.string(), email: z.string(), count: z.number().int(),
    })).optional(),
  }),
  loyalty: z.object({
    enabled: z.boolean(),
    account: z.object({
      id: objectIdSchema,
      heartsBalance: z.number(), pointsBalance: z.number(),
      lifetimeHearts: z.number(), lifetimePoints: z.number(),
      completedVisits: z.number(), noShows: z.number(), totalSpend: z.number(),
      lastVisitAt: isoDateSchema.nullable(),
    }).nullable().optional(),
    ledger: z.array(z.object({
      id: objectIdSchema, entryType: z.string(), currency: z.enum(["hearts", "points"]),
      amount: z.number(), description: z.string(), createdAt: isoDateSchema,
    })).optional(),
    vouchers: z.array(z.object({
      id: objectIdSchema, code: z.string(), type: z.string(), value: z.number(),
      serviceName: z.string(), status: z.string(), expiresAt: isoDateSchema.nullable(),
    })).optional(),
  }),
  testimonials: z.object({
    items: z.array(z.object({
      id: objectIdSchema, rating: z.number().int().min(1).max(5), comment: z.string(),
      adminReply: z.string().nullable(), isApproved: z.boolean(), createdAt: isoDateSchema,
    })),
    totalCount: z.number().int(),
  }),
});

export type ClientOverviewQuery = z.infer<typeof clientOverviewQuerySchema>;
export type ClientOverview = z.infer<typeof clientOverviewSchema>;
export type ClientOverviewInsights = ClientOverview["insights"];
