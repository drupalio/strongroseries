export type YearMonth = string;
export type LocalDate = string;

export function yearMonth(year: number, month: number): YearMonth {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function currentYearMonth(d: Date = new Date()): YearMonth {
  return yearMonth(d.getFullYear(), d.getMonth() + 1);
}

export function parseYearMonth(s: string): { year: number; month: number } {
  const [y, m] = s.split("-").map(Number);
  return { year: y, month: m };
}

export function todayISO(d: Date = new Date()): LocalDate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${
    String(d.getDate()).padStart(2, "0")
  }`;
}

export function localDate(year: number, month: number, day: number): LocalDate {
  return `${year}-${String(month).padStart(2, "0")}-${
    String(day).padStart(2, "0")
  }`;
}

export function monthsAgoISO(n: number, d: Date = new Date()): LocalDate {
  const dt = new Date(d);
  dt.setMonth(dt.getMonth() - n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${
    String(dt.getDate()).padStart(2, "0")
  }`;
}

export const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function spanishMonth(month: number): string {
  return SPANISH_MONTHS[month - 1];
}

export function monthFromSpanish(name: string): number {
  const idx = SPANISH_MONTHS.indexOf(name);
  if (idx >= 0) return idx + 1;
  const EN = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const e = EN.indexOf(name);
  return e >= 0 ? e + 1 : -1;
}
