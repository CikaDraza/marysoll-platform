export function normalizePhone(input: string): string {
  if (!input) return "";

  // skini sve osim + i cifara
  let phone = input.replace(/[^0-9+]/g, "");

  // ako počinje sa +381
  if (phone.startsWith("+381")) {
    // ukloni nulu ako postoji (npr +38106...)
    phone = phone.replace(/^(\+381)0/, "$1");
    return phone;
  }

  // ako počinje sa 0 (062…)
  if (phone.startsWith("0")) {
    phone = "+381" + phone.substring(1);
    return phone;
  }

  // ako je već samo broj bez +381 i ne počinje nulom
  // npr "62201787" → "+38162201787"
  if (/^[1-9][0-9]{6,}$/.test(phone)) {
    phone = "+381" + phone;
  }

  return phone;
}
