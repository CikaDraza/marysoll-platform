export type NewsletterClientScope =
  | { scope: "tenant"; tenantId?: string }
  | { scope: "platform" };

export function getNewsletterScopeKey(scope?: NewsletterClientScope) {
  if (!scope) return "current";
  if (scope.scope === "platform") return "platform";
  return scope.tenantId ? `tenant:${scope.tenantId}` : "tenant:current";
}

export function getNewsletterScopeHeaders(
  scope?: NewsletterClientScope,
): Record<string, string> {
  if (!scope) return {};

  if (scope.scope === "platform") {
    return { "x-newsletter-scope": "platform" };
  }

  if (scope.tenantId) {
    return { "x-superadmin-tenant-id": scope.tenantId };
  }

  return {};
}
