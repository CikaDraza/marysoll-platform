import "server-only";

import { model, models, Schema, Types, type Document } from "mongoose";

export const ASSIGNMENT_STATUSES = ["active", "revoked"] as const;
export type ClientContentAssignmentStatus =
  (typeof ASSIGNMENT_STATUSES)[number];

export interface IClientContentAssignmentDoc extends Document {
  tenantId: Types.ObjectId;
  clientProfileId: Types.ObjectId;
  educationContentId: Types.ObjectId;
  status: ClientContentAssignmentStatus;
  assignedAt: Date;
  assignedByProfileId?: Types.ObjectId | null;
  revokedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Ko sme da čita zaštićen sadržaj.
 *
 * Namerno ZASEBAN model, a ne `allowedClientIds` u `EducationContent`: jedna
 * klijentkinja ima više sadržaja, jedan sadržaj ima više klijentkinja, i
 * kasnije se isti odnos čita i sa strane klijenta (Moj Prostor) i sa strane
 * sadržaja (ko sve ima pristup). Niz u dokumentu bi oba ta pogleda učinio
 * skupim i nemogućim za lifecycle polja.
 *
 * `clientProfileId` je ime koje `actorScopeFrom()` već hardkodira kao
 * vlasnički filter za client-owned modele — drugo ime bi tiho izgubilo taj ACL.
 *
 * Povlačenje pristupa je `status: "revoked"`, ne brisanje: istorija „ko je imao
 * pristup i do kada" je poslovni podatak, ne otpad.
 */
const ClientContentAssignmentSchema = new Schema<IClientContentAssignmentDoc>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    clientProfileId: {
      type: Schema.Types.ObjectId,
      ref: "TenantUser",
      required: true,
    },
    educationContentId: {
      type: Schema.Types.ObjectId,
      ref: "EducationContent",
      required: true,
    },
    status: {
      type: String,
      enum: ASSIGNMENT_STATUSES,
      required: true,
      default: "active",
    },
    assignedAt: { type: Date, required: true, default: () => new Date() },
    assignedByProfileId: { type: Schema.Types.ObjectId, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Jedna dodela po paru; ponovno odobravanje menja postojeći zapis.
ClientContentAssignmentSchema.index(
  { tenantId: 1, educationContentId: 1, clientProfileId: 1 },
  { unique: true },
);
// „Šta ja imam" — pogled iz Mog Prostora.
ClientContentAssignmentSchema.index({
  tenantId: 1,
  clientProfileId: 1,
  status: 1,
});

export const ClientContentAssignment =
  models.ClientContentAssignment ||
  model<IClientContentAssignmentDoc>(
    "ClientContentAssignment",
    ClientContentAssignmentSchema,
  );
