/**
 * Download an array of records as a CSV file in the browser.
 *
 * - Converts the first record's keys into the CSV header row
 * - Properly escapes commas, double quotes and newlines
 * - Triggers a download via a Blob + temporary anchor element
 *
 * @param filename  The target file name (e.g. "cost-report.csv")
 * @param rows      Array of records to export
 */
export function downloadCSV(
  filename: string,
  rows: Record<string, unknown>[]
): void {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCell = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      headers.map((header) => escapeCell(row[header])).join(',')
    ),
  ].join('\n');

  // Prepend BOM so Excel correctly detects UTF-8
  const blob = new Blob(['\uFEFF' + csvContent], {
    type: 'text/csv;charset=utf-8;',
  });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}
