/**
 * T1-4 §30 — ugovori admin prikaza koje testni stack (node, bez DOM-a) ne može
 * da dokaže renderovanjem.
 *
 * Ovo NIJE zamena za domenske testove: sve poslovne odluke su pokrivene
 * integracionim testovima nad Mongo-om. Ovde se drže samo granice koje bi se
 * tiho izgubile refaktorom prikaza.
 */
import fs from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

const read = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

/**
 * Kod bez komentara.
 *
 * Provere „ovoga NEMA" moraju da gledaju kod, ne prozu: komentar koji
 * objašnjava zašto kursa nema sadrži reč „kurs" i lažno bi obarao test.
 */
const codeOnly = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const growthStudio = read("src/components/admin/loyalty/AdminGrowthStudio.tsx");
const pointsShopEditor = read("src/components/admin/loyalty/PointsShopEditor.tsx");
const checkoutModal = read("src/components/admin/AppointmentCheckoutModal.tsx");
const picker = read("src/components/loyalty/LoyaltyBenefitPicker.tsx");
const adminAppointments = read("src/components/admin/AdminAppointments.tsx");

describe("points shop editor", () => {
  it("prenosi stabilan `id` nazad — identitet ponude ne nastaje u browseru", () => {
    // Ključ liste je `offer.id`, a `id` ostaje deo objekta kroz `...offer`.
    expect(pointsShopEditor).toMatch(/offer\.id \?\? `new-\$\{index\}`/);
    expect(pointsShopEditor).toMatch(/\.\.\.offer,/);
  });

  it("nema kursa poen→RSD ni slobodne konverzije", () => {
    const code = codeOnly(pointsShopEditor);
    expect(code).not.toMatch(/exchangeRate|per100Rsd|conversionRate/);
    // Slobodan unos „potroši N poena" bi tražio kurs koji proizvod nema.
    expect(code).not.toMatch(/type="range"/);
    expect(code).toMatch(/costPoints/);
  });

  it("editor se prikazuje samo dok poeni rade, ali se konfiguracija ne briše", () => {
    expect(growthStudio).toMatch(
      /form\.currencies\.points\.enabled && \([\s\S]{0,400}PointsShopEditor/,
    );
    expect(growthStudio).not.toMatch(/pointsShop = \[\]/);
  });

  it("nema podešavanja za stackovanje ni globalni cap popusta", () => {
    expect(codeOnly(growthStudio)).not.toMatch(/allowStacking|maxDiscount/i);
    expect(codeOnly(pointsShopEditor)).not.toMatch(/allowStacking|maxDiscount/i);
  });

  it("`Koriguj balans` ostaje zaseban alat i nije diran", () => {
    const client360 = read("src/components/admin/Client360/ClientLoyaltySection.tsx");
    expect(client360).toMatch(/Koriguj balans/);
    expect(client360).toMatch(/AdjustModal/);
  });
});

describe("admin checkout", () => {
  it("svi iznosi dolaze iz server preview-a", () => {
    expect(checkoutModal).toMatch(/useAppointmentCheckoutPreview/);
    expect(checkoutModal).toMatch(/preview\.amountDue/);
    expect(checkoutModal).toMatch(/preview\.discountAmount/);
    expect(checkoutModal).toMatch(/preview\.expectedEarning/);
  });

  it("modal ne radi sopstvenu aritmetiku popusta ni poena", () => {
    const code = codeOnly(checkoutModal);
    expect(code).not.toMatch(/priceBeforeBenefit\s*-\s*/);
    expect(code).not.toMatch(/per100Rsd/);
  });

  it("bez potvrđene pre-benefit cene završetak je blokiran", () => {
    expect(checkoutModal).toMatch(/requiresAgreedPrice/);
    expect(checkoutModal).toMatch(/disabled=\{blocked/);
  });
});

describe("primena pogodnosti", () => {
  it("klijent i admin dele isti picker i isti server seam", () => {
    expect(picker).toMatch(/audience\?: "client" \| "admin"/);
    expect(picker).toMatch(/useApplyAppointmentBenefit/);
    expect(adminAppointments).toMatch(/LoyaltyBenefitPicker/);
    expect(adminAppointments).toMatch(/audience="admin"/);
  });

  it("picker šalje SAMO id izbora", () => {
    const code = codeOnly(picker);
    expect(code).toMatch(/kind: "voucher", voucherId/);
    expect(code).toMatch(/kind: "points_shop", offerId/);
    // Cena u poenima i iznos popusta se čitaju iz DTO-a, nikad ne šalju nazad.
    expect(code).not.toMatch(/costPoints:/);
    expect(code).not.toMatch(/discountAmount:/);
  });

  it("admin klik je izvršenje — nema approval lifecycle-a", () => {
    const code = codeOnly(picker);
    // `isPending` (stanje mutacije) je dozvoljen; approval lifecycle nije.
    expect(code).not.toMatch(/approval|approve|requestBenefit|awaitingApproval/i);
    expect(code).not.toMatch(/status: "pending"/);
  });

  it("kada pogodnost već stoji, nudi se uklanjanje umesto druge pogodnosti", () => {
    expect(picker).toMatch(/Ukloni pogodnost/);
    expect(picker).toMatch(/!data\?\.applied &&/);
  });
});

describe("post-booking tok", () => {
  it("loyalty ekran dolazi POSLE uspešnog zakazivanja, iz loyalty sloja", () => {
    const provider = read("src/components/shared/booking/BookingProvider.tsx");
    expect(provider).toMatch(/LoyaltyBenefitPrompt/);
    // Ekran se otvara tek kada create vrati id — nikad pre upisa.
    expect(provider).toMatch(/createdId[\s\S]{0,120}setBenefitAppointmentId/);
    // Booking widget ne zna za nagrade: nema loyalty koraka u selekciji.
    expect(codeOnly(provider)).not.toMatch(/pointsShop|redeemPoints/);
  });
});
