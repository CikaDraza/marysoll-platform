/**
 * PUT /api/tenants/custom-domain
 *
 * 1. Validira domain format
 * 2. Čuva u DB
 * 3. Automatski dodaje u Vercel via API
 * 4. Vraća DNS instrukcije vlasniku
 */
import { NextRequest, NextResponse } from "next/server";
import { connectToDB } from "@/lib/db/mongodb";
import { Tenant } from "@/models/Tenant";
import { requireAdmin } from "@/lib/auth/auth-server";

// ─── Vercel API helpers ───────────────────────────────────────────────────────

async function addDomainToVercel(domain: string): Promise<{
  success: boolean;
  error?: string;
  alreadyExists?: boolean;
}> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    console.warn(
      "VERCEL_API_TOKEN or VERCEL_PROJECT_ID not set — skipping auto-add",
    );
    return { success: false, error: "Vercel API nije konfigurisano" };
  }

  const url = teamId
    ? `https://api.vercel.com/v10/projects/${projectId}/domains?teamId=${teamId}`
    : `https://api.vercel.com/v10/projects/${projectId}/domains`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: domain }),
  });

  const data = await res.json();

  if (res.ok) return { success: true };

  // Domain already in project
  if (data.error?.code === "domain_already_in_use") {
    return { success: true, alreadyExists: true };
  }

  console.error("Vercel domain add error:", data);
  return { success: false, error: data.error?.message ?? "Vercel API greška" };
}

async function removeDomainFromVercel(domain: string): Promise<void> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return;

  const url = teamId
    ? `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
    : `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;

  await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  }).catch(console.error);
}

async function getDomainVercelStatus(domain: string): Promise<{
  verified: boolean;
  verification?: {
    type: string;
    domain: string;
    value: string;
    reason: string;
  }[];
}> {
  const token = process.env.VERCEL_API_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) return { verified: false };

  const url = teamId
    ? `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}?teamId=${teamId}`
    : `https://api.vercel.com/v9/projects/${projectId}/domains/${domain}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return { verified: false };
  const data = await res.json();
  return {
    verified: data.verified ?? false,
    verification: data.verification,
  };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function PUT(req: NextRequest) {
  try {
    await connectToDB();

    const auth = await requireAdmin(req);
    if (!auth.success) return auth.response;
    if (auth instanceof NextResponse) return auth;
    const { decoded } = auth;

    if (!decoded.tenantId) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 400 },
      );
    }

    const { customDomain } = await req.json();
    const normalized =
      customDomain
        ?.trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "") || null;

    // ── Remove custom domain ─────────────────────────────────────────────────
    if (!normalized) {
      const existing = (await Tenant.findById(decoded.tenantId)
        .select("customDomain")
        .lean()) as Record<string, unknown> | null;
      const oldDomain = existing?.customDomain as string | null;

      await Tenant.findByIdAndUpdate(decoded.tenantId, {
        $set: { customDomain: null, customDomainVerified: false },
      });

      // Remove from Vercel too
      if (oldDomain) await removeDomainFromVercel(oldDomain);

      return NextResponse.json({
        success: true,
        message: "Custom domen je uklonjen.",
      });
    }

    // ── Validate format ──────────────────────────────────────────────────────
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z]{2,})+$/;
    if (!domainRegex.test(normalized)) {
      return NextResponse.json(
        { error: "Neispravan format domena. Primer: kikikiss.beauty" },
        { status: 400 },
      );
    }

    // ── Check uniqueness ─────────────────────────────────────────────────────
    const conflicting = await Tenant.findOne({
      customDomain: normalized,
      _id: { $ne: decoded.tenantId },
    }).lean();

    if (conflicting) {
      return NextResponse.json(
        { error: "Ovaj domen je već registrovan za drugi salon." },
        { status: 409 },
      );
    }

    // ── Save to DB ───────────────────────────────────────────────────────────
    await Tenant.findByIdAndUpdate(decoded.tenantId, {
      $set: { customDomain: normalized, customDomainVerified: false },
    });

    // ── Add to Vercel ────────────────────────────────────────────────────────
    const vercelResult = await addDomainToVercel(normalized);

    // ── Get DNS instructions ─────────────────────────────────────────────────
    const vercelStatus = await getDomainVercelStatus(normalized);

    return NextResponse.json({
      success: true,
      customDomain: normalized,
      vercelAdded: vercelResult.success,
      vercelError: vercelResult.error,
      message: vercelResult.success
        ? "Domen je sačuvan i dodat u Vercel. Podesite DNS zapise."
        : `Domen je sačuvan u bazi, ali Vercel dodavanje nije uspelo: ${vercelResult.error}`,
      // DNS instructions for the salon owner
      dnsInstructions: {
        type: "A",
        name: "@",
        value: "76.76.21.21",
        note: "Ili CNAME @ → cname.vercel-dns.com (ako vaš registrar dozvoljava CNAME na root)",
      },
      vercelVerification: vercelStatus.verification ?? null,
    });
  } catch (err) {
    console.error("PUT /api/tenants/custom-domain:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ─── GET — provjeri verifikaciju ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectToDB();
    const auth = await requireAdmin(req);
    if (!auth.success) {
      return auth.response;
    }
    if (auth instanceof NextResponse) return auth;
    const { decoded } = auth;

    if (!decoded.tenantId) {
      return NextResponse.json(
        { error: "Tenant nije pronađen" },
        { status: 400 },
      );
    }

    const tenant = (await Tenant.findById(decoded.tenantId)
      .select("customDomain customDomainVerified")
      .lean()) as Record<string, unknown> | null;

    if (!tenant?.customDomain) {
      return NextResponse.json({ customDomain: null, verified: false });
    }

    const domain = tenant.customDomain as string;
    const vercelStatus = await getDomainVercelStatus(domain);

    // Auto-update verified status in DB if Vercel confirms
    if (vercelStatus.verified && !tenant.customDomainVerified) {
      await Tenant.findByIdAndUpdate(decoded.tenantId, {
        $set: { customDomainVerified: true },
      });
    }

    return NextResponse.json({
      customDomain: domain,
      verified: vercelStatus.verified,
      verification: vercelStatus.verification,
    });
  } catch (err) {
    console.error("GET /api/tenants/custom-domain:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
