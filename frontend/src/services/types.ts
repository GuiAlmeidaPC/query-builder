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

export type ConnectorValue = "AND" | "OR";

export interface ApiFilterGroup {
  connector: ConnectorValue;
  filters: {
    table: string;
    column: string;
    operator: string;
    value?: string | number | boolean | string[];
    connector: ConnectorValue;
  }[];
}

export interface QueryRequest {
  dialect: Dialect;
  fields: { table: string; column: string }[];
  filter_groups: ApiFilterGroup[];
}

export interface QueryResponse {
  query: string;
}

export interface ApiError {
  detail: { loc: (string | number)[]; msg: string; type: string }[];
}
