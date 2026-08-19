/**
 * Sadržaj tematskih podstranica za Marinin tenant — AUTHORING PODACI.
 *
 * Izvor je `design/Skincare_Platform_Design-handoff/project/handoff/marina-fixture.js`,
 * ali je sadržaj ovde RUČNO PRESLIKAN, ne uvezen. Fixture je dizajnerski
 * artefakt; aplikacija ga ne sme imati kao runtime zavisnost ni u jednoj ruti,
 * modelu ni stranici.
 *
 * ŠTA JE NAMERNO IZOSTAVLJENO: cene formata edukacije (`od 39.000 RSD / tim`
 * i sl.). U handoff-u su označene kao placeholder, a pravilo je da se ne
 * objavljuju izmišljene cene ni formati dok ih Marina ne potvrdi. Umesto njih
 * stoji napomena da se program dogovara po timu.
 *
 * Ovo je PRIVREMENI mehanizam autorstva, ne privremena runtime arhitektura:
 * kada CMS editor stigne, piše u isto `SalonProfile.themePages` polje i javno
 * renderovanje se ne menja.
 */

/** Jedini tenant koji ova skripta sme da dodirne. */
export const MARINA_TENANT_SLUG = "marina-stanisavljevic-skincare-edukacija";

/** Struktura je namerno lokalna — skripta ne uvozi `@/types` (nema alias-a). */
export interface SeedThemePage {
  enabled: boolean;
  hero?: {
    eyebrow?: string;
    headline?: string;
    lead?: string;
    note?: string;
    cta?: { text: string; href: string };
    image?: { src: string; alt?: string };
  };
  cards?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    items: { kind?: string; title: string; text?: string; meta?: string }[];
  };
  steps?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    items: { title: string; text?: string; meta?: string; points?: string[] }[];
  };
  faq?: {
    heading?: { eyebrow?: string; headline?: string; lead?: string };
    image?: { src: string; alt?: string };
    items: { question: string; answer: string }[];
  };
  cta?: {
    headline?: string;
    lead?: string;
    cta?: { text: string; href: string };
    tone?: "accent" | "warm";
  };
}

