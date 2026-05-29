import "server-only";

import { promises as dns } from "node:dns";
import { Resend } from "resend";
import { connectToDB } from "@/lib/db/mongodb";
import { resend as platformResend } from "@/lib/email/resend";
import { SalonProfile } from "@/models/SalonProfile";
import { Tenant } from "@/models/Tenant";
import { Types } from "mongoose";

export type EmailHostingProvider =
  | "none"
  | "zoho"
  | "google"
  | "microsoft"
  | "other";

export type EmailHostingStatus =
  | "not_configured"
  | "mx_detected"
  | "verified";

export type MxRecord = {
  exchange: string;
  priority: number;
};

export type EmailHostingCheck = {
  ok: boolean;
  provider: EmailHostingProvider;
  status: EmailHostingStatus;
  domain: string;
  records: MxRecord[];
};

export type TenantNewsletterSender = {
  client: Resend;
  from: string;
  replyTo?: string;
  usesTenantResend: boolean;
  usesTenantNewsletterSender: boolean;
};

type TenantEmailDoc = {
  customDomain?: string | null;
  customDomainVerified?: boolean;
};

type SalonEmailDoc = {
  name?: string;
  newsletterEmail?: string;
  contactEmail?: string;
  resendApiKey?: string;
};

const PLATFORM_NEWSLETTER_FROM =
  process.env.EMAIL_NEWSLETTER_FROM ||
  process.env.NEWSLETTER_FROM_EMAIL ||
  process.env.EMAIL_FROM ||
  "newsletter@marysoll.com";

function normalizeDomain(domain: string) {
  return domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function getEmailDomain(email?: string | null) {
  return email?.split("@")[1]?.trim().toLowerCase() || "";
}

function formatFrom(name: string | undefined, email: string) {
  return name ? `"${name}" <${email}>` : email;
}

function detectMxProvider(records: MxRecord[]): EmailHostingProvider {
  const exchanges = records.map((record) => record.exchange.toLowerCase());

  if (exchanges.some((exchange) => exchange.includes("zoho"))) return "zoho";
  if (
    exchanges.some(
      (exchange) =>
        exchange.includes("google") || exchange.includes("aspmx.l.google.com"),
    )
  ) {
    return "google";
  }
  if (
    exchanges.some(
      (exchange) =>
        exchange.includes("outlook") ||
        exchange.includes("protection.outlook.com") ||
        exchange.includes("microsoft"),
    )
  ) {
    return "microsoft";
  }
  return records.length ? "other" : "none";
}

export async function checkEmailMx(
  domain: string,
): Promise<EmailHostingCheck> {
  const normalizedDomain = normalizeDomain(domain);

  try {
    const records = await dns.resolveMx(normalizedDomain);
    const provider = detectMxProvider(records);

    return {
      ok: provider !== "none",
      provider,
      status: provider === "none" ? "not_configured" : "mx_detected",
      domain: normalizedDomain,
      records,
    };
  } catch {
    return {
      ok: false,
      provider: "none",
      status: "not_configured",
      domain: normalizedDomain,
      records: [],
    };
  }
}

export async function checkZohoMx(domain: string) {
  const mx = await checkEmailMx(domain);
  return {
    ok: mx.provider === "zoho",
    records: mx.records,
  };
}

export function canUseTenantNewsletterSender(
  tenant: TenantEmailDoc | null | undefined,
  profile: SalonEmailDoc | null | undefined,
) {
  if (!profile?.resendApiKey || !profile.newsletterEmail) return false;

  const customDomain = tenant?.customDomain
    ? normalizeDomain(tenant.customDomain)
    : "";
  const senderDomain = getEmailDomain(profile.newsletterEmail);

  return Boolean(
    customDomain &&
      senderDomain === customDomain &&
      tenant?.customDomainVerified,
  );
}

export async function resolveTenantNewsletterSender(
  tenantId: string | Types.ObjectId | null | undefined,
): Promise<TenantNewsletterSender> {
  if (!tenantId) {
    return {
      client: platformResend,
      from: PLATFORM_NEWSLETTER_FROM,
      usesTenantResend: false,
      usesTenantNewsletterSender: false,
    };
  }

  await connectToDB();
  const tenantObjectId =
    typeof tenantId === "string" ? new Types.ObjectId(tenantId) : tenantId;

  const [tenant, profile] = await Promise.all([
    Tenant.findById(tenantObjectId)
      .select("customDomain customDomainVerified")
      .lean<TenantEmailDoc | null>(),
    SalonProfile.findOne({ tenantId: tenantObjectId })
      .select("name newsletterEmail contactEmail resendApiKey")
      .lean<SalonEmailDoc | null>(),
  ]);

  const canUseTenantSender = canUseTenantNewsletterSender(tenant, profile);

  if (canUseTenantSender && profile?.resendApiKey && profile.newsletterEmail) {
    return {
      client: new Resend(profile.resendApiKey),
      from: formatFrom(profile.name, profile.newsletterEmail),
      replyTo: profile.contactEmail || profile.newsletterEmail,
      usesTenantResend: true,
      usesTenantNewsletterSender: true,
    };
  }

  return {
    client: platformResend,
    from: PLATFORM_NEWSLETTER_FROM,
    replyTo: profile?.contactEmail,
    usesTenantResend: false,
    usesTenantNewsletterSender: false,
  };
}

export async function getSalonContactEmail(
  tenantId: string | Types.ObjectId | null | undefined,
) {
  if (!tenantId) return null;
  await connectToDB();
  const tenantObjectId =
    typeof tenantId === "string" ? new Types.ObjectId(tenantId) : tenantId;
  const profile = await SalonProfile.findOne({ tenantId: tenantObjectId })
    .select("contactEmail email")
    .lean<{ contactEmail?: string; email?: string } | null>();

  return profile?.contactEmail || profile?.email || null;
}
