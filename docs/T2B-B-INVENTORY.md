# T2B-B — inventar integracije capability gate-a

> Snimljeno pre T2B-B izmene. Ovo je mapa postojećeg koda, ne nova product
> specifikacija. Budući Consultation/Education/Care domeni nisu obuhvaćeni.

## Aktivni capability domeni i površine

| Capability | Admin workspace | Client/public surface | API/domain granica | Postojeći plan gate |
|---|---|---|---|---|
| `services.catalog` | Usluge | javne usluge | `Service` CRUD, public/marketplace service read | nema; core |
| `booking.services` | Termini, Kalendar | Moji termini, Zakazivanja, public booking/availability | legacy `Appointment`, booking i slot rute | `appointments` u resolveru; stare rute ga ne koriste dosledno |
| `audience.contacts` | Klijenti | nema zasebne client stavke | `AudienceContact`, import i segmenti | core; kampanje/AI ostaju plan-only ili budući Distribution |
| `loyalty.rewards` | Growth Studio | Nagrade, loyalty endpointi | loyalty admin/client/check-in/voucher rute | postojeći `loyaltyCore` |

## Navigacija i shellovi

- Admin: `src/layout/AppSidebar.tsx` i `src/app/dashboard/page.tsx`.
- Client: `src/layout/ClientPanelLayout.tsx` i
  `src/app/tenant/panel/ClientPanelPage.tsx`.
- Čiste core površine (profil, CMS, podešavanja, chat, pretplata) ne dobijaju
  capability i ostaju pod postojećim permission ugovorom.

## Postojeći sigurnosni slojevi

- `requireAdmin()` proverava autentifikaciju i admin ulogu.
- `tenantScopeFrom()` zadržava tenant filter, a `actorScopeFrom()` dodaje
  `clientProfileId` za klijenta.
- Appointment rute koriste `actorScopeFrom()`/`tenantScopeFrom()` gde je
  potrebna zaštita vlasništva. Capability se dodaje posle identity/permission
  provere i pre operacije; ne zamenjuje taj filter.

## Feature Block putanja

`ThemeDocument → resolveBlockData() → FeatureBlockRegistry → ThemeBlock → renderer`.

Svi postojeći blokovi, uključujući Theme-9 `content.*` teasere, imaju
`capability: null`. T2B-B zato koristi sintetički blok za non-null readiness
testove; Theme-9 semantika se ne menja.

## Namerno van capability migracije

- newsletter, email AI, statistika i marketing campaign rute: postojeće
  plan-feature kontrole ostaju netaknute;
- T3 booking write authority i svi BookingReservation modeli;
- Consultation, Education, Questionnaire i Care modeli/rute;
- Theme8/9 access policy i Tenant persistence ugovor.
