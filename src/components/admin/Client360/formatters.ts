const currencyFormatter = new Intl.NumberFormat("sr-RS", {
  style: "currency",
  currency: "RSD",
});

export const formatClientMoney = (value: number | null | undefined) =>
  value == null ? "Cena nije definisana" : currencyFormatter.format(value);
