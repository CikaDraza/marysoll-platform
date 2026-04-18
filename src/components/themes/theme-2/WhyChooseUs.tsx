import { CheckIcon } from "@heroicons/react/20/solid";

const benefits = [
  "Profesionalna oprema i aparati",
  "Vidljivi rezultati već posle prvog tretmana",
  "Individualni pristup svakom klijentu",
  "Prijatna i opuštajuća atmosfera",
  "Online zakazivanje 24/7",
];

export function Theme2WhyChooseUs() {
  return (
    <section className="bg-white py-24 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="w-12 h-0.5 bg-yellow-500 mb-4" />
        <h2 className="text-3xl font-black text-black mb-12">
          Zašto izabrati nas?
        </h2>
        <div className="space-y-3">
          {benefits.map((b) => (
            <div
              key={b}
              className="flex items-center gap-4 p-4 bg-gray-950 rounded-xl border border-gray-700 hover:border-yellow-500/40 transition group"
            >
              <div className="w-8 h-8 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center flex-shrink-0 group-hover:bg-yellow-500/20 transition">
                <CheckIcon className="h-4 w-4 text-yellow-500" />
              </div>
              <span className="text-gray-100 font-medium text-sm">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
