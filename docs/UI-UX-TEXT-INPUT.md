# UI/UX — unos dužeg teksta i proširivanje polja

Datum: **2026-10-05**. Grana: `fix/ui-ux-small-improvements`.
Status: implementirano i lokalno provereno; čeka korisničku proveru i merge.

## Chat

Proširivi unos koristi se u admin i superadmin chat-u, kao i u chat-u vezanom
za termin na admin i client strani.

- Početna visina je 2 reda. Pisanje ili paste automatski povećava visinu do
  12 redova, uz ograničenje raspoloživog prostora na manjim ekranima.
- Ručka iznad unosa povlači se nagore za veće polje i nadole za manje.
  Fokusirana ručka podržava i strelice gore/dole.
- Ceo composer, uključujući prateće kontrole, ograničen je na 70% visine
  prostora razgovora ispod zaglavlja.
- Ručno izabrana visina ostaje dok korisnik uređuje poruku. Pražnjenje unosa,
  uključujući uspešno slanje, vraća automatsko podešavanje na 2 reda.
- `Enter` šalje poruku; `Shift+Enter` dodaje novi red.
- Tekst duži od vidljivog unosa skroluje se unutar textarea.

Prostor poruka zadržava visinu dok composer prekriva njegov donji deo.
Dinamički donji padding omogućava skrolovanje poslednje poruke iznad
composera. Smanjivanje unosa ponovo otkriva veći deo razgovora. Prikaz poruka
čuva nove redove i prelama dugačke reči.

Zajedničke komponente:

- `src/components/admin/chat/ChatTextarea.tsx` — automatska visina, ručka,
  pointer capture, podešavanje tastaturom i ograničenje visine.
- `src/components/admin/chat/ChatConversationFrame.tsx` — pun prostor poruka,
  composer pri dnu i ažuriranje prostora za skrol preko `ResizeObserver`.

Chat modali termina koriste ograničenu visinu prilagođenu viewport-u.

## Newsletter, Content Composer i Marketing

Polja za nazive, naslove, subject, kratki preview tekst, tekst dugmadi, URL,
slug, datume i numeričke vrednosti ostaju odgovarajući jednolinijski input-i.

Polja za duži sadržaj koriste textarea sa vertikalnim proširivanjem i
maksimalnom visinom od `70dvh`. Korisnik povlači standardnu ručku pri donjoj
ivici polja. Ova formularska polja ne koriste chat automatski rast ni
prekrivanje poruka.

Obuhvaćeno:

- Newsletter: varijable za duži sadržaj, HTML import i AI instrukcije za
  generisanje email templejta.
- Content Composer: opisi cenovnih blokova i stavki, uvod feature bloka,
  opis tabele i slike, kao i postojeća polja za pasuse i drugi duži sadržaj.
- Generisanje slika: pojedinačni i višestruki promptovi zamenjeni su textarea
  poljima.
- `/dashboard?tab=email-campaign-ai`: tema/instrukcije kampanje, opis
  prilagođenog segmenta i lista email adresa.
- `/marketing/campaigns/[id]/edit`: tema kampanje, opis ciljne publike i glavni
  tekst emaila.
- Ostala postojeća textarea polja u CMS-u, profilu, SEO-u, newsletter-u i
  opisima usluga: omogućeno vertikalno proširivanje.

Liste `/marketing/campaigns/drafts`, `/sent`, `/scheduled` i `/failed` dele
`CampaignsListPage`; nemaju dodatna polja za unos dužeg sadržaja. Unos datuma
zakazivanja ostaje `datetime-local`. Stranice analitike i A/B pregleda prikazuju
podatke, a naziv segmenta publike ostaje jednolinijski.

`src/lib/newsletter/fieldPresentation.ts` prepoznaje duži sadržaj i kod
starijih/uvezenih newsletter templejta koji ga označavaju kao `text`:
`description`, `body`, `content`, `summary`, `instructions`, `prompt`, `intro`,
`opis`, `sadrzaj`/`sadržaj`, `heroText`, `mainText` i `message`. CamelCase i
razdvojene reči podržani su za opisne nazive. Završeci za naslov, naziv,
subject, label, URL i slug čuvaju jednolinijski unos. Eksplicitni tipovi
`textarea`, `url`, `image`, `date` i `datetime-local` poštuju se.

## Provera

- Ciljani Vitest: **3 fajla / 11 testova** prolaze — klasifikacija newsletter
  polja i postojeći Content Composer testovi.
- ESLint nad izmenjenim TS/TSX fajlovima: bez grešaka; postojeće upozorenje za
  nekorišćeni `isError` u `AdminNewsletterDashboard` ostaje.
- TypeScript izvornog koda prolazi. Standardna provera je najpre prijavila
  zastarele generisane `.next` rute prethodne grane; izvorni kod proveren je
  privremenom konfiguracijom koja ne uključuje taj generisani keš.
- Izolovani browser prikazi sa test podacima: paste, automatski limit,
  povlačenje nagore/nadole, ograničenje 70%, nepromenjena visina prostora
  poruka, skrolovanje do poslednje poruke i reset unosa.
- Newsletter i Marketing: provereno vertikalno povlačenje, očuvanje
  višerednog teksta i širine, kao i jednolinijski naslovi/nazivi, na desktop
  i mobilnoj širini.

Browser provere nisu slale stvarne poruke niti kreirale kampanje preko API-ja.
Produkcijski build i kompletan test paket nisu pokretani u ovom rezu.

## Korisnička provera pre merge-a

1. U admin i superadmin chat nalepiti dužu poruku, proširiti unos i skrolovati
   do poslednje poruke; zatim smanjiti unos.
2. Ponoviti u admin i client chat-u termina; proveriti `Shift+Enter` i slanje.
3. U Newsletter-u proširiti opis, HTML i instrukcije za sliku; proveriti da
   nazivi i naslovi ostaju jednolinijski.
4. U AI Marketing-u i editoru nacrta kampanje uneti više pasusa u temu i opis
   publike, proširiti polja i proveriti čuvanje kroz postojeći aplikacioni tok.
