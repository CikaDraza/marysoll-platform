export type BookingErrorCode =
  | "BOOKING_CONFLICT"
  | "BOOKING_SLOT_NOT_AVAILABLE"
  | "BOOKING_INVALID_INTERVAL"
  | "BOOKING_PRODUCT_NOT_AVAILABLE"
  | "BOOKING_RESOURCE_NOT_AVAILABLE"
  | "BOOKING_CAPABILITY_DENIED"
  | "BOOKING_PERMISSION_DENIED"
  | "BOOKING_IDEMPOTENCY_CONFLICT"
  | "BOOKING_RESERVATION_NOT_FOUND"
  | "BOOKING_INVALID_STATE"
  | "BOOKING_INFRASTRUCTURE_UNAVAILABLE";

export class BookingError extends Error {
  constructor(
    readonly code: BookingErrorCode,
    message: string,
    readonly reason?: string,
  ) {
    super(message);
    this.name = "BookingError";
  }
}
