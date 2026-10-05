import { z } from "zod";
import { commercialSubscriptionStateSchema } from "@/types/commercial-subscription";
import type { CommercialReadResult } from "@/types/commercial-subscription";

const key = z.string().min(1).max(200);
const revision = z.number().int().positive().max(Number.MAX_SAFE_INTEGER);
const timestamp = z.iso.datetime();
export const commercialEnvironmentSchema = z.enum(["production", "staging", "qa"]);
export const commercialActionSchema = z.enum([
  "account.read", "subscription.read", "usage.read", "diagnostics.summary.read",
  "campaign.summary.read", "audience.aggregate.read", "campaign.draft.create",
  "campaign.draft.edit", "campaign.draft.duplicate", "campaign.approval.request",
]);
export type CommercialAction = z.infer<typeof commercialActionSchema>;
export type CommercialEnvironment = z.infer<typeof commercialEnvironmentSchema>;

/** This schema describes VERIFIED evidence. Parsing a token is never verification. */
export const commercialPrincipalSchema = z.object({
  schemaVersion: z.literal(1), issuer: key, audience: z.literal("marysoll-commercial"),
  subject: key, serviceCaller: key, actingFor: key, environment: commercialEnvironmentSchema,
  status: z.literal("active"), revision, assertionId: key,
  issuedAt: timestamp, notBefore: timestamp, expiresAt: timestamp, checkedAt: timestamp,
  actions: z.array(commercialActionSchema).max(10),
}).strict();
export type CommercialPrincipal = Readonly<z.infer<typeof commercialPrincipalSchema>>;

export const commercialAssignmentSchema = z.object({
  assignmentId: key, revision, subject: key, dmdAccountId: key, bindingId: key,
  bindingRevision: revision, environment: commercialEnvironmentSchema,
  status: z.enum(["active", "suspended", "revoked"]),
  expiresAt: timestamp,
}).strict();

export const productAccountBindingSchema = z.object({
  bindingId: key, dmdAccountId: key, productKey: z.literal("marysoll"),
  tenantId: z.string().regex(/^[a-f\d]{24}$/), environment: commercialEnvironmentSchema,
  status: z.enum(["pending", "active", "suspended", "revoked"]), revision,
  createdAt: timestamp, updatedAt: timestamp, verifiedAt: timestamp, verifiedBy: key,
  revokedAt: timestamp.nullable(), reasonCode: key.nullable(),
}).strict();
export type ProductAccountBinding = Readonly<z.infer<typeof productAccountBindingSchema>>;

export const commercialAssignmentPageSchema = z.object({
  subject: key, environment: commercialEnvironmentSchema, scopeRevision: revision,
  checkedAt: timestamp, expiresAt: timestamp,
  assignments: z.array(commercialAssignmentSchema).max(100), nextAfter: key.nullable(),
}).strict();
export const commercialBindingPageSchema = z.object({
  environment: commercialEnvironmentSchema, scopeRevision: revision, checkedAt: timestamp,
  bindings: z.array(productAccountBindingSchema).max(100),
}).strict();

export const commercialSelectionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("list"), limit: z.number().int().min(1).max(100), after: key.nullable(), dmdAccountId: key.nullable() }).strict(),
  z.object({ kind: z.literal("binding"), bindingId: key }).strict(),
]);
export type CommercialSelection = z.infer<typeof commercialSelectionSchema>;

