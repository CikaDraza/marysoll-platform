# PANTA T-EDUCATION — Education vertikala (odluka 2026-08-16)

> Prvi tenant: **Marina** — edukacija za salone i za sve kojima treba skin care.
> Preduslovi: [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md) i
> [T2B verticals + capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md).

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

## 2. Domen

```
EducationOffering        katalog — šta Marina nudi
    ↓
EducationSession         konkretan događaj (datum, mesto, kapacitet)
    ↓
EducationInquiry         interesovanje            ← MVP / Faza 1
    ↓
EducationEnrollment      rezervisano mesto        ← kada uvedemo direktan booking
```

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
    Appointment             EducationReservation
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
- [ ] `mode="inquiry"` i `mode="session_booking"` dele isti widget i isti kontrakt.
- [ ] Education blokovi se registruju u Feature Block Registry — bez izmene
      `packages/theme-engine`.

## Reference

- [T2A Theme/Layout granica](PANTA-T2-THEME-LAYOUT-ENGINE.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Growth Studio](PANTA-GROWTH-STUDIO.md)
