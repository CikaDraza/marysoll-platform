# PANTA T-DISTRIBUTION — Distribution Engine (odluka 2026-08-16)

> Zamenjuje preširoko zamišljen „Marketing Engine" iz
> [ARHITEKTURA-ENGINES.md](../ARHITEKTURA-ENGINES.md) jasnijom podelom domena.

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

interface Offer {
  id: string;
  tenantId: string;
  subject: { type: "education_offering"; id: string };
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
```

Stvarne integracije rade adapteri u aplikaciji.

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
AudienceContact = KO je osoba
Lead            = ZA ŠTA je ta osoba pokazala interesovanje
```

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
- [ ] Jedan `AudienceContact` može imati više leadova.
- [ ] Svaki `Lead` nosi `campaignId`, `offerId` i channel attribution kada postoje.
- [ ] Svi kanali jedne kampanje vode na isti `landingPageId`.
- [ ] Postojeći `EmailCampaign` tok radi nepromenjeno.
- [ ] MVP ne zahteva automatsko postovanje na društvene mreže — LinkedIn /
      Instagram / outreach su export/manual artifacts.

## Reference

- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Growth Studio](PANTA-GROWTH-STUDIO.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
