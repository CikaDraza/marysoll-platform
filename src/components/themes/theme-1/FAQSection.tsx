import Link from "next/link";



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
  // Bez tenant FAQ sadržaja sekcija se ne prikazuje. Generička pitanja
  // predstavljena kao odgovori salona su i dalje tvrdnja koju salon nije dao.
  const faqs = items && items.length > 0 ? items : [];
  if (faqs.length === 0) return null;

  // Email SAMO iz stvarnog tenant podatka; ovde je ranije stajao
  // `podrska@kikikiss.beauty` — adresa drugog salona.
  const email = supportEmail || null;
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
          {/* Poziv na podršku ima smisla samo ako salon ima svoju adresu. */}
          {email && (
            <p className="mt-6 text-lg/8 text-gray-600">
              {support}{" "}
              <Link
                href={`mailto:${email}`}
                className="text-(--primary-color) underline font-semibold"
              >
                korisničku podršku.
              </Link>
            </p>
          )}
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
