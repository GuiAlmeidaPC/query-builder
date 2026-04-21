export type Dialect = "athena" | "sqlite";

export const OPERATORS = [
  { value: "eq", label: "= equals" },
  { value: "neq", label: "≠ not equals" },
  { value: "gt", label: "> greater than" },
  { value: "gte", label: "≥ greater or equal" },
  { value: "lt", label: "< less than" },
  { value: "lte", label: "≤ less or equal" },
  { value: "like", label: "LIKE" },
  { value: "not_like", label: "NOT LIKE" },
  { value: "in", label: "IN" },
  { value: "not_in", label: "NOT IN" },
  { value: "is_null", label: "IS NULL" },
  { value: "is_not_null", label: "IS NOT NULL" },
] as const;

export type OperatorValue = (typeof OPERATORS)[number]["value"];

const NULL_OPS: OperatorValue[] = ["is_null", "is_not_null"];
const LIST_OPS: OperatorValue[] = ["in", "not_in"];

export function isNullOp(op: OperatorValue) {
  return NULL_OPS.includes(op);
}
export function isListOp(op: OperatorValue) {
  return LIST_OPS.includes(op);
}

export interface FieldRow {
  id: string;
  table: string;
  column: string;
}

export interface FilterRow {
  id: string;
  table: string;
  column: string;
  operator: OperatorValue;
  value: string; // raw input; parsed before sending
}

export interface QueryRequest {
  dialect: Dialect;
  fields: { table: string; column: string }[];
  filters: {
    table: string;
    column: string;
    operator: string;
    value?: string | number | boolean | string[];
  }[];
}

export interface QueryResponse {
  query: string;
}

export interface ApiError {
  detail: { loc: (string | number)[]; msg: string; type: string }[];
}
