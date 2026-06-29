# Feature 007 — Exports

## WHAT

Migrate Java PdfExportService (PDFBox) and ExcelExportService (Apache POI) to
Deno using `npm:pdfkit` and `npm:exceljs`:

- `exportGroceryList(list, items)` → PDF bytes
- `exportMasterListDetailToPdf(detail)` → PDF bytes
- `exportMasterListToExcel(summary, details)` → XLSX bytes Functions return
  `Uint8Array` (in-memory) instead of writing to a path, so the HTTP handler can
  stream them. Java wrote to `filePath` via JFileChooser — the Deno API/UI will
  offer the bytes for download.

## Acceptance Criteria

1. `deno task test` passes tests generating PDF/XLSX bytes from a fixture DTO
   and asserting non-empty output with correct magic bytes (PDF: `%PDF`, XLSX:
   `PK`).
2. PDF contains the list name and total; XLSX "Resumen" sheet contains the month
   rows.

## Out of Scope

HTTP delivery (Feature 008), UI download buttons (Feature 009).
