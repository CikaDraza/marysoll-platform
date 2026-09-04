import { describe, expect, it } from "vitest";
import {
  bookingDefaultsFromAppointment,
  bookingIntakeChanged,
  bookingPresentationRequiresIntake,
} from "./widgetPresentation";
import { estimateServicePrice } from "@/helpers/servicePrice";
import type { IAppointment, IService } from "@/types";

function service(partial: Partial<IService> = {}): IService {
  return {
    _id: "service-1",
    name: "Izlivanje",
    category: "Nokti",
    type: "variant",
    description: "",
    items: [],
    variants: [
      { name: "Veličina 3", price: 0, duration: 120, perItem: false },
    ],
    extras: [
      {
        name: "Stiker",
        price: 700,
        duration: 10,
        perItem: true,
        allowQuantity: true,
      },
    ],
    subscription: { enabled: false },
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as IService;
}

function appointment(): IAppointment {
  return {
    _id: "appointment-1",
    clientName: "Marija",
    clientEmail: "marija@example.com",
    serviceName: "Izlivanje - Veličina 3",
    services: [
      {
        serviceId: "service-1",
        serviceName: "Veličina 3",
        variants: [
          { name: "Veličina 3", price: 0, duration: 120, perItem: false },
        ],
        extras: [
          {
            name: "Stiker",
            price: 1400,
            duration: 20,
            perItem: true,
            quantity: 2,
          },
        ],
        quantity: 1,
        price: 1400,
        duration: 140,
      },
    ],
    request: { note: "Badem oblik", referenceUrl: "https://example.com/ref" },
    duration: 140,
    date: "2026-09-18",
    time: "14:30",
    note: "Pozvati pre termina",
    status: "pending",
    messages: [],
    adminNotified: true,
    clientNotified: false,
  };
}

describe("BookingWidget presentation contract", () => {
  it("čita tačan javni oblik `{ intakeEnabled: true }` bez bookingIntake", () => {
    expect(bookingPresentationRequiresIntake({ intakeEnabled: true })).toBe(true);
    expect(bookingPresentationRequiresIntake({ intakeEnabled: false })).toBe(false);
    expect(bookingPresentationRequiresIntake({})).toBe(false);
  });

  it("edit dobija isti datum, vreme, varijantu, dodatke i intake", () => {
    expect(bookingDefaultsFromAppointment(appointment(), [service()])).toEqual({
      date: "2026-09-18",
      time: "14:30",
      serviceId: "service-1",
      variantName: "Veličina 3",
      extras: [{ name: "Stiker", quantity: 2 }],
      note: "Pozvati pre termina",
      intakeNote: "Badem oblik",
      intakeReferenceUrl: "https://example.com/ref",
      intakeImage: null,
    });
  });

  it("date/time-only edit ne proizvodi request izmenu", () => {
    const original = appointment().request;
    expect(
      bookingIntakeChanged(original, {
        note: "Badem oblik",
        referenceUrl: "https://example.com/ref",
        image: null,
      }),
    ).toBe(false);
    expect(
      bookingIntakeChanged(original, {
        note: "Badem oblik sa frenchom",
        referenceUrl: "https://example.com/ref",
        image: null,
      }),
    ).toBe(true);
  });

  it("on-request osnova sa dodatkom ostaje cena na upit", () => {
    const estimate = estimateServicePrice({
      service: service({
        type: "single",
        variants: undefined,
        priceMode: "on_request",
        basePrice: null,
      }),
      extras: [{ name: "Stiker", quantity: 2 }],
    });
    expect(estimate.total).toBeNull();
    expect(estimate.knownAddonsTotal).toBe(1400);
  });
});
