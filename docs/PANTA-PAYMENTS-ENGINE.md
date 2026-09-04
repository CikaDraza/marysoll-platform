# Naplata — ugovor

> Status: **Marysoll naplaćuje isključivo pretplatu tenanta.** Novac između
> salona i klijentkinje ne prolazi kroz platformu i neće prolaziti.
>
> Faza 0 (trajnost webhook prijema) je u kodu. Sve ostalo je specifikacija.
>
> Vezano: [cene](PANTA-BOOKING-PRICING.md) · [loyalty](PANTA-LOYALTY-ENGINE.md) ·
> [otkazivanje](PANTA-CANCELLATION-NOSHOW-POLICY.md) · [TODO.md](TODO.md)

## 1. Jedna rečenica

```text
Marysoll → tenant        pretplata na platformu       ✅ radi (Paddle)
salon    → klijentkinja  naplata usluge i depozita    ❌ ne prolazi kroz nas
```

Salon koji želi online naplatu otvara **svoj** MoR ili PSP nalog, na svoje ime i
svoj račun. Marysoll može da izvede integraciju kao zasebnu, naplativu uslugu —
ali novac nikada nije njegov.

## 2. Zašto Marysoll NIJE merchant of record (razmotreno i odbačeno)

Razmatran je model u kome Marysoll naplaćuje u svoje ime pa prosleđuje salonima.
Odbačen je jer bi doneo više štete nego koristi, i to iz četiri nezavisna
razloga: prihod salona bi prolazio kroz knjige Marysoll-a i punio poreski limit
tuđim novcem; naplata u svoje ime pa prosleđivanje trećoj strani bez provizije
je **posredovanje u plaćanju**, regulisana delatnost; fiskalna obaveza za uslugu
koju pruža salon ne može smisleno da stoji na platformi; a Paddle — koji već
nosi pretplate — **strukturno nema mehanizam** za isplatu trećoj strani, pa ni
odobrenje ne bi pomoglo. Uz to bi platforma preuzela obaveze koje idu uz držanje
tuđeg novca: isplate, obrtna sredstva, chargeback clawback i usaglašavanje
salda po salonu. Odluka: **ne.**

## 3. Zatečeno stanje

| Radi | Ne postoji i ne planira se |
|---|---|
| Paddle Billing, salon → platforma | naplata klijentkinje kroz Marysoll |
| `Subscription` (1 po tenantu), `Plan` | držanje tuđeg novca, isplate salonima |
| plan gating (`resolveEffectivePlan`) | ijedan ekran koji uzima karticu od klijentkinje |
| `WebhookEvent` trajnost prijema (§4) | refund/chargeback tokovi na strani platforme |

**Gate već postoji:** `PlanFeatures.paymentIntegration` (kiki + enterprise) —
za integraciju iz §6 ne treba nov plan feature.

**Račun na koji stižu uplate nije u kodu i ne treba da bude.** Paddle isplaćuje
na račun podešen u njihovom dashboard-u; repo drži samo API ključeve i webhook
tajne. Isplata ide tek kad saldo pređe njihov prag (100 EUR).

## 4. Faza 0 — trajnost webhook prijema ✅ u kodu

Zatvorila je živ incident: Paddle ponavlja isporuku na svaki non-2xx, a obrada
nije imala dedup — ponovljen `subscription.canceled` je ponovo izvršavao
`Tenant.findByIdAndUpdate({ paid: false, plan: "maria" })`, pa je **salon koji
plaća gubio plaćene funkcije zbog provajderovog retry-ja**.

```text
exactly-once prijem    unique { provider, providerEventId }
at-least-once obrada   `status` + ponovni pokušaj
exactly-once efekat    idempotency ključ (kad ga bude bilo)
```

Uz to: tolerancija vremena potpisa (bez nje presretnut payload važi zauvek),
zaštita od prestizanja (zakasneo `updated` ne pregazi obrađen `canceled`),
`transaction.*` se čuva kao `skipped` umesto da nestane, i nerazrešen tenant
ostaje `failed` umesto `console.warn`-a. Integrity provera:
`payments.webhook.stuck`.

## 5. Evidencija naplate — specifikacija, odloženo

Ako Marysoll ne dodiruje novac, jedino što oko novca može da ponudi je
**evidencija**: salon naplati depozit svojim kanalom, a platforma to zabeleži da
bi račun termina ostao tačan.

```text
salon naplati depozit (svojim PSP-om ili u salonu)
        ↓
Marysoll zabeleži da je stigao
        ↓
Checkout računa tačno:  amountDue − depozit = ostatak
```

