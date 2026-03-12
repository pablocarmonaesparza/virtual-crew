export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  headers?: string[]
): void {
  if (data.length === 0) return;

  const keys = headers || Object.keys(data[0]);
  const csvRows: string[] = [];

  csvRows.push(keys.join(","));

  for (const row of data) {
    const values = keys.map((key) => {
      const val = row[key];
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    csvRows.push(values.join(","));
  }

  const csvString = csvRows.join("\n");
  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}
