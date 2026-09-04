# AI generisanje slika — isključeno, sa uslovom za povratak

> Odluka: **2026-09-02.** Kod: `api/generate-image/route.ts`,
> `components/themes/*/ImageGenerationSection.tsx`,
> `services/generateImageWidget.ts`.

## 1. Odluka

AI generisanje slika (šminka, nokti) **više se ne nudi javno**. Uključuje se
tek ako Marija — ili neki drugi salon — to zatraži, i tada kroz plan, ne kroz
kod.

Ovo je poslovna odluka, ne samo bezbednosna popravka.

## 2. Šta je zatečeno

Sekcija je bila **bezuslovno renderovana na javnoj landing strani** theme-1, a
endpoint `POST /api/generate-image` nije imao:

- autentifikaciju,
- tenant kontekst,
- plan gate.

Jedina zaštita bio je rate limit po IP adresi. Svako ko otvori salonsku
stranicu mogao je da generiše slike **o trošku platforme**, preko OpenAI
ključa iz `API_KEY_OPEN_IMAGE_GEN`.

Marijin plan pritom izričito kaže:

```
aiRequestsPerMonth: 0
aiImageGeneration: false
```

Dakle plaćeni resurs se trošio i za salone koji na njega nemaju pravo.

## 3. Šta je urađeno

**Javna sekcija je uklonjena** iz `Theme1Landing`. Nijedan layout više ne
renderuje nijedan `ImageGenerationSection` — proveravano za sve teme.

**Endpoint je fail-closed:**

```
bez tokena            → 401
nije admin            → 403
admin bez tenanta     → 403
plan nema mogućnost   → 403 (requireFeature("aiImageGeneration"))
superadmin            → prolazi
```

Plan se čita **sa servera**. Browser flag se ne uzima u obzir — inače bi
klijent mogao da ga sam postavi.

**Admin CMS nastavlja da radi.** `components/admin/cms/primitives.tsx` koristi
isti endpoint za generisanje slika u landing editoru; to je autentifikovan
tok i legitiman potrošač. Nije menjan.

Novi AI podsistem nije pravljen.

## 4. Kako se vraća

Ako salon zatraži funkciju:

1. plan mu mora dati `aiImageGeneration: true` — endpoint je već gated, ne
   treba menjati kod;
2. za javnu sekciju: vratiti `<Theme1ImageGenerationSection />` u
   `Theme1Landing`, **ali uz capability/plan proveru na serveru**, ne
   bezuslovno kao ranije.

Druga tačka je bitna: povratak sekcije bez gate-a vraća i rupu.

## 5. Poznati mrtav kod

`Theme1ImageGenerationSection`, `Theme2ImageGenerationSection` i
`Theme3ImageGenerationSection` i dalje postoje i izvezeni su iz `index.ts`
svoje teme, ali ih **nijedan layout ne renderuje**.

Namerno su ostavljeni: odluka je „isključeno dok se ne zatraži", pa brisanje
ne bi ništa dobilo osim da povratak košta više. Ako se za pola godine ne
zatraže, brišu se zajedno sa theme-3 (vidi
[PANTA-BOOKING-CRM-ARC.md §8](PANTA-BOOKING-CRM-ARC.md)).

`services/generateImageWidget.ts` je klijentski poziv koji te sekcije koriste;
posle gate-a bi neautentifikovanom korisniku vratio 401.
