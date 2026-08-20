# PANTA T-DISTRIBUTION — Distribution Engine (odluka 2026-08-16, rev. v0.2)

> Zamenjuje preširoko zamišljen „Marketing Engine" iz
> [ARHITEKTURA-ENGINES.md](ARHITEKTURA-ENGINES.md) jasnijom podelom domena.
> Katalog engine-a je usklađen 2026-08-16 — „Marketing Engine" više nije
> autoritativan pojam ni na jednom mestu.
> **v0.2 (Architecture Review):** `subject` je generički `ResourceRef` (engine ne
> zna vertikale), dodat `DistributionPlacement` sa `targetScope` i platform
> `approvalStatus` za cross-tenant distribuciju, `marysoll_network` = svi eligible
> + opted-in (segmentacija je budući `network_segment`), i uveden
> `ExternalProspect` kao treći pojam pored `AudienceContact`/`Lead`.

## 1. Podela odgovornosti

```
Content Engine            = šta govorimo
Education Engine          = šta nudimo
Distribution Engine       = gde i kako ponudu distribuiramo
Notification Engine       = transport (email / SMS / push / WhatsApp)
Audience & Contact Base   = kome se obraćamo
Growth Studio             = UI koji sve ovo orkestrira (nije engine)
```

## 2. Offer ≠ EducationOffering

`EducationOffering` je proizvod; `Offer` je komercijalna poruka o tom proizvodu.
Jedna edukacija tokom godine ima više ponuda:

```
EducationOffering: "Napredna Lash Lift edukacija"
   ├── Offer A: "Septembarski termin za vlasnice salona"
   ├── Offer B: "Edukacija za ceo tim — dolazak u vaš salon"
   └── Offer C: "Early bird masterclass"
```

```
EducationOffering → Offer → Campaign → Distribution
```

`Campaign` je konkretno distribuiranje ponude po kanalima.

## 3. Kontrakt paketa `@panta/distribution-engine`

Bez MongoDB, React-a, Next-a, Resend-a, LinkedIn/Instagram API-ja — isti obrazac
kao `@panta/diagnostic-engine` i `@panta/loyalty-engine`.

```ts
type DistributionChannel =
  | "tenant_site" | "marysoll_banner" | "linkedin"
  | "instagram" | "email" | "salon_outreach";

type CampaignStatus = "draft" | "ready" | "active" | "paused" | "completed";

/**
 * Generički subject — engine NE zna šta je EducationOffering, isto kao što
 * Theme Engine ne zna šta je Service. `type` je string koji razrešava aplikacija.
 * Sutra isti engine distribuira service_offer, loyalty_offer, event,
 * downloadable_resource, membership — bez izmene paketa.
 */
interface ResourceRef {
  type: string;   // "education_offering" | "service_offer" | …
  id: string;
}

interface Offer {
  id: string;
  tenantId: string;
  subject: ResourceRef;
  headline: string;
  description?: string;
  cta: { label: string; landingPageId: string };
}

interface Campaign {
  id: string;
  tenantId: string;
  offerId: string;
  channels: DistributionChannel[];
  status: CampaignStatus;
}

interface ChannelArtifact {
  id: string;
  campaignId: string;
  channel: DistributionChannel;
  landingPageId: string;
  targetUrl: string;
  content: unknown;
  state: "draft" | "ready" | "published";
}
```

Čiste funkcije engine-a:

```
validateOffer() · validateCampaign() · createDistributionPlan()
materializeChannelArtifacts() · transitionCampaign() · buildAttribution()
validatePlacement() · requiresApproval()
```

Stvarne integracije rade adapteri u aplikaciji.

### 3.1 Cross-tenant placement — sigurnosni model

`marysoll_banner` **nije** isto što i Marinin sopstveni sajt ili njen Instagram:
tu jedan tenant piše po površini drugog tenanta. Bez formalnog modela to je
multi-tenant rupa upravo u feature-u koji treba da bude najveći network efekat
Marysoll-a.

```ts
type TargetScope =
  | "own_tenant"        // sopstvene površine
  | "marysoll_network"  // SVI eligible + opted-in tenanti (bez segmentacije)
  | "selected_tenants"  // eksplicitno izabrani tenanti (targetTenantIds)
  | "external";         // van platforme (IG, LinkedIn, outreach)

type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";

interface DistributionPlacement {
  id: string;
  sourceTenantId: string;
  campaignId: string;
  channel: DistributionChannel;

  targetScope: TargetScope;
  targetTenantIds?: string[];   // obavezno za "selected_tenants"

  approvalStatus: ApprovalStatus;
  approvedBy?: string;          // platform operater
  approvedAt?: Date;
  rejectionReason?: string;
}
```

