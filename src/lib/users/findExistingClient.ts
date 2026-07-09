import "server-only";

// ─── Guest→Registered: nalaženje postojećeg klijenta (prevencija duplikata) ───
// Traži klijentski nalog (USER ili GUEST) u tenantu po EMAIL ILI TELEFONU
// (normalizovano). Koristi ga check-client endpoint (signal klijentu) i
// findOrCreateGuestUser. Ne matchuje OWNER/ADMIN/STAFF.

import { Types } from "mongoose";
import { TenantUser } from "@/models/TenantUser";
import { normalizePhone } from "@/helpers/normalizePhone";

export interface ExistingClient {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  /** true = registrovan nalog (role !== "GUEST"). */
  isRegistered: boolean;
}

export async function findExistingClient(input: {
  tenantId: Types.ObjectId | string;
  email?: string;
  phone?: string;
}): Promise<ExistingClient | null> {
  const email = (input.email ?? "").trim().toLowerCase();
  const phone = normalizePhone(input.phone ?? "");

  const or: Record<string, unknown>[] = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  if (or.length === 0) return null;

  // Registrovani (USER) ima prioritet nad gostom pri poklapanju — da signal
  // klijentu tačno kaže "imate nalog". "USER" > "GUEST" abecedno → desc.
  const user = await TenantUser.findOne({
    tenantId: input.tenantId,
    role: { $in: ["USER", "GUEST"] },
    $or: or,
  })
    .sort({ role: -1 })
    .select("name email phone role")
    .lean<{
      _id: Types.ObjectId;
      name?: string;
      email?: string;
      phone?: string;
      role: string;
    } | null>();

  if (!user) return null;
  return {
    _id: String(user._id),
    name: user.name ?? "",
    email: user.email ?? "",
    phone: user.phone ?? "",
    role: user.role,
    isRegistered: user.role !== "GUEST",
  };
}
