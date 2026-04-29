import tablesJson from "./tables.json";

export interface ColumnMetadata {
  name: string;
  label: string;
  type: "boolean" | "date" | "datetime" | "number" | "string";
  filterable: boolean;
}

export interface TableMetadata {
  name: string;
  label: string;
  description: string;
  category: string;
  columns: ColumnMetadata[];
}

export const TABLE_CATALOG = tablesJson as TableMetadata[];

export function getFilterableColumns(tableName: string) {
  return TABLE_CATALOG.find((table) => table.name === tableName)?.columns.filter((column) => column.filterable) ?? [];
}
