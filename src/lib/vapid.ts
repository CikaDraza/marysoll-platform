// lib/vapid.ts
export function getVapidKeys() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const email = process.env.NEXT_PUBLIC_VAPID_EMAIL || "pantelyasm@gmail.com";

  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are not configured. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables."
    );
  }

  return { publicKey, privateKey, email };
}

// Funkcija za konverziju public key u Uint8Array (potrebno za pretplatu)
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  if (typeof window === "undefined") {
    return new Uint8Array();
  }

  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
