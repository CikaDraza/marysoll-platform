"use client";

interface Props {
  salonName: string;
  contactEmail: string;
  tenantSlug: string;
}

export default function CookiePolicyClient({ salonName, contactEmail }: Props) {
  return (
    <div className="privacy-policy bg-white py-24 lg:py-44">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:text-center">
          <span className="text-base/7 font-semibold text-(--primary-color)">
            {salonName}
          </span>
          <h1 className="mt-2 text-5xl! font-semibold tracking-tight text-pretty text-gray-900 sm:text-5xl lg:text-balance">
            Politika kolačića
          </h1>
          <p className="mt-6 text-lg/8 text-gray-700">
            Ova stranica objašnjava kako koristimo kolačiće i slične tehnologije
            na našem sajtu.
          </p>
        </div>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Šta su kolačići?
        </h2>
        <p className="mt-6 text-lg/8 text-gray-700">
          Kolačići su male tekstualne datoteke koje se čuvaju na vašem uređaju
          kada posetite sajt. Kolačići nam pomažu da prepoznamo uređaj i
          zapamtimo vaše postavke.
        </p>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Kategorije kolačića
        </h2>

        <h3 className="mt-10 text-2xl! font-bold tracking-tight text-gray-900 max-w-none">
          Strogo neophodni (Strictly necessary)
        </h3>
        <p className="mt-6 text-lg/8 text-gray-700">
          Ovi kolačići su neophodni za osnovne funkcionalnosti sajta (sesije,
          prijava, bezbednost). Ne zahtevaju saglasnost i uvek su omogućeni.
        </p>

        <h3 className="mt-10 text-2xl! font-bold tracking-tight text-gray-900 max-w-none">
          Funkcionalni (Functional)
        </h3>
        <p className="mt-6 text-lg/8 text-gray-700">
          Omogućavaju bolje korisničko iskustvo (npr. čuvanje preferencija
          interfejsa, chat widget). Učitavaju se samo ako korisnik da
          saglasnost.
        </p>

        <h3 className="mt-10 text-2xl! font-bold tracking-tight text-gray-900 max-w-none">
          Analitički (Analytics)
        </h3>
        <p className="mt-6 text-lg/8 text-gray-700">
          Koristimo ih za prikupljanje anonimnih statistika o posetama (npr.
          Google Analytics). Ne učitavaju se dok korisnik ne da saglasnost.
        </p>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Treće strane
        </h2>
        <p className="mt-6 text-lg/8 text-gray-700">
          Na sajtu možemo koristiti third-party servise (analitika, oglašavanje,
          widgeti). Ti servisi mogu postavljati svoje kolačiće — njihova
          upotreba je podložna pravilima te treće strane.
        </p>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Kako da promenite ili opozovete saglasnost
        </h2>
        <p className="mt-6 text-lg/8 text-gray-700">
          Možete promeniti podešavanja kolačića u bilo kom trenutku klikom na{" "}
          <button
            onClick={() =>
              window.dispatchEvent(new Event("open-cookie-preferences"))
            }
            className="cursor-pointer underline font-medium text-(--secondary-color)"
          >
            banner
          </button>{" "}
          ili brisanjem kolačića u vašem browseru.
        </p>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Čuvanje podataka
        </h2>
        <p className="mt-6 text-lg/8 text-gray-700">
          Čuvamo evidenciju vašeg pristanka (u localStorage) radi revizije i
          usklađenosti.
        </p>

        <h2 className="mt-16 text-4xl! font-bold tracking-tight text-gray-900 max-w-none">
          Kontakt
        </h2>
        <p className="mt-6 text-lg/8 text-gray-700">
          Ako imate pitanja o ovoj politici, kontaktirajte nas
          {contactEmail ? (
            <>
              {" "}
              na <strong>{contactEmail}</strong>.
            </>
          ) : (
            " putem naše aplikacije."
          )}
        </p>
        <p className="mt-6 text-lg/8 text-gray-700">
          Ovu politiku ažuriramo po potrebi; datum poslednje izmene:{" "}
          {new Date().toLocaleDateString("sr-RS")}.
        </p>
      </div>
    </div>
  );
}
