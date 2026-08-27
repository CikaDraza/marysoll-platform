import "server-only";

import { Types } from "mongoose";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { addEducationCapabilityConfiguration } from "@/lib/platform/capabilities";
import type {
  TenantCapabilityConfiguration,
  TenantVertical,
} from "@/types/tenant-capabilities";

type ProvisionableTenant = {
  verticals?: TenantVertical[];
  capabilityConfiguration?: TenantCapabilityConfiguration;
};

/**
 * F0 backend ugovor za budući CTA „Aktiviraj Edu Centar”.
 *
 * Menja samo capability state ISTOG Tenant-a. Ne kreira Tenant, TenantUser ili
 * Subscription i ne dodiruje SalonProfile/branding. UI aktivacija ostaje
 * zaključana do Faze 5.
 */
export async function provisionEducationWorkspace(
  tenantId: string | Types.ObjectId,
): Promise<boolean> {
  await connectToDB();
  const tenant = (await Tenant.findById(tenantId)
    .select("verticals capabilityConfiguration")
    .lean()) as ProvisionableTenant | null;
  if (!tenant) return false;

  const next = addEducationCapabilityConfiguration(tenant);
  const result = await Tenant.updateOne(
    { _id: tenantId },
    {
      $set: {
        verticals: next.verticals,
        capabilityConfiguration: next.capabilityConfiguration,
      },
    },
  );
  return result.matchedCount === 1;
}
