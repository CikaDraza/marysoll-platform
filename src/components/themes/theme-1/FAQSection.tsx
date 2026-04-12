import Link from "next/link";

const DEFAULT_FAQS = [
  {
    question: "Koliko traje profesionalno šminkanje?",
    answer:
      "Profesionalno šminkanje traje između 60 i 120 minuta, u zavisnosti od željenog izgleda.",
  },
  {
    question: "Koliko ranije zakazati termin?",
    answer: "Najbolje 12 do 24 sata ako ste u mogucnosti.",
  },
  {
    question: "Da li je moguće online zakazivanje?",
    answer:
      "Naravno, najlakše vam je online i najsigurnije. Moze telefonom ili na mejl.",
  },
  {
    question: "Koje proizvode koristite?",
    answer:
      "Najbolje proizvode u ponudi na svetu. Zato imam tako dobre rezultate.",
  },
  {
    question: "Koliko traje manikir?",
    answer:
      "Trajanje manikira, dizajn, izlivanje, sredjivanje, velicina, sve to zavisi od zahteva i to moze da traje od 120 do 180 minuta.",
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

interface Props {
  headline?: string;
  subheadline?: string;
  items?: FaqItem[];
  supportText?: string;
  supportEmail?: string;
}

export function Theme1FAQSection({
  headline,
  subheadline,
  items,
  supportText,
  supportEmail,
}: Props) {
  const faqs = items && items.length > 0 ? items : DEFAULT_FAQS;
  const email = supportEmail || "podrska@kikikiss.beauty";
  const support =
    supportText ||
    "Ne možete pronaći odgovor koji tražite? Obratite se našem timu za";

  return (
    <div className="bg-white py-24 sm:py-32 px-3 lg:px-0">
      <div className="mx-auto grid max-w-7xl gap-20 xl:grid-cols-4">
        <div className="col-span-2">
          <h2 className="text-5xl font-semibold tracking-tight text-pretty text-gray-900 lg:text-6xl">
            {headline || "Često postavljana pitanja"}
          </h2>
          {subheadline && (
            <p className="mt-3 text-base text-gray-600">{subheadline}</p>
          )}
          <p className="mt-6 text-lg/8 text-gray-600">
            {support}{" "}
            <Link
              href={`mailto:${email}`}
              className="text-(--primary-color) underline font-semibold"
            >
              korisničku podršku.
            </Link>
          </p>
        </div>
        <ul role="list" className="grid gap-x-8 gap-y-6 col-span-2 sm:gap-y-8">
          {faqs.map((faq, i) => (
            <li key={i}>
              <div className="flex items-center gap-x-6">
                <div>
                  <h3 className="text-base/7 font-semibold tracking-tight text-black">
                    {faq.question}
                  </h3>
                  <p className="text-md font-medium text-gray-700">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