export const marinaThemePages: Record<string, SeedThemePage> = {
  "za-klijente": {
    enabled: true,
    hero: {
      eyebrow: "Za tebe lično",
      headline: "Razumevanje sopstvene kože pre kupovine proizvoda.",
      lead: "Zajedno prolazimo kroz stanje kože, dosadašnju rutinu i cilj nege. Rezultat je pisani plan sa jasnim redosledom koraka i praćenjem reakcije kože.",
      note: "Odgovor na upit u roku od 48h · online ili u salonu",
      image: { src: "/images/theme-9/klijenti-hero-foto.webp", alt: "Detalj nege kože" },
    },
    cards: {
      heading: {
        eyebrow: "Kada ima smisla",
        headline: "Tri situacije u kojima konsultacija najviše pomaže.",
      },
      items: [
        {
          title: "Kupujem, ali ne znam da li mi treba",
          text: "Proizvodi se biraju po popularnosti sastojka, a ne po potrebi kože.",
        },
        {
          title: "Koža je masna, a ipak zategnuta",
          text: "Agresivno odmašćivanje često dodatno narušava ravnotežu kože.",
        },
        {
          title: "Rutina je postala prekomplikovana",
          text: "Previše aktivnih proizvoda uvedenih istovremeno — bez jasnog cilja.",
        },
      ],
    },
    steps: {
      heading: {
        eyebrow: "Kako izgleda rad",
        headline: "Četiri koraka, od upitnika do praćenja.",
        lead: "Svaki korak ima svoju svrhu — plan bez praćenja reakcije kože nije plan.",
      },
      items: [
        {
          title: "Upitnik o koži",
          text: "Navike nege, prethodni proizvodi, reakcije i cilj.",
          meta: "pre termina",
        },
        {
          title: "Procena i razgovor",
          text: "Razlikovanje tipa i stanja kože, prioriteti nege.",
          meta: "45–60 min",
        },
        {
          title: "Pisani plan nege",
          text: "Redosled koraka, učestalost i šta pratiti prve nedelje.",
          meta: "PDF, do 3 dana",
        },
        {
          title: "Follow-up",
          text: "Provera reakcije kože i prilagođavanje rutine.",
          meta: "nakon 4 nedelje",
        },
      ],
    },
    faq: {
      heading: { eyebrow: "Česta pitanja", headline: "Pre nego što zakažeš." },
      image: { src: "/images/theme-9/klijenti-faq-foto.webp", alt: "Detalj proizvoda za negu" },
      items: [
        {
          question: "Da li konsultacija zamenjuje pregled dermatologa?",
          answer:
            "Ne. Konsultacija je edukativne prirode i odnosi se na negu kože, izbor proizvoda i rutinu. Za dijagnostiku i lečenje kožnih stanja uputiću te lekaru.",
        },
        {
          question: "Moram li da znam svoj tip kože pre termina?",
          answer:
            "Ne. Upravo procena tipa i trenutnog stanja kože je prvi deo konsultacije — najčešća greška je poistovećivanje tipa kože sa stanjem kože.",
        },
        {
          question: "Da li treba da kupim nove proizvode?",
          answer:
            "Ne obavezno. Prvo prolazimo kroz ono što već koristiš. Često je rešenje pojednostavljenje rutine, a ne dodavanje novih proizvoda.",
        },
        {
          question: "Kada se vide rezultati?",
          answer:
            "Zavisi od stanja kože i cilja nege. Zato je follow-up nakon četiri nedelje deo procesa — tada pratimo reakciju i prilagođavamo rutinu.",
        },
      ],
    },
    cta: {
      headline: "Saznaj šta tvojoj koži zaista treba.",
      lead: "Zakazivanje konsultacije biće dostupno uskoro.",
      tone: "warm",
    },
  },

  "za-profesionalce": {
    enabled: true,
    hero: {
      eyebrow: "Za tvoj tim",
      headline: "Stručniji pristup koži u tvom salonu.",
      lead: "Edukacija za kozmetičare i timove: sistematična procena kože, grupe aktivnih sastojaka i način na koji se preporuka objašnjava klijentu.",
      image: { src: "/images/theme-9/pros-hero-foto.webp", alt: "Radionica sa timom u salonu" },
    },
    cards: {
      heading: {
        eyebrow: "Formati",
        headline: "Program se prilagođava nivou znanja tima.",
        lead: "Format i obim se dogovaraju prema broju članova tima i vrsti usluga koje salon pruža.",
      },
      // Cene NAMERNO izostavljene — placeholder su u handoff-u i čekaju potvrdu.
      items: [
        {
          kind: "Uživo",
          title: "Radionica u salonu",
          text: "Poludnevna radionica za tim, sa primerima iz prakse i vežbama procene kože.",
        },
        {
          kind: "Online",
          title: "Online kurs",
          text: "Moduli koje tim prolazi sopstvenim tempom, sa proverom razumevanja.",
        },
        {
          kind: "1:1",
          title: "Mentorstvo",
          text: "Individualna podrška kozmetičaru kroz konkretne slučajeve iz prakse.",
        },
        {
          kind: "Materijali",
          title: "PDF materijali",
          text: "Stručni materijali za internu upotrebu i podsetnik posle edukacije.",
        },
      ],
    },
    steps: {
      heading: {
        eyebrow: "Oblasti edukacije",
        headline: "Četiri celine koje čine okvir preporuke.",
      },
      items: [
        {
          title: "Procena kože",
          points: [
            "Tip kože i produkcija sebuma",
            "Stanje kože: dehidriranost, osetljivost, barijera",
            "Najčešće greške u proceni",
          ],
        },
        {
          title: "Aktivni sastojci",
          points: [
            "Funkcija, namena i razlozi za oprez",
            "Povezivanje potrebe kože i cilja nege",
            "Zašto više sastojaka ne znači bolju negu",
          ],
        },
        {
          title: "Kombinovanje u rutini",
          points: [
            "Postepeno uvođenje i praćenje reakcije",
            "Nega barijere kao osnova rutine",
            "Kada je rutina preopterećena",
          ],
        },
        {
          title: "SPF i fotoprotekcija",
          points: [
            "UVA, UVB i širokospektralna zaštita",
            "SPF 30 vs. 50 i količina nanošenja",
            "Kako klijentu objasniti značaj zaštite",
          ],
        },
      ],
    },
    faq: {
      heading: { eyebrow: "Česta pitanja", headline: "O saradnji sa salonima." },
      image: { src: "/images/theme-9/pros-faq-foto.webp", alt: "Edukacija u salonu" },
      items: [
        {
          question: "Koliko ljudi može da učestvuje u radionici?",
          answer:
            "Format je namenjen manjim timovima, do desetak osoba, kako bi svi imali priliku da rade na konkretnim primerima iz prakse.",
        },
        {
          question: "Da li je program prilagođen početnicima?",
          answer:
            "Program se prilagođava nivou znanja tima. Pre dogovora prolazimo kratku procenu — šta tim već primenjuje i gde nastaju najčešće greške.",
        },
        {
          question: "Šta tim dobija posle edukacije?",
          answer:
            "Stručne PDF materijale za internu upotrebu i jasan okvir preporuke: procena → potreba → izbor sastojka → postepeno uvođenje → praćenje reakcije.",
        },
        {
          question: "Može li edukacija da se organizuje online?",
          answer:
            "Da. Online kurs se koristi kao samostalan format ili kao priprema pre radionice uživo, a mentorstvo 1:1 se uvek odvija online.",
        },
      ],
    },
    cta: {
      headline: "Zatraži predlog programa za svoj tim.",
      lead: "Program se dogovara prema broju članova tima, nivou znanja i vrsti usluga koje salon pruža.",
      tone: "accent",
    },
  },
};