**Depozit se ODUZIMA od računa** — nikad se ne vraća pa ponovo naplaćuje.

Ključna granica ostaje ista i kad se ovo bude gradilo:

> `pricing.chargedAmount` kaže koliko je termin **vredeo**.
> Evidencija uplata kaže **kako je novac stigao**.
> Nijedno se ne izvodi iz drugog; evidencija nikad ne piše `pricing.*`.

Bez MoR-a otpadaju `account` bucket-i (`salon_payable`, `platform_revenue`,
`provider_fee`) — ne postoji saldo koji Marysoll nekome duguje. Ostaje samo
činjenica da je uplata stigla.

**Ishod depozita** po otkazivanju koristi postojeći `clientAppointmentPhase()` —
ne uvodi se drugi model vremena, pa grace period od 30 minuta besplatno štiti
pogrešan klik:

| faza | ishod | `chargedAmount` |
|---|---|---|
| `open` (u roku ili grace) | vraća salon, po svojim uslovima | netaknut |
| `late` / `started` / nedolazak | zadržan kao naknada | salon upisuje |
| `unknown` | bez automatike — salon odlučuje | netaknut |

**Uslovno okidanje**, ako se do toga dođe: univerzalan depozit obara konverziju
kod klijentkinja koje nikad nisu izostale. Okidači (nova klijentkinja, prethodni
nedolazak, skupa usluga, udarni termin) rade nad **postojećim** brojačima
`completedVisits` / `noShows` — ne treba nijedan nov podatak.

## 6. Integracija po salonu — naplativa usluga

Salon koji hoće online naplatu:

```text
1. otvara SVOJ MoR/PSP nalog, na svoje ime i račun
2. fiskalna obaveza ostaje na njemu — tamo gde i pripada
3. Marysoll izvodi integraciju kao zasebnu, naplativu uslugu
4. novac ide direktno salonu; Marysoll ga nikad ne vidi
```

Gate je postojeći `paymentIntegration` (kiki + enterprise). Za salone koji to ne
žele ništa se ne menja — naplata u salonu, kao i danas.

Kako to rade veliki (Fresha, Booksy, Square, Vagaro): **payment facilitator**
model — softver ima master ugovor sa PSP-om koji podržava pod-trgovce, salon
prolazi KYC unutar softvera, PSP kreira pod-trgovca, novac ide direktno salonu.
Salon nikad ne otvara PSP dashboard. Za Srbiju to znači domaćeg akvajrera sa
aggregator programom (NestPay/Asseco, Monri, AllSecure, Payten — tragovi za
proveru, ne preporuka). To je opcija za kasnije ako se broj salona koji traže
naplatu pokaže dovoljnim; do tada je integracija posao po salonu.

## 7. Valuta

Paddle na ovom nalogu nudi **samo EUR** — RSD nije dostupan. Za pretplatu
tenanta to je u redu: salon vidi EUR iznos, njegova banka obračunava po svom
kursu.

Kada bi se ikad prikazivao RSD iznos uz EUR naplatu, mora stajati i objašnjenje,
inače razlika na izvodu izgleda kao greška:

```text
prikaz     „Depozit 1.000 RSD naplaćuje se u iznosu od 8,50 EUR"
izvod      ~1.004 RSD po kursu njene banke
```

Integracija iz §6 ovaj problem **nema** — domaći PSP radi u RSD.

## 8. Zabeleženo, ne popravlja se ovde

- **`Appointment.appliedPromotionId` je mrtvo polje** — referiše `Promotion`
  model koji **ne postoji**, a obe rute ga brišu iz ulaza.
- `GET /api/plans` je bez zaštite i vraća Paddle price ID-jeve
  (`requireSuperAdmin` stoji samo na `POST`).
- `Service.subscription` (`subscriptionType`, `treatmentCount`, `priceMonthly`)
  je prikazan kao badge na temama, ali nema kupovine ni brojača tretmana.
  Opisuje **ponudu**, ne kupovinu. Ruta za izmenu računa `discount`/`finalPrice`
  koje Mongoose tiho odbacuje.
- `IServiceSubscription` u tipovima nosi polja bez pandana u šemi.
- Nijedan cron ne dodiruje pretplate — istek je lenj, pa `isTrialActive` ostaje
  `true` zauvek posle isteka probnog perioda.
- `cancelSubscriptionFromPaddle` ne radi upsert: otkazivanje bez postojećeg
  `Subscription` zapisa tiho ne radi ništa.
