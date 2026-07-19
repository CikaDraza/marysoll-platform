import { z } from "zod";

/** Bezbedan javni prikaz odobrenog testimoniala na tenant sajtu. */
export const publicTestimonialSchema = z.object({
  _id: z.string().min(1),
  clientName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  adminReply: z.string().optional(),
});

export type PublicTestimonial = z.infer<typeof publicTestimonialSchema>;

export const publicTestimonialsPageSchema = z.object({
  testimonials: z.array(publicTestimonialSchema).max(3),
  hasMore: z.boolean(),
});

export type PublicTestimonialsPage = z.infer<
  typeof publicTestimonialsPageSchema
>;

/** Tema 8 namerno izlaže samo dve stranice po tri najnovija utiska. */
export const theme8TestimonialsQuerySchema = z.object({
  offset: z.coerce
    .number()
    .int()
    .refine((value) => value === 0 || value === 3)
    .default(0),
  limit: z.coerce.number().int().min(1).max(3).default(3),
});

export const publicTenantSlugSchema = z.object({
  tenantSlug: z.string().regex(/^[a-z0-9-]{1,100}$/),
});
