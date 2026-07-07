import { describe, it, expect, vi } from "vitest";
import { EventBus } from "./bus";
import type { AppointmentCompletedEvent, ClientCheckinEvent } from "./contracts";

const apptEvent: AppointmentCompletedEvent = {
  type: "appointment_completed",
  tenantId: "t1",
  occurredAt: "2026-07-07T10:00:00.000Z",
  appointmentId: "a1",
  clientId: "c1",
  spend: 4500,
  serviceName: "Lash refill",
};

const checkinEvent: ClientCheckinEvent = {
  type: "client_checkin",
  tenantId: "t1",
  occurredAt: "2026-07-07T10:05:00.000Z",
  clientId: "c1",
  source: "qr",
};

describe("EventBus", () => {
  it("dostavlja event subscriber-u sa tačnim payload-om", async () => {
    const bus = new EventBus();
    const received: AppointmentCompletedEvent[] = [];
    bus.subscribe("appointment_completed", (e) => {
      received.push(e);
    });

    await bus.publish(apptEvent);

    expect(received).toHaveLength(1);
    expect(received[0].appointmentId).toBe("a1");
    expect(received[0].spend).toBe(4500);
  });

  it("fan-out: svi subscriber-i za tip dobiju event", async () => {
    const bus = new EventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.subscribe("appointment_completed", a);
    bus.subscribe("appointment_completed", b);

    await bus.publish(apptEvent);

    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("handler za jedan tip NE dobija drugi tip", async () => {
    const bus = new EventBus();
    const onAppt = vi.fn();
    bus.subscribe("appointment_completed", onAppt);

    await bus.publish(checkinEvent);

    expect(onAppt).not.toHaveBeenCalled();
  });

  it("unsubscribe zaustavlja dostavu", async () => {
    const bus = new EventBus();
    const handler = vi.fn();
    const off = bus.subscribe("client_checkin", handler);

    off();
    await bus.publish(checkinEvent);

    expect(handler).not.toHaveBeenCalled();
    expect(bus.subscriberCount("client_checkin")).toBe(0);
  });

  it("publish bez subscriber-a je no-op (ne baca)", async () => {
    const bus = new EventBus();
    await expect(bus.publish(apptEvent)).resolves.toBeUndefined();
  });

  it("error-izolacija: sinhroni throw i async reject ne ruše publish ni druge", async () => {
    const reporter = vi.fn();
    const bus = new EventBus(reporter);
    const good = vi.fn();

    bus.subscribe("appointment_completed", () => {
      throw new Error("sync boom");
    });
    bus.subscribe("appointment_completed", async () => {
      throw new Error("async boom");
    });
    bus.subscribe("appointment_completed", good);

    // publish NIKAD ne baca
    await expect(bus.publish(apptEvent)).resolves.toBeUndefined();
    // dobar handler je svejedno pozvan
    expect(good).toHaveBeenCalledTimes(1);
    // obe greške prijavljene reporter-u
    expect(reporter).toHaveBeenCalledTimes(2);
    expect(reporter.mock.calls[0][1]).toEqual({ type: "appointment_completed" });
  });

  it("subscriberCount prati broj registracija", () => {
    const bus = new EventBus();
    expect(bus.subscriberCount("voucher_used")).toBe(0);
    bus.subscribe("voucher_used", vi.fn());
    bus.subscribe("voucher_used", vi.fn());
    expect(bus.subscriberCount("voucher_used")).toBe(2);
  });
});
