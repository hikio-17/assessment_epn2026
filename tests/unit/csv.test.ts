import { describe, expect, it } from "vitest";

import { escapeCsvCell, toCsv } from "~/lib/csv";

describe("csv", () => {
  it("escapes commas, quotes, and newlines", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
    expect(escapeCsvCell('a"b')).toBe('"a""b"');
    expect(escapeCsvCell("a\nb")).toBe('"a\nb"');
  });

  it("writes BOM and CRLF rows", () => {
    const csv = toCsv([
      ["Name", "Total"],
      ["Angga", 2],
    ]);

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Name,Total\r\n");
    expect(csv).toContain("Angga,2\r\n");
  });
});