/** Trusted server adapters only. No production implementation/fallback in SALES-2A. */
export interface CommercialIdentityPort {
  verify(credential: unknown, context: { environment: CommercialEnvironment; now: Date }): Promise<unknown | null>;
}
export interface CommercialAssignmentPort {
  read(principal: CommercialPrincipal, selection: CommercialSelection, now: Date): Promise<unknown>;
}
export interface ProductAccountBindingPort {
  // scopeRevision covers ALL binding changes in the environment, including off-page ones.
  read(bindingIds: readonly string[], environment: CommercialEnvironment, now: Date): Promise<unknown>;
}
export interface CommercialPolicyPorts {
  identity: CommercialIdentityPort; assignments: CommercialAssignmentPort; bindings: ProductAccountBindingPort;
}
export interface CommercialPolicyConfig {
  environment: CommercialEnvironment; trustedIssuers: readonly string[];
}
export interface CommercialAssignmentAccess {
  readonly principal: CommercialPrincipal;
  readonly assignments: z.infer<typeof commercialAssignmentPageSchema>;
  readonly selection: CommercialSelection;
  readonly asOf: string;
}
export interface CommercialAccess extends CommercialAssignmentAccess {
  readonly bindings: z.infer<typeof commercialBindingPageSchema>;
}
export interface CommercialTenantScope {
  readonly subject: string; readonly dmdAccountId: string; readonly bindingId: string;
  readonly bindingRevision: number; readonly assignmentId: string; readonly assignmentRevision: number;
  readonly tenantId: string; readonly environment: CommercialEnvironment;
  readonly allowedActions: readonly CommercialAction[];
}
export interface CommercialResourceContext { readonly tenantId: string; readonly bindingId: string }
const commercialFailureSchema = z.object({
  kind: z.literal("denied"), reason: z.enum([
    "invalid_request", "principal_unverified", "authority_unavailable", "invalid_authority_evidence",
    "assignment_denied", "binding_denied", "action_denied", "unsupported_action",
    "resource_denied", "cursor_invalid", "scope_changed", "tenant_not_found", "product_unavailable",
  ]),
}).strict();
export type CommercialFailure = z.infer<typeof commercialFailureSchema>;
export type CommercialAccessResult = { kind: "ok"; access: CommercialAccess } | CommercialFailure;
export type CommercialAssignmentAccessResult = { kind: "ok"; access: CommercialAssignmentAccess } | CommercialFailure;
export type CommercialScopeResult = { kind: "ok"; scope: CommercialTenantScope } | CommercialFailure;
export type CommercialScopesResult = { kind: "ok"; scopes: CommercialTenantScope[] } | CommercialFailure;
export interface CommercialPolicy {
  load(credential: unknown, selection: CommercialSelection, now: Date): Promise<CommercialAccessResult>;
  authorize(access: CommercialAccess, bindingId: string, action: string, resource?: CommercialResourceContext): CommercialScopeResult;
  revalidate(credential: unknown, access: CommercialAccess, now: Date): Promise<CommercialFailure | null>;
}

export const commercialCursorPayloadSchema = z.object({
  schemaVersion: z.literal(1), principalKey: key, environment: commercialEnvironmentSchema,
  assignmentScopeRevision: revision, bindingScopeRevision: revision,
  dmdAccountId: key.nullable(), after: key, limit: z.number().int().min(1).max(100), expiresAt: timestamp,
}).strict();
export type CommercialCursorPayload = z.infer<typeof commercialCursorPayloadSchema>;
export interface CommercialCursorCodec {
  encode(payload: CommercialCursorPayload): string;
  decode(cursor: string): CommercialCursorPayload | null;
}
export const commercialListInputSchema = z.object({
  limit: z.number().int().min(1).max(100).default(25), cursor: z.string().min(1).max(4096).optional(),
  dmdAccountId: key.optional(),
}).strict();
export type CommercialListInput = z.infer<typeof commercialListInputSchema>;

const unavailableModuleSchema = z.object({
  state: z.literal("unavailable"), reason: z.literal("not_implemented"), asOf: timestamp,
}).strict();
// SALES-1 is already an allowlisted, PII-free projection. Share its authority contract.
const productSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("ready"), value: commercialSubscriptionStateSchema }).strict(),
  z.object({ state: z.literal("unavailable"), reason: z.enum(["action_not_permitted", "source_read_failed", "projection_failed"]), asOf: timestamp }).strict(),
]);
export const commercialAccountDtoSchema = z.object({
  schemaVersion: z.literal(1), productKey: z.literal("marysoll"), dmdAccountId: key,
  bindingId: key, bindingRevision: revision, tenantId: z.string().regex(/^[a-f\d]{24}$/),
  environment: commercialEnvironmentSchema, asOf: timestamp,
  allowedActions: z.array(commercialActionSchema), product: productSchema,
  modules: z.object({
    usage: unavailableModuleSchema, diagnostics: unavailableModuleSchema, marketing: unavailableModuleSchema,
    audience: unavailableModuleSchema, incidents: unavailableModuleSchema, relationship: unavailableModuleSchema,
  }).strict(),
}).strict();
export type CommercialAccountDto = z.infer<typeof commercialAccountDtoSchema>;
export const commercialListDtoSchema = z.object({
  schemaVersion: z.literal(1), asOf: timestamp,
  items: z.array(commercialAccountDtoSchema).max(100), nextCursor: z.string().max(4096).nullable(),
}).strict();
export const commercialDetailResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ok"), value: commercialAccountDtoSchema }).strict(), commercialFailureSchema,
]);
export const commercialListResultSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("ok"), value: commercialListDtoSchema }).strict(), commercialFailureSchema,
]);
export type CommercialDetailResult = z.infer<typeof commercialDetailResultSchema>;
export type CommercialListResult = z.infer<typeof commercialListResultSchema>;
export interface CommercialAccountReadDependencies {
  policy: CommercialPolicy; cursor: CommercialCursorCodec; now(): Date;
  readSubscriptions?(ids: readonly string[], now: Date): Promise<Map<string, CommercialReadResult>>;
}
