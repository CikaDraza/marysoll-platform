/**
 * Deep-link iz zvonca — regresija "[object Object]" u URL-u.
 *
 * `/api/notifications` je nekada radio `.populate("appointmentId")`, pa je
 * polje stizalo kao ceo dokument. Template string ga je pretvarao u
 * "[object Object]", server je takav id odbijao sa 400, i skok na termin
 * nikad nije radio. Tip je tvrdio `string`, pa kompajler nije primetio.
 */
import { describe, it, expect } from "vitest";
import { getNotificationHref } from "./NotificationBell";
import type { INotification } from "@/types";

function notif(partial: Partial<INotification>): INotification {
  return {
    _id: "n1",
    type: "appointment_approved",
    title: "",
    message: "",
    isRead: false,
    metadata: {},
    createdAt: "",
    updatedAt: "",
    ...partial,
  } as INotification;
}

describe("getNotificationHref", () => {
  it("admin: id termina ide u URL", () => {
    const href = getNotificationHref(
      notif({ appointmentId: "65f000000000000000000abc" }),
      true,
    );
    expect(href).toBe(
      "/dashboard?tab=termini&appointmentId=65f000000000000000000abc",
    );
  });

  it("REGRESIJA: populisan dokument daje id, ne [object Object]", () => {
    const href = getNotificationHref(
      notif({
        appointmentId: {
          _id: "65f000000000000000000abc",
          serviceName: "Izlivanje",
        } as unknown as string,
      }),
      true,
    );
    expect(href).not.toContain("[object");
    expect(href).toContain("appointmentId=65f000000000000000000abc");
  });

  it("bez termina: samo tab, bez praznog parametra", () => {
    expect(getNotificationHref(notif({}), true)).toBe("/dashboard?tab=termini");
  });

  it("klijent: vodi na svoj tab (bez deep-linka na termin)", () => {
    const href = getNotificationHref(
      notif({ appointmentId: "65f000000000000000000abc" }),
      false,
      "",
    );
    expect(href).toBe("/panel?tab=Moji%20Termini");
  });

  it("podsetnik za označavanje termina nosi id", () => {
    const href = getNotificationHref(
      notif({
        type: "loyalty_completion_prompt",
        appointmentId: { _id: "65f000000000000000000abc" } as unknown as string,
      }),
      true,
    );
    expect(href).toBe(
      "/dashboard?tab=termini&appointmentId=65f000000000000000000abc",
    );
  });

  it("chat vodi na chat tab", () => {
    expect(getNotificationHref(notif({ type: "chat_message" }), true)).toBe(
      "/dashboard?tab=chat",
    );
  });
});
