import "server-only";

// Lagana server-side provera roda klijentele po tenantId — za mesta koja nemaju
// već učitan SalonProfile (npr. email šabloni). Default "neutral" na svaku grešku.

import { SalonProfile } from "@/models/SalonProfile";
import type { ClientGender } from "@/types";

export async function getSalonClientGender(
  tenantId: string | null | undefined,
): Promise<ClientGender> {
  if (!tenantId) return "neutral";
  try {
    const profile = (await SalonProfile.findOne({ tenantId })
      .select("clientGender")
      .lean()) as { clientGender?: ClientGender } | null;
    return profile?.clientGender === "female" ? "female" : "neutral";
  } catch {
    return "neutral";
  }
}
