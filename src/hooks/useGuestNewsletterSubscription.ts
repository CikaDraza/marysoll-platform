"use server";

import { subscribeToNewsletter } from "@/lib/newsletterService";

// Opcionalno: ako želiš da vratiš poruku greške umesto redirect-a
export async function useGuestNewsletterSubscription(
  prevState: { message: string; success: boolean } | null,
  formData: FormData,
): Promise<{ message: string; success: boolean }> {
  const emailValue = formData.get("email");

  if (typeof emailValue !== "string" || !emailValue.trim()) {
    return { message: "Molimo unesite validan email", success: false };
  }

  const email = emailValue.trim();
  const tenantIdValue = formData.get("tenantId");
  const tenantId = typeof tenantIdValue === "string" && tenantIdValue.trim()
    ? tenantIdValue.trim()
    : undefined;

  try {
    const result = await subscribeToNewsletter({
      email,
      source: "footer",
      tenantId,
    });

    if (!result.success) {
      return { message: result.message, success: false };
    }

    return {
      message: "Proverite email da potvrdite pretplatu!",
      success: true,
    };
  } catch (error: unknown) {
    return {
      message: `Greška u komunikaciji sa serverom - ${error}`,
      success: false,
    };
  }
}
