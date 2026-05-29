import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth-server";
import { connectToDB } from "@/lib/db/mongodb";
import {
  checkZohoInboxExists,
  getZohoAccountAndDomainVerification,
} from "@/lib/zoho/zoho-mail-admin";
import { checkEmailMx } from "@/lib/email/tenantEmailSettings";
import { Tenant } from "@/models/Tenant";

const INBOX_PREFIXES = ["booking", "kontakt", "support", "newsletter"] as const;

export async function POST(req: NextRequest) {
  try {
    const auth = requireAdmin(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.success) return auth.response;

    const tenantId = auth.decoded.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
    }

    await connectToDB();
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant nije pronađen" }, { status: 404 });
    }

    const domain = tenant.customDomain ? String(tenant.customDomain) : "";
    if (!domain) {
      tenant.emailInboxProvider = "none";
      tenant.emailInboxStatus = "not_configured";
      tenant.verifiedInboxEmails = [];
      tenant.emailHostingProvider = "none";
      tenant.emailHostingStatus = "not_configured";
      tenant.emailInboxDomain = "";
      await tenant.save();

      return NextResponse.json(
        { error: "Custom domen nije podešen za ovaj salon." },
        { status: 400 },
      );
    }

    const mx = await checkEmailMx(domain);
    const inboxEmails = INBOX_PREFIXES.map((prefix) => `${prefix}@${domain}`);
    let zohoOrgId = tenant.zohoOrgId ? String(tenant.zohoOrgId) : "";
    let accountVerified = false;
    let domainDetected = mx.provider === "zoho";
    let domainVerified = false;

    const results =
      mx.provider === "zoho"
        ? await (async () => {
            try {
              const zohoStatus = await getZohoAccountAndDomainVerification({
                domain,
                organizationId: zohoOrgId || undefined,
              });
              zohoOrgId = zohoStatus.account.organizationId ?? zohoOrgId;
              accountVerified = zohoStatus.account.verified;
              domainDetected = zohoStatus.domain.found || domainDetected;
              domainVerified = zohoStatus.domain.verified;

              if (!zohoOrgId) {
                throw new Error("Zoho org ID nije pronađen.");
              }

              return await Promise.all(
                inboxEmails.map(async (email) => {
                  const exists = await checkZohoInboxExists({
                    orgId: zohoOrgId,
                    email,
                  });

                  return {
                    email,
                    exists,
                    message: exists
                      ? `✓ ${email} exists in Zoho`
                      : "⚠ Zoho domain detected, but this mailbox/alias was not found",
                  };
                }),
              );
            } catch (error) {
              console.error("[verify-inbox] Zoho mailbox check skipped:", error);
              return inboxEmails.map((email) => ({
                email,
                exists: false,
                message:
                  "⚠ Zoho MX detected, but mailbox verification is not configured",
              }));
            }
          })()
        : inboxEmails.map((email) => ({
            email,
            exists: false,
            message: mx.ok
              ? "⚠ Email hosting detected, but verified inbox check is only available for Zoho"
              : "⚠ Inbox is not configured. Replies will go to salon contact email.",
          }));

    const verifiedInboxEmails = results
      .filter((result) => result.exists)
      .map((result) => result.email);

    tenant.zohoOrgId = zohoOrgId;
    tenant.emailInboxProvider = mx.provider === "zoho" ? "zoho" : "none";
    tenant.emailInboxStatus = verifiedInboxEmails.length
      ? "mailbox_verified"
      : mx.ok
        ? "mx_detected"
        : "not_configured";
    tenant.verifiedInboxEmails = verifiedInboxEmails;
    tenant.emailHostingProvider = mx.provider;
    tenant.emailHostingStatus = verifiedInboxEmails.length
      ? "verified"
      : mx.ok
        ? "mx_detected"
        : "not_configured";
    tenant.emailInboxDomain = domain;
    await tenant.save();

    return NextResponse.json({
      domain,
      zohoOrgId,
      accountVerified,
      domainDetected,
      domainVerified,
      emailInboxProvider: tenant.emailInboxProvider,
      emailInboxStatus: tenant.emailInboxStatus,
      emailHostingProvider: tenant.emailHostingProvider,
      emailHostingStatus: tenant.emailHostingStatus,
      emailInboxDomain: tenant.emailInboxDomain,
      mxRecords: mx.records,
      verifiedInboxEmails,
      results,
    });
  } catch (err) {
    console.error("POST /api/tenants/verify-inbox:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 },
    );
  }
}
