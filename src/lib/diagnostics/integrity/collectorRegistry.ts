import "server-only";

import type {
  IntegrityCheckKeyForScope,
} from "@/lib/platform/diagnostic-client";
import type {
  IntegrityCollector,
  PlatformIntegrityCollector,
} from "./collectors/types";
import { collectDuplicates } from "./collectors/duplicates";
import { collectMergedReferences } from "./collectors/mergedReferences";
import { collectInvalidReferences } from "./collectors/invalidReferences";
import { collectAccountOrphans } from "./collectors/accountOrphans";
import { collectAccountDuplicates } from "./collectors/accountDuplicates";
import { collectLedgerMismatch } from "./collectors/ledgerMismatch";
import { collectBalanceMismatch } from "./collectors/balanceMismatch";
import { collectVoucherOwner } from "./collectors/voucherOwner";
import { collectAppointmentClient } from "./collectors/appointmentClient";
import { collectPushSubscriptions } from "./collectors/pushSubscriptions";
import { collectSeoHealth } from "./collectors/seoHealth";
import { collectTenantOwnershipMissing } from "./collectors/tenantOwnershipMissing";
import { collectPlatformOrphanOwners } from "./collectors/platformOrphanOwners";
import { collectWebhookStuck } from "./collectors/webhookStuck";

export const TENANT_INTEGRITY_COLLECTORS = {
  "client.identity.duplicates": collectDuplicates,
  "client.identity.mergedReferences": collectMergedReferences,
  "client.identity.invalidReferences": collectInvalidReferences,
  "loyalty.account.orphans": collectAccountOrphans,
  "loyalty.account.duplicates": collectAccountDuplicates,
  "loyalty.ledger.mismatch": collectLedgerMismatch,
  "loyalty.balance.mismatch": collectBalanceMismatch,
  "voucher.owner.invalid": collectVoucherOwner,
  "appointment.client.invalid": collectAppointmentClient,
  "seo.tenant.metadata": collectSeoHealth,
  "tenant.ownership.missing": collectTenantOwnershipMissing,
  "notifications.push.subscriptions": collectPushSubscriptions,
} satisfies Record<IntegrityCheckKeyForScope<"tenant">, IntegrityCollector>;

export const PLATFORM_INTEGRITY_COLLECTORS = {
  "tenant.ownership.orphanAccount": collectPlatformOrphanOwners,
  "payments.webhook.stuck": collectWebhookStuck,
} satisfies Record<
  IntegrityCheckKeyForScope<"platform">,
  PlatformIntegrityCollector
>;
