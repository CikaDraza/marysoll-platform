# Theme 8: Marketing Banner na Landing strani

`MarketingBanner` je ponovljiv CMS sadržaj. `landingStructure.marketingBanners` čuva podatke, a `landingStructure.sectionOrder` čuva samo stabilne reference (`hero`, `gallery`, `marketing:<id>` itd.). ID banera se ne izvodi iz položaja ili imena.

Sistemske sekcije u Theme 8 ostaju u zatečenom relativnom redosledu: hero, about, social proof, services, gallery, perks, testimonials, FAQ, tribute. Footer je u shell-u posle njih. CMS strelice pomeraju samo banere između tih pozicija; Hero ostaje prvi, footer poslednji. Ako nema sačuvanog redosleda, koristi se zatečeni raspored. Ako nema banera, javna strana se ne menja.

U CMS-u se novom tenantu na Theme 8 nudi ugašen predložak „Edukacija” sa lokalnom slikom i zadatom kopijom. Uključivanje i čuvanje su eksplicitni; prazan niz sačuvanih banera znači da je predložak uklonjen. Dodatni baneri se kreiraju ugašeni i postavljaju posle poslednjeg banera. Vaučer se dodaje istim dugmetom bez posebne komponente.

`contained` prikazuje uspravnu 3:4 glavnu sliku u belom ramu, pa naslov, opis i opcioni CTA. `full-width` na desktopu koristi posebnu pozadinsku sliku i raspoređuje tekst levo, glavnu sliku desno; na telefonu se vraća na uspravni prikaz. Divider je opcioni SVG iznad banera. Aktivni banner mora imati glavnu sliku i alt tekst; `full-width` zahteva i pozadinsku sliku. CTA sa custom odredištem zahteva ispravan link kada je uključen. Edu Centar odredište vodi na tenantovu `/edukacija` rutu, koja postoji samo ako tenant ima javnu Edu površinu.
