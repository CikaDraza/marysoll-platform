import { CheckIcon } from "@heroicons/react/20/solid";

const benefits = [
  "Profesionalna oprema i aparati",
  "Vidljivi rezultati već posle prvog tretmana",
  "Individualni pristup svakom klijentu",
  "Prijatna i opuštajuća atmosfera",
  "Online zakazivanje 24/7",
];

export function Theme1WhyChooseUs() {
  return (
    <section className="relative py-16 lg:py-24 px-4">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,var(--color-indigo-100),white)] opacity-20" />

      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-3xl lg:text-4xl font-bold text-black mb-12">
          Zašto izabrati nas?
        </h2>
        <div className="bg-white rounded-3xl shadow-xl p-8 ring-1 ring-gray-100">
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b} className="flex items-center gap-3 text-left">
                <CheckIcon className="h-5 w-5 text-(--secondary-color) flex-shrink-0" />
                <span className="text-gray-700 font-medium">{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
