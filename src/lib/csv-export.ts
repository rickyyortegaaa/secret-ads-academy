import "server-only";

/**
 * Builds a CSV string from rows of objects. Always quotes every value to
 * sidestep edge cases (commas, quotes, newlines, leading equals signs).
 * Prefixes a UTF-8 BOM so Excel opens it with the right encoding.
 */
export function buildCSV<T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[]
): string {
  const escape = (raw: unknown): string => {
    let value = raw == null ? "" : String(raw);
    // Defang formula injection (=, +, -, @ at start of cell)
    if (/^[=+\-@\t\r]/.test(value)) value = "'" + value;
    // Always wrap in quotes; double-up internal quotes
    return `"${value.replace(/"/g, '""')}"`;
  };

  const headerLine = columns.map((c) => escape(c.header)).join(",");
  const dataLines = rows.map((row) =>
    columns.map((c) => escape(row[c.key])).join(",")
  );

  // \r\n is more compatible with Excel
  return "﻿" + [headerLine, ...dataLines].join("\r\n");
}

/** Slug-safe filename fragment from arbitrary user-facing string. */
export function slugifyForFilename(str: string): string {
  return str
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
}

/** YYYY-MM-DD in local time. */
export function todayDateStamp(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
