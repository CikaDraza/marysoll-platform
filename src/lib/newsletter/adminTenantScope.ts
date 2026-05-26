import "server-only";

import { Types } from "mongoose";
import { AuthUser } from "@/models/AuthUser";
import { connectToDB } from "@/lib/db/mongodb";
import type { DecodedToken } from "@/types/auth/types";

export type NewsletterAdminScope =
  | {
      scope: "tenant";
      tenantId: string;
      platformOwnerId?: never;
    }
  | {
      scope: "platform";
      tenantId?: never;
      platformOwnerId: string;
    };

function isValidObjectId(value: string | null | undefined) {
  return Boolean(value && Types.ObjectId.isValid(value));
}

export async function resolveNewsletterAdminScope(
  request: Request,
  decoded: DecodedToken,
): Promise<NewsletterAdminScope | null> {
  const requestedScope = request.headers.get("x-newsletter-scope")?.trim();

  if (requestedScope === "platform") {
    if (!decoded.isSuperAdmin || !isValidObjectId(decoded.id)) return null;

    await connectToDB();
    const authUser = await AuthUser.findById(decoded.id)
      .select("platformRole")
      .lean<{ platformRole?: string } | null>();

    if (authUser?.platformRole !== "SUPER_ADMIN") return null;

    return {
      scope: "platform",
      platformOwnerId: decoded.id,
    };
  }

  if (decoded.isSuperAdmin) {
    const scopedTenantId = request.headers
      .get("x-superadmin-tenant-id")
      ?.trim();

    return isValidObjectId(scopedTenantId)
      ? {
          scope: "tenant",
          tenantId: scopedTenantId!,
        }
      : null;
  }

  return isValidObjectId(decoded.tenantId)
    ? {
        scope: "tenant",
        tenantId: decoded.tenantId!,
      }
    : null;
}

export function newsletterScopeFilter(scope: NewsletterAdminScope) {
  if (scope.scope === "platform") {
    return {
      scope: "platform",
      platformOwnerId: new Types.ObjectId(scope.platformOwnerId),
      $or: [{ tenantId: { $exists: false } }, { tenantId: null }],
    };
  }

  return {
    tenantId: new Types.ObjectId(scope.tenantId),
    $or: [{ scope: "tenant" }, { scope: { $exists: false } }],
  };
}
