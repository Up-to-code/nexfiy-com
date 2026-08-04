export type CsvProperty = {
  id: string;
  name: string;
  type: string;
  order: number;
};

export type CsvOption = {
  id: string;
  propertyId: string;
  name: string;
};

export type CsvRelationDocument = {
  title: string;
};

export type CsvValue = {
  propertyId: string;
  type: string;
  textValue?: string;
  numberValue?: number;
  booleanValue?: boolean;
  dateStart?: number;
  dateEnd?: number;
  optionIds?: string[];
  relationDocuments?: CsvRelationDocument[];
};

export type CsvRow = {
  title: string;
  values: CsvValue[];
};

export type CsvDatabase = {
  dataSource: { name: string };
  properties: CsvProperty[];
  options: CsvOption[];
  rows: CsvRow[];
};

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

function formatDate(timestamp?: number) {
  if (timestamp === undefined) return "";
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

function valueToCsvCell(database: CsvDatabase, row: CsvRow, property: CsvProperty) {
  if (property.type === "title") return row.title;

  const value = row.values.find((item) => item.propertyId === property.id);
  if (!value) return "";

  switch (value.type) {
    case "text":
    case "url":
      return value.textValue ?? "";
    case "number":
      return value.numberValue === undefined ? "" : String(value.numberValue);
    case "checkbox":
      return value.booleanValue ? "true" : "false";
    case "date": {
      if (value.dateStart === undefined && value.dateEnd === undefined) return "";
      const parts: string[] = [];
      if (value.dateStart !== undefined) parts.push(formatDate(value.dateStart));
      if (value.dateEnd !== undefined) parts.push(formatDate(value.dateEnd));
      return parts.join(" -> ");
    }
    case "select":
    case "status":
    case "multi_select": {
      const options = database.options.filter(
        (option) => option.propertyId === property.id,
      );
      const names = (value.optionIds ?? [])
        .map((optionId) => options.find((option) => option.id === optionId)?.name)
        .filter((name): name is string => Boolean(name));
      return names.join("; ");
    }
    case "relation":
      return (value.relationDocuments ?? [])
        .map((document) => document.title)
        .join("; ");
    case "rollup":
    case "formula":
      if (value.numberValue !== undefined) return String(value.numberValue);
      if (value.booleanValue !== undefined)
        return value.booleanValue ? "true" : "false";
      return value.textValue ?? "";
    default:
      return value.textValue ?? "";
  }
}

export function exportDatabaseToCsv(database: CsvDatabase) {
  const properties = [...database.properties].sort((a, b) => a.order - b.order);
  const header = properties
    .map((property) => escapeCsvCell(property.name))
    .join(",");
  const rows = database.rows.map((row) =>
    properties
      .map((property) => escapeCsvCell(valueToCsvCell(database, row, property)))
      .join(","),
  );
  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
