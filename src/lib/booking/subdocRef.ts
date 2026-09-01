/**
 * `ref` — opaque adresa ugnežđenog dela usluge (varijanta, dodatak, stavka
 * paketa) u javnom booking ugovoru.
 *
 * Zašto ne golo `_id`: javni ugovor ne treba da bude vezan za Mongo/Mongoose.
 * Booking Engine ionako govori jezikom `variantRef` / `extraRefs` / `itemRefs`,
 * pa je `ref` prirodnije ime. Iza njega danas stoji `subdoc._id`, ali potrošač
 * to ne sme da pretpostavlja: `ref` se ne parsira, ne poredi po obliku i ne
 * koristi ni za šta osim da se vrati serveru.
 *
 * `ref` NIJE autoritet. Server u Koraku 2 učitava canonical `Service` po
 * (tenant, serviceId) i tek onda proverava da prosleđeni ref-ovi zaista
 * pripadaju TOJ usluzi — nikad se ne radi globalni lookup po ref-u.
 */
export function subdocRef(subdoc: Record<string, unknown>): string {
  const id = subdoc._id;
  return id == null ? "" : String(id);
}
