import { Schema, model, models } from "mongoose";

// ─── Dolazni webhook događaji (svi provajderi) ────────────────────────────────
//
// Postoji zbog jednog konkretnog incidenta koji je bio moguć: Paddle ponavlja
// isporuku na svaki non-2xx odgovor, a obrada nije imala dedup. Ponovljen
// `subscription.canceled` je time ponovo izvršavao
// `Tenant.findByIdAndUpdate({ paid: false, plan: "maria" })` — salon koji plaća
// biva vraćen na besplatan plan zbog provajderovog retry-ja.
//
// TRI RAZLIČITE GARANCIJE, TRI RAZLIČITA MEHANIZMA. Spajanje ova tri je izvor
// većine webhook grešaka:
//
//   exactly-once PRIJEM    unique { provider, providerEventId }  ← ovaj model
//   at-least-once OBRADA   `status` + ponovni pokušaj
//   exactly-once EFEKAT    idempotency ključ u ledgeru (kad novac stigne)
//
// Zapis nastaje PRE obrade. Ista pouka kao T1-4: status ne sme da tvrdi da je
// posao gotov pre nego što je stvarno urađen, inače pad usred obrade ostavlja
// događaj koji niko više neće pokušati.

const webhookEventSchema = new Schema(
  {
    /** Enum od prvog dana: sledeći provajder dodaje vrednost, ne kolekciju. */
    provider: { type: String, enum: ["paddle"], required: true },
    /** Provajderov id događaja — jedini pravi ključ deduplikacije. */
    providerEventId: { type: String, required: true },
    /** Doslovan provajderov string; mapiranje je obrada, ne prijem. */
    eventType: { type: String, required: true },

    /**
     * Na šta se događaj odnosi (npr. Paddle subscription id).
     *
     * Nosi ga zbog REDOSLEDA: zakasneo `subscription.updated` ne sme da pregazi
     * već obrađen `subscription.canceled`. Bez ovoga se dedup rešava, a
     * prestizanje ne.
     */
    subjectRef: { type: String, default: null },

    /** Provajderov `occurred_at` — NE `createdAt`. Redosled mora da preživi retry. */
    occurredAt: { type: Date, required: true },
    receivedAt: { type: Date, default: Date.now },
    /** `ts` iz potpisa; čuva se da odbijanje zbog zastarelosti bude proverljivo. */
    signatureTs: { type: Number, default: null },

    /** Sirov payload, verbatim. Nikad normalizovana projekcija. */
    payload: { type: Schema.Types.Mixed, default: {} },

    /**
     * NULLABLE i to je ispravka buga, ne popuštanje.
     *
     * `resolveTenantId` vraća `null` za `subscription.updated` bez `custom_data`
     * kada lokalni `Subscription` još ne postoji. Ranije se to logovalo kao
     * `console.warn` i događaj se ZAUVEK gubio. Upis prvo, razrešavanje tenanta
     * tokom obrade — kasno stigao `Subscription` čini događaj ponovo obradivim.
     */
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", default: null },

    status: {
      type: String,
      enum: ["received", "processed", "skipped", "failed"],
      default: "received",
    },
    /** Zašto je preskočen (npr. tip koji nas ne zanima). */
    skipReason: { type: String, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

// Jedina prava ograda protiv ponovljene isporuke.
webhookEventSchema.index(
  { provider: 1, providerEventId: 1 },
  { unique: true, name: "webhook_event_provider_unique" },
);
// Pronalaženje zaglavljenih događaja (integrity check + budući sweeper).
webhookEventSchema.index({ status: 1, receivedAt: 1 });
// Provera prestizanja: postoji li noviji obrađen događaj za isti subjekat.
webhookEventSchema.index({ provider: 1, subjectRef: 1, occurredAt: -1 });

export const WebhookEvent =
  models.WebhookEvent || model("WebhookEvent", webhookEventSchema);
