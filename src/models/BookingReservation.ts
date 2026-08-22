import { Schema, model, models, type InferSchemaType } from "mongoose";
import { RESERVATION_STATUSES } from "@/lib/booking/contracts";

const actorSchema = new Schema(
  {
    type: {
      type: String,
      enum: ["owner", "admin", "staff", "client", "guest", "system"],
      required: true,
    },
    id: { type: String, required: true },
  },
  { _id: false },
);

const bookingReservationSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    resourceKey: { type: String, required: true },
    productType: {
      type: String,
      enum: ["service", "consultation", "education_session"],
      required: true,
    },
    productRef: { type: String, required: true },
    clientRef: { type: String, required: true },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    timezone: { type: String, required: true },
    localDate: { type: String, required: true },
    status: { type: String, enum: RESERVATION_STATUSES, required: true },
    source: {
      type: String,
      enum: ["admin", "authenticated_client", "public_guest", "marketplace", "system"],
      required: true,
    },
    domainRef: {
      type: { type: String, required: true },
      id: { type: String, required: true },
    },
    productSnapshot: { type: Schema.Types.Mixed, required: true },
    quoteSnapshot: { type: Schema.Types.Mixed },
    creationCommand: {
      idempotencyKey: { type: String, required: true },
      fingerprint: { type: String, required: true },
    },
    bookingFacts: { type: Schema.Types.Mixed, required: true },
    overrideAudit: { type: Schema.Types.Mixed },
    lateCancellationAt: { type: Date },
    lifecycleVersion: { type: Number, required: true, min: 1 },
    createdBy: { type: actorSchema, required: true },
  },
  { timestamps: true },
);

bookingReservationSchema.index(
  { tenantId: 1, resourceKey: 1, localDate: 1, status: 1, startsAt: 1 },
  { name: "booking_reservation_active_scope" },
);
bookingReservationSchema.index(
  { tenantId: 1, clientRef: 1, startsAt: -1 },
  { name: "booking_reservation_client" },
);
bookingReservationSchema.index(
  { tenantId: 1, "domainRef.type": 1, "domainRef.id": 1 },
  { unique: true, name: "booking_reservation_domain_unique" },
);

export type BookingReservationDocument = InferSchemaType<typeof bookingReservationSchema>;

export const BookingReservation =
  models.BookingReservation ||
  model("BookingReservation", bookingReservationSchema);
