const MONTHS = [
  "Januar", "Februar", "Mart", "April", "Maj", "Jun",
  "Jul", "Avgust", "Septembar", "Oktobar", "Novembar", "Decembar",
] as const;

export function StatisticsPeriodFilter({
  month,
  year,
  onMonthChange,
  onYearChange,
  idPrefix = "statistics",
}: {
  month: number;
  year: number;
  onMonthChange: (month: number) => void;
  onYearChange: (year: number) => void;
  idPrefix?: string;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 5 + index);
  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-zinc-700 rounded-md shadow-sm bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-600 focus:border-violet-500";

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-month`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Mesec</label>
          <select id={`${idPrefix}-month`} value={month} onChange={(event) => onMonthChange(Number(event.target.value))} className={inputClass}>
            {MONTHS.map((label, index) => <option key={label} value={index + 1}>{label}</option>)}
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor={`${idPrefix}-year`} className="mb-1 block text-sm font-medium text-gray-700 dark:text-zinc-300">Godina</label>
          <select id={`${idPrefix}-year`} value={year} onChange={(event) => onYearChange(Number(event.target.value))} className={inputClass}>
            {years.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}
