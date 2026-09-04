# PANTA — Growth Studio kao composition surface (odluka 2026-08-16)

> **FUTURE / TARGET IA — nije implementirano.** Ovo je odluka o budućoj podeli
> admin navigacije, ne opis današnjeg stanja. Danas `AdminGrowthStudio.tsx`
> **jeste Loyalty UI** i to je u redu; preimenovanje i preseljenje nisu zakazani i
> nisu preduslov ni za jedan otvoreni rez.
>
> Current state Loyalty domena:
> [PANTA-LOYALTY-ENGINE.md](PANTA-LOYALTY-ENGINE.md) · redosled rada:
> [TODO.md](TODO.md).
>
> Kratak dokument: Growth Studio **nije engine**. To je admin UI koji orkestrira
> više engine-a i ne poseduje nijedan domen.

## 1. Zatečeno stanje (i dalje važi)

[`AdminGrowthStudio.tsx`](../src/components/admin/loyalty/AdminGrowthStudio.tsx)
je danas Loyalty UI — sopstveni komentar to i kaže („MVP: Podešavanja / Klijenti
/ Vaučeri; budući tiers/referral/promocije idu ovde") — i živi u
`components/admin/loyalty/`.

Naziv je legacy. Kada Distribution luk stvarno počne, ime „Growth Studio" se
oslobađa za §2; do tada se kod ne dira.

## 2. Nova podela admin navigacije

```
Pregled
Termini
Klijenti
Usluge

Edukacije              ← capability: education.catalog
  Ponuda edukacija
  Sesije

Growth Studio          ← NOVO: distribucija i rast
  Pregled
  Ponude
  Kampanje
  Distribucija        (uklj. status odobrenja mrežnih placement-a)
  Interesovanja
  Publika i kontakti

Nagrađivanje           ← OSTAJE ODVOJENO (današnji Growth Studio sadržaj)
  Program
  Srca / poeni
  Referral
  Vaučeri
  QR
```

| Surface | Vlasnik domena |
|---|---|
| **Nagrađivanje** | `@panta/loyalty-engine` |
| **Growth Studio** | Distribution + Audience + Lead + Offer orkestracija |
| **Edukacije** | Education domen |

## 3. Pravilo

Growth Studio kasnije može da priključi Analytics, AI campaign assistant, SEO,
preporuke i conversion funnel — ali **ne postaje vlasnik tih domena**. Svaki
podatak koji prikazuje dolazi iz engine-a kroz adapter.

## 4. Acceptance criteria

- [ ] Growth Studio nema loyalty business logiku.
- [ ] Cross-tenant placement se iz Growth Studija može **zatražiti**, ali ne i
      odobriti — odobrenje je platform (superadmin) radnja.
- [ ] Nagrađivanje ostaje zaseban surface nad Loyalty Engine-om.
- [ ] Svaka sekcija Growth Studija je gated istim capability resolverom kao API
      i public renderer (vidi [T2B](PANTA-TENANT-VERTICALS-CAPABILITIES.md)).
- [ ] Preimenovanje/preseljenje ne menja postojeće loyalty ponašanje.

## Reference

- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
