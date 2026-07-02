import { Schema, model, models } from "mongoose";

// ─── Growth Studio: custom pravila (recipe template + parametri) ──────────────
// U Fazi 1 engine koristi built-in pravila izvedena iz LoyaltyConfig-a
// ("builtin:hearts_per_visit"...) — ova kolekcija je spremna za Fazu 2 (Kiki:
// više programa, uslovi po usluzi/tieru). Izmena parametara bump-uje version;
// ledger pamti {ruleId, ruleVersion} pa istorija ostaje istinita. Brisanje je
// uvek soft (archivedAt) dok ledger referencira pravilo.

const loyaltyRuleSchema = new Schema(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    templateKey: { type: String, required: true },
    name: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    version: { type: Number, default: 1 },
    /** Parametri validirani Zod šemom template-a pri upisu */
    params: { type: Schema.Types.Mixed, default: {} },
    limits: {
      perClientWindowDays: { type: Number },
      perClientPerWindow: { type: Number },
      cooldownDays: { type: Number },
    },
    archivedAt: { type: Date },
  },
  { timestamps: true },
);

loyaltyRuleSchema.index({ tenantId: 1, enabled: 1, templateKey: 1 });

export const LoyaltyRule =
  models.LoyaltyRule || model("LoyaltyRule", loyaltyRuleSchema);
