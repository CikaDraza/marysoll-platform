# theme-9 — slike iz dizajn handoff-a

13 fotografija ekstrahovanih iz
`design/Skincare_Platform_Design-handoff/project/.image-slots.state.json`
(base64 `data:image/webp` → `.webp` fajlovi, ukupno ~373 KB).

Crop je u svim slotovima podrazumevan (`s:1, x:0, y:0`), pa ih theme-9
komponente prikazuju centriranim `object-cover` unutar zadatog `aspect-ratio` —
isto kako ih je crtao dizajn canvas. Sirove dimenzije se zato NE poklapaju sa
odnosom slota i to je očekivano.

## Ovo NISU fallback slike teme

theme-9 se zove „Expert Editorial" i nije vezana za jednog tenanta. Ove
fotografije jesu — to je Marinin sadržaj, uključujući dva portreta.

Nijedna theme-9 komponenta ih ne koristi kao automatski fallback i **ne sme**:
budući education tenant sa nepopunjenim CMS-om dobio bi tuđe lice na svojoj
početnoj strani. Komponente bez slike jednostavno ne renderuju okvir.

## Čemu služe

Seed sadržaj za Marinin tenant: njen `landingStructure` pokazuje na ove putanje
dok se ne prebace u njen Cloudinary medija prostor (gde tenant sadržaj i
pripada). `art-1..3` su naslovne slike njenih tekstova i idu uz objave, ne uz
temu.

| slot | sekcija | odnos u dizajnu |
|---|---|---|
| `hero-portret` | Hero | 4:5 |
| `about-portret` | O meni | 3:4 |
| `ig-1`…`ig-4` | Credentials / Instagram | 1:1 |
| `art-1`…`art-3` | naslovne slike tekstova | 4:3 |
| `klijenti-hero-foto`, `klijenti-faq-foto` | /za-klijente | 1:1, 3:4 |
| `pros-hero-foto`, `pros-faq-foto` | /za-profesionalce | 1:1, 4:3 |
