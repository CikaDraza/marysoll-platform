import type { INotification } from "@/types";

/** Legacy chat notifications have no source; keep them in the support section. */
export function isMarysollSupportNotification(
  notification: Pick<INotification, "type" | "title" | "metadata">,
): boolean {
  return (
    notification.type === "chat_message" &&
    (notification.metadata?.source === "marysoll_support" ||
      (!notification.metadata?.source && notification.title === "Marysoll podrška"))
  );
}
