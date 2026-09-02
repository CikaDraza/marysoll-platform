const rsdFormatter = new Intl.NumberFormat("sr-RS", { style: "currency", currency: "RSD" });

export function formatStatisticsCurrency(amount: number) {
  return rsdFormatter.format(amount);
}
