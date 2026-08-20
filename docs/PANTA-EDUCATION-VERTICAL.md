# PANTA T-EDUCATION — Education vertikala (odluka 2026-08-16, rev. v0.2)

> Prvi tenant: **Marina** — edukacija za salone i za sve kojima treba skin care.
> Preduslovi: [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md) i
> [T2B verticals + capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md).
> **v0.2 (Architecture Review):** graf domena ispravljen (Inquiry visi o Offering-u,
> ne o Session-u), terminologija zaključana na `EducationEnrollment`, i `inquiry` /
> `session_booking` dobijaju **odvojene command kontrakte**.
> U aktuelnom [TODO-u](TODO.md) Education je Slice 11. Unutrašnji redosled ostaje:
> prvo Offering + Inquiry, zatim Session + Enrollment posle T3 Booking kontrakta.

## 1. Education NIJE proširenje `Service`

Postojeći [`Service`](../src/models/Service.ts) ima beauty semantiku (provereno):
`type: single | group | variant`, `priceMode: fixed | on_request`, `variants[]`,
`extras[]`, ugnježdeni `services[]`, `duration`, `subscription`.

```ts
// ❌ ne radimo ovo
isEducation: true;
```

Jedan boolean bi značio da svaki upit, svaki booking widget, svaka statistika i
svaki loyalty hook od tada mora da pita „je li ovo zapravo edukacija" — dug koji
raste sa svakim novim mestom. Edukacija ima drugu semantiku: publiku, format
isporuke, kapacitet, termin događaja.

## 2. Domen — graf NIJE linearan

Marinino B2B interesovanje upravo dokazuje zašto: upit se odnosi na **ponudu**,
najčešće bez ijedne zakazane sesije. Enrollment, nasuprot tome, uvek pripada
konkretnoj sesiji.

```
EducationOffering                       katalog — šta Marina nudi
   ├── EducationSession                 konkretan događaj (datum, mesto, kapacitet)
   │      └── EducationEnrollment       rezervisano mesto  ← Slice 6
   │
   └── EducationInquiry                 interesovanje      ← Slice 3 (MVP)
          (opciono sessionId)
```

| Zapis | Obavezno vezan za | Opciono |
|---|---|---|
| `EducationInquiry` | `educationOfferingId` | `sessionId` (kada upit ide na konkretan termin) |
| `EducationEnrollment` | `sessionId` | — (offering se izvodi iz sesije) |

**Terminologija je zaključana: `EducationEnrollment`.** Naziv
`EducationReservation` iz ranijeg nacrta se ne koristi nigde — ni u modelima, ni
u API-ju, ni u dijagramima.

```ts
interface EducationOffering {
  id: string;
  tenantId: string;

  title: string;
  slug: string;
  description: string;

  audience: "individual" | "salon" | "team";
  delivery: "online" | "in_person" | "on_site";

  pricing:
    | { mode: "fixed"; amount: number }
    | { mode: "from"; amount: number }
    | { mode: "on_request" };

  status: "draft" | "published" | "archived";
}
```

`EducationSession` postoji tek kada postoji konkretan događaj:

```
Masterclass za Lash Lift · 12. septembar · 10:00–16:00 · Beograd · Marina · 12 mesta
```

**To nije salon `Appointment`.** Appointment je 1:1 termin sa uslugom i
trajanjem; sesija je 1:N događaj sa kapacitetom i lokacijom.

## 3. Booking Engine: jedan engine, dva booking proizvoda

```
                 Booking Engine
                      │ generic contracts / policies
          ┌───────────┴───────────┐
Service Booking Adapter     Education Booking Adapter
          │                       │
    Appointment              EducationEnrollment
          │                       │
 Service Widget             Education Widget
```

Ne pokušavamo da `Appointment` postane univerzalni dokument. Zajedničko je
gore (politike otkazivanja, kapacitet, potvrde), specifično je dole.

**Service Booking Widget** ostaje kakav jeste:
usluga → varijanta/addon → zaposleni → datum → slobodan termin → rezervacija.

**Education Booking Widget** je odvojena javna komponenta:
edukacija → format/sesija → datum → lokacija → kapacitet → rezervacija mesta.

## 4. Dva moda widgeta — ključ za MVP bez refaktora

```ts
type EducationWidgetMode = "inquiry" | "session_booking";
```

| Sada (Marina MVP) | Kasnije |
|---|---|
| `<EducationBookingWidget mode="inquiry" />` | `<EducationBookingWidget mode="session_booking" />` |
| CTA: „Zanima me edukacija za moj salon" | konkretan masterclass, datum, broj mesta |
| završava kao **Lead** | završava kao **EducationEnrollment** |

Tako sada ne gradimo LMS ni course-commerce, ali kada dođe pravo rezervisanje
mesta ne pišemo widget ispočetka.

**Deli se shell, ne kontrakt.** Dva moda su dva use-case-a i imaju **odvojene Zod
input/output sheme** i odvojene komande:

```ts
// Slice 3
submitEducationInquiry(input: EducationInquiryInput): EducationInquiryResult
//   offeringId · kontakt · poruka · (opciono) sessionId · attribution

// Slice 6
bookEducationSession(input: EducationSessionBookingInput): EducationEnrollmentResult
//   sessionId · broj mesta · polaznici · politika otkazivanja
```

Zajedničko je samo vizuelno/UX kućište (`EducationBookingWidget`) i validacija
kontakta. Nikakav „univerzalni payload sa opcionim poljima" — to bi bio isti dug
kao `Service.isEducation`.

## 5. Marinina putanja (Faza 1)

```
EducationOffering → Offer → Campaign → Distribution → ISTA landing stranica
   → CTA „Zanima me edukacija za moj salon"
   → EducationBookingWidget mode="inquiry"
        ├── upsert AudienceContact
        └── create Lead (offerId · campaignId · educationOfferingId · channel · attribution)
   → Growth Studio: NOVO INTERESOVANJE → Marina → dalja komunikacija
```

Sadržaj → interesovanje → kontakt → dalja komunikacija. Bez CRM-a, checkout-a,
LMS-a i automatizacije u Fazi 1.

Offer/Campaign/attribution deo je opisan u
[PANTA-DISTRIBUTION-ENGINE.md](PANTA-DISTRIBUTION-ENGINE.md).

## 6. Događaji

Dodaju se u `@panta/event-bus` tek kada postoje emiteri (danas su registrovani
`appointment_completed`, `client_checkin`, `first_visit`, `referral_completed`,
`voucher_used`):

- `education_inquiry_created`
- `education_session_booked` — tek kada postoji pravi booking

## 7. Acceptance criteria

- [ ] `Service` model **ne dobija** `isEducation`.
- [ ] Education booking **ne kreira** salon `Appointment`.
- [ ] Service Booking Widget nikada ne prikazuje `EducationSession`.
- [ ] Education-first tenant postoji bez ijedne `Service` i bez service booking-a.
- [ ] Hybrid tenant ima oba widgeta na istoj landing strani.
- [ ] `mode="inquiry"` i `mode="session_booking"` dele shell, a imaju **odvojene**
      Zod sheme i odvojene komande.
- [ ] `EducationInquiry` postoji bez ijedne `EducationSession` (B2B slučaj).
- [ ] `EducationEnrollment` ne može da postoji bez `sessionId`.
- [ ] Naziv `EducationReservation` se ne pojavljuje u kodu ni u dokumentaciji.
- [ ] Education blokovi se registruju u Feature Block Registry — bez izmene
      `packages/theme-engine`.

## Reference

- [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Growth Studio](PANTA-GROWTH-STUDIO.md)
