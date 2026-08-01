/**
 * Shared Date Utilities (Frontend)
 * Single source of truth for date ranges and formatting across UI components
 */

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export function getToday(baseDate: Date = new Date()): DateRange {
  const startDate = new Date(baseDate);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(baseDate);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

export function getWeekRange(baseDate: Date = new Date()): DateRange {
  const startDate = new Date(baseDate);
  const day = startDate.getDay();
  startDate.setDate(startDate.getDate() - day);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  return { startDate, endDate };
}

export function getMonthRange(baseDate: Date = new Date()): DateRange {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();

  const startDate = new Date(year, month, 1, 0, 0, 0, 0);
  const endDate = new Date(year, month + 1, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

export function getQuarterRange(baseDate: Date = new Date()): DateRange {
  const year = baseDate.getFullYear();
  const quarter = Math.floor(baseDate.getMonth() / 3);

  const startDate = new Date(year, quarter * 3, 1, 0, 0, 0, 0);
  const endDate = new Date(year, (quarter + 1) * 3, 0, 23, 59, 59, 999);

  return { startDate, endDate };
}

export function getFinancialYear(baseDate: Date = new Date()): DateRange {
  const year = baseDate.getFullYear();
  const startDate = new Date(year, 0, 1, 0, 0, 0, 0);
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999);

  return { startDate, endDate };
}

export function getDateRange(period: string, baseDate: Date = new Date()): DateRange {
  switch (period.toLowerCase()) {
    case "today":
      return getToday(baseDate);
    case "week":
    case "this_week":
      return getWeekRange(baseDate);
    case "month":
    case "this_month":
      return getMonthRange(baseDate);
    case "quarter":
    case "this_quarter":
      return getQuarterRange(baseDate);
    case "year":
    case "this_year":
    case "financial_year":
      return getFinancialYear(baseDate);
    default:
      return getMonthRange(baseDate);
  }
}

export function formatDate(date: Date | string | null | undefined, format: string = "YYYY-MM-DD"): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "";

  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const day = pad(d.getDate());

  if (format === "YYYY-MM-DD") return `${year}-${month}-${day}`;
  if (format === "DD/MM/YYYY") return `${day}/${month}/${year}`;
  if (format === "MM/DD/YYYY") return `${month}/${day}/${year}`;

  return d.toLocaleDateString();
}
