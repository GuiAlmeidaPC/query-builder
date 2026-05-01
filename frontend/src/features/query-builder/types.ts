import type { OperatorValue } from "../../services/types";

export type BuilderMode = "catalog" | "manual";

export type ClusterKey =
  | "cluster_01"
  | "cluster_02"
  | "cluster_03"
  | "cluster_04"
  | "cluster_05"
  | "cluster_06";

export const CLUSTERS: { id: ClusterKey; label: string }[] = [
  { id: "cluster_01", label: "Cluster 01" },
  { id: "cluster_02", label: "Cluster 02" },
  { id: "cluster_03", label: "Cluster 03" },
  { id: "cluster_04", label: "Cluster 04" },
  { id: "cluster_05", label: "Cluster 05" },
  { id: "cluster_06", label: "Cluster 06" },
];

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
