# PANTA — Growth Studio kao composition surface (odluka 2026-08-16)

> Kratak dokument: Growth Studio **nije engine**. To je admin UI koji orkestrira
> više engine-a i ne poseduje nijedan domen.

## 1. Zatečeno stanje

[`AdminGrowthStudio.tsx`](../src/components/admin/loyalty/AdminGrowthStudio.tsx)
je danas zapravo Loyalty UI — sopstveni komentar to i kaže („MVP: Podešavanja /
Klijenti / Vaučeri; budući tiers/referral/promocije idu ovde"), a živi u
`components/admin/loyalty/`.

Pošto nagrađivanje sada postaje zasebna celina, taj naziv za taj sadržaj više
nije tačan.

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
  Distribucija
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
- [ ] Nagrađivanje ostaje zaseban surface nad Loyalty Engine-om.
- [ ] Svaka sekcija Growth Studija je gated istim capability resolverom kao API
      i public renderer (vidi [T2B](PANTA-TENANT-VERTICALS-CAPABILITIES.md)).
- [ ] Preimenovanje/preseljenje ne menja postojeće loyalty ponašanje.

## Reference

- [Distribution Engine](PANTA-DISTRIBUTION-ENGINE.md)
- [Education vertikala](PANTA-EDUCATION-VERTICAL.md)
- [Tenant verticals & capabilities](PANTA-TENANT-VERTICALS-CAPABILITIES.md)