**Pravilo:**

| targetScope | Odobrenje |
|---|---|
| `own_tenant` | `not_required` — tenant slobodno distribuira na svoje površine |
| `external` | `not_required` — van platforme, tenant odgovara za svoj nalog |
| `marysoll_network` | **obavezno platform-level odobrenje** |
| `selected_tenants` | **obavezno platform-level odobrenje** |

Dodatna pravila koja engine iskazuje kao invarijante:

- Placement bez `approved` statusa **ne sme** da se materijalizuje u
  `ChannelArtifact` sa `state: "published"`.
- `targetTenantIds` mora biti prazan za `own_tenant`/`external`, a neprazan za
  `selected_tenants`.
- Ciljni tenant mora imati mogućnost da isključi prijem mrežnih ponuda
  (opt-out je capability na strani primaoca, ne odluka pošiljaoca).
- Svaka promena `approvalStatus`-a je audit zapis (ko, kada, zašto).

**Značenje scope-ova je usko definisano da kontrakt ne obećava ono što ne ume da
predstavi:**

| Scope | Značenje u MVP-u |
|---|---|
| `marysoll_network` | **svi** tenanti koji su eligible i opted-in — bez segmentacije |
| `selected_tenants` | ručno/eksplicitno izabrani tenanti iz `targetTenantIds` |

