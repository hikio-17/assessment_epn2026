export function escapeCsvCell(
  value: string | number,
): string {
  const text = String(value);

  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

export function toCsv(
  rows: Array<Array<string | number>>,
): string {
  return `\uFEFF${rows
    .map((row) => row.map(escapeCsvCell).join(","))
    .join("\r\n")}\r\n`;
}