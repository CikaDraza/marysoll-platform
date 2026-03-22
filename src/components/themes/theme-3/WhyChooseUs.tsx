import { CheckIcon } from "@heroicons/react/20/solid";

const benefits = [
  "Profesionalna oprema i aparati",
  "Vidljivi rezultati već posle prvog tretmana",
  "Individualni pristup svakom klijentu",
  "Prijatna i opuštajuća atmosfera",
  "Online zakazivanje 24/7",
];

export function Theme3WhyChooseUs() {
  return (
    <section className="bg-white py-20 lg:py-28 px-6">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-[#C9A990] text-xs font-semibold tracking-[0.25em] uppercase mb-3">zašto mi</p>
        <h2 className="text-3xl font-light text-[#3D2B1F] mb-12">Razlozi da nas izaberete</h2>
        <div className="space-y-3 text-left max-w-lg mx-auto">
          {benefits.map(b => (
            <div key={b} className="flex items-center gap-4 p-4 bg-[#FAF8F5] rounded-2xl border border-[#EDE5DC] hover:border-[#C9A990] transition group">
              <div className="w-7 h-7 rounded-full bg-[#C9A990]/15 flex items-center justify-center flex-shrink-0 group-hover:bg-[#C9A990]/25 transition">
                <CheckIcon className="h-3.5 w-3.5 text-[#C9A990]" />
              </div>
              <span className="text-[#7C6A5E] text-sm font-medium">{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
