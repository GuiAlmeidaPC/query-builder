import type { OperatorValue } from "../../services/types";

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
  value: string;
}