Segmentacija („samo lash saloni u Beogradu") **nije** podskup `marysoll_network`-a
nego budući zaseban scope:

```ts
// FUTURE — ne implementira se sada
| "network_segment"   // + segmentId + immutable target snapshot u trenutku odobrenja
```

Razlog za snapshot: segment se menja u vremenu, a odobrenje se daje nad konkretnom
listom primalaca. Bez zamrznute liste ne može se ni revidirati ni opozvati ono što
je odobreno.

## 4. Postojeći `EmailCampaign` ostaje — postaje channel projection

[`models/EmailCampaign.ts`](../src/models/EmailCampaign.ts) ima svoj lifecycle
(`scheduling.status: draft | scheduled | sending | sent | failed`), recipient i
delivery metrike, A/B varijante. **Ne brišemo ga i ne pretvaramo u canonical
multi-channel Campaign.**

```
Distribution Campaign
   ├── LinkedInArtifact
   ├── InstagramArtifact
   ├── TenantBannerArtifact
   ├── OutreachArtifact
   └── EmailArtifact → postojeći EmailCampaign
```

U `EmailCampaign` se dodaju samo opciona polja:

```ts
distributionCampaignId?: ObjectId;
channelArtifactId?: ObjectId;
```

Postojeći newsletter tok ostaje kompatibilan i radi nepromenjeno.

## 5. Audience & Lead — contact base već postoji

[`models/AudienceContact.ts`](../src/models/AudienceContact.ts) je već canonical
contact model (provereno): `contactType: CLIENT | NEWSLETTER | SALON_OWNER |
LEAD | STAFF`, `source: user | newsletter | import | linkedin | scraper |
manual`, `status`, engagement metrike. **Nije greenfield.**

```
ExternalProspect = poslovni kontakt pronađen za mogući outreach — BEZ consent-a
AudienceContact  = osoba u audience/contact odnosu — consent/status eksplicitno poznat
Lead             = konkretno iskazano poslovno interesovanje
```

### 5.1 ⚠️ `ExternalProspect` ≠ `AudienceContact` (pre prve Distribution implementacije)

Postojeći `AudienceContact` ima `source: linkedin | scraper | manual` i
`subscribed: true` kao **default** (provereno u modelu). Ako outreach lista uđe
direktno u tu kolekciju, rečenica

> „Pronašao sam ovaj salon na Instagramu"

tiho postaje

> „Ovaj kontakt je subscriber u Marininoj publici."

To je pogrešno i pravno i produktno. Zato se pre prve Distribution
implementacije zaključava treći pojam:

| Zapis | Šta znači | Marketing consent |
|---|---|---|
| `ExternalProspect` | poslovni kontakt pronađen za mogući outreach (salon, stranica, profil) | **nema ga** |
| `AudienceContact` | osoba koja je ušla u audience odnos | eksplicitno poznat (`subscribed`, `status`) |
| `Lead` | iskazano poslovno interesovanje | nezavisno od subscription-a |

Tok:

```
ExternalProspect
      ↓  personalizovan outreach (1:1, ne kampanja publike)
odgovor / CTA / forma
      ↓
AudienceContact  +  Lead
```

B2B kontakt sme da postane `Lead` **bez** newsletter subscription-a — interesovanje
nije pristanak na masovnu komunikaciju.

Pravila:

- `ExternalProspect` nikad ne ulazi u recipient listu `EmailCampaign`-a.
- Prelaz `ExternalProspect → AudienceContact` traži **eksplicitan događaj**
  (odgovor, popunjena forma, prijava) — nikad tihu konverziju uvozom.
- Postojeći kontakti sa `source: scraper | linkedin` se pri migraciji revidiraju:
  ako nemaju dokaz o pristanku, sele se u `ExternalProspect`.

Ne spajati ih. Jedan kontakt vremenom ima više leadova:

```
Lead #1 → Marina Lash Education
Lead #2 → Brow Education
Lead #3 → B2B team training
```

```ts
interface Lead {
  id: string;
  tenantId: string;
  contactId: string;

  kind: "education_b2b" | "education_individual" | "general";
  status: "new" | "contacted" | "qualified" | "closed";

  educationOfferingId?: string;
  offerId?: string;
  campaignId?: string;

  attribution: {
    channel?: string;
    landingPageId?: string;
    source?: string;
    medium?: string;
    campaign?: string;
    referrer?: string;
  };

  company?: { name?: string; salonName?: string };
  message?: string;
  createdAt: Date;
}
```

Četiri statusa su dovoljna za MVP — ne pravimo Salesforce.

`Lead` je **aplikacioni** model, ne deo paketa — zato sme da nosi vertikalno polje
`educationOfferingId`. Pravilo „engine ne zna vertikale" važi za
`packages/distribution-engine`; kada se pojavi druga vertikala leadova, polje
prelazi u `subject: ResourceRef` istim obrascem kao `Offer.subject`.

Napomena: postojeći `contactType: "LEAD"` ostaje **klasifikacija kontakta**, ne
zapis interesovanja. Interesovanje je uvek `Lead`.

## 6. Jedna landing stranica + attribution

Svi kanali vode na **isti** landing resource:

```
/edukacije/lash-lift-za-salone
```

Attribution ide kroz query, ne kroz duplirane strane:

```
/edukacije/lash-lift-za-salone?utm_source=instagram&utm_campaign=lash_lift_sep
/edukacije/lash-lift-za-salone?utm_source=linkedin&utm_campaign=lash_lift_sep
```

```html
<link rel="canonical" href="https://…/edukacije/lash-lift-za-salone" />
```

Nema šest verzija sadržaja, a znamo odakle je lead stigao.

## 7. Događaji

Dodaju se u `@panta/event-bus` kada postoje emiteri:

- `distribution_campaign_published`
- `audience_contact_upserted`
- `lead_captured`

Distribution Engine **ne zna** ko ga sluša (Analytics / Notification / Growth
Studio activity).

## 8. Acceptance criteria

- [ ] `packages/distribution-engine` nema Resend / Instagram / LinkedIn /
      Mongoose / React kod.
- [ ] Engine ne sadrži nijedan vertikalni literal (`"education_offering"` i sl.) —
      `subject` je `ResourceRef`.
- [ ] `marysoll_network` i `selected_tenants` placement bez `approved` statusa ne
      može da se objavi (invarijanta u paketu + test).
- [ ] Ciljni tenant može da isključi prijem mrežnih ponuda.
- [ ] Svaka promena odobrenja ostavlja audit zapis.
- [ ] Jedan `AudienceContact` može imati više leadova.
- [ ] `ExternalProspect` nikad nije primalac kampanje niti se tiho pretvara u
      `AudienceContact` — prelaz traži eksplicitan događaj.
- [ ] B2B `Lead` može da nastane bez newsletter subscription-a.
- [ ] Svaki `Lead` nosi `campaignId`, `offerId` i channel attribution kada postoje.
- [ ] Svi kanali jedne kampanje vode na isti `landingPageId`.
- [ ] Postojeći `EmailCampaign` tok radi nepromenjeno.
- [ ] MVP ne zahteva automatsko postovanje na društvene mreže — LinkedIn /
      Instagram / outreach su export/manual artifacts.

## Reference

- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Growth Studio](PANTA-GROWTH-STUDIO.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
