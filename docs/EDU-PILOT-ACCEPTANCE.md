# Edu Center — E5 pilot readiness

Datum: 2026-10-03. Grana: `feature/edu`.

**Tehnička spremnost je proverena. Marinina samostalna acceptance provera ostaje otvorena.** Automatizovani test ne potvrđuje da je ona završila zadatke bez pomoći.

## Četiri zadatka za Marinu

1. Napiši novi članak od nule.
2. Napravi jedan članak iz PDF-a ili DOCX-a.
3. Napravi jedan Video.
4. Napravi jedan Blog.

Acceptance signal: sva četiri zadatka obavi bez pitanja „gde ovo ide?”. Ne dodajemo proceduru koju treba naučiti pre pilot provere.

## Provereno u kodu i browseru

| Rez | Rezultat |
| --- | --- |
| E1 | Theme 9 bez ručno unetog CMS topicHub-a prikazuje objavljene Edu sadržaje. Testovi pokrivaju prag 4–6 i eksplicitni OFF; browser prikazuje šest kartica sa temom i ciljem. Mobilni viewport 390 × 844 nema horizontalni skrol. |
| E2 | Tri jasna ulaza: članak, PDF/DOCX, video. Browser otvara odgovarajući full-page editor. Uvoz stvarnog `estetika_lica.pdf` puni naslov i prikazuje 13 sekcija, 8 nabrajanja i jednu napomenu. |
| E3 | Nov nacrt dobija lokalnu zaštitu pre prvog Save-a. Browser sa isključenom vezom potvrđuje lokalno snimanje i nudi recovery posle ponovnog otvaranja. Serverska potvrda prethodne verzije ne briše noviju lokalnu kopiju. |
| E4 | Zaseban Blog tab i ručni/PDF/DOCX početak koriste isti Composer. Browser čuva nacrt; stvarni API i javni renderer potvrđuju objavu. Posle izmene nacrta javni naslov ostaje prethodno objavljen. Blog ne ulazi u Newsletter listu i send API ga odbija. |

Browser provere koriste privremenu lokalnu Mongo bazu i test tenanta; javni rendereri su provereni u tenant dev režimu. Produkciona baza nije menjana.

## Ponovljiva integraciona provera

`src/lib/education/edu-pilot.integration.test.ts` koristi MongoMemoryReplSet i stvarne modele/rute. Proverava:

- ručni članak → snimanje → objava;
- stvarni Marinin PDF → uređivi nacrt → snimanje → objava;
- video sa spoljnim izvorom → snimanje → objava;
- zaseban Blog → snimanje → objava → javni lookup;
- izmene nacrta ne menjaju objavljene Edu/Blog verzije, a Blog radna kopija ne ulazi u javni odgovor;
- Blog marker stvarno ostaje u Mongoose persistence-u;
- drugi tenant ne može da izmeni Blog i ne dobija njegovu javnu objavu.

Pilot provera je otkrila i zatvorila problem neposredne prve objave: editor sada prosleđuje upravo sačuvani ID publish mutaciji, umesto ID-a iz prethodnog rendera. Regresioni test je u `src/hooks/education/useEducationContent.test.ts`.

Pokretanje: `npm test -- src/lib/education/edu-pilot.integration.test.ts`.

Kompletna suite: 229 test fajlova, 2.428 testova prolazi, 21 preskočen. TypeScript, ESLint za promenjene fajlove i `git diff --check` prolaze. Produkcioni build: provera u toku.

## Otvoreni acceptance

| Zadatak | Marinina provera |
| --- | --- |
| Članak od nule | Čeka pilot |
| Članak iz PDF/DOCX-a | Čeka pilot |
| Video | Čeka pilot |
| Blog | Čeka pilot |

E5 se smatra završenim tek kada Marina potvrdi četiri samostalno obavljena zadatka. Ovaj commit zatvara automatizovanu proveru spremnosti i daje jasnu evidenciju za pilot, bez proglašavanja korisničkog acceptance-a završenim.
