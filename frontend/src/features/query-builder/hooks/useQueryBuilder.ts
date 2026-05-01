import { useState } from "react";
import { buildQuery } from "../../../services/apiClient";
import type { Dialect, OperatorValue } from "../../../services/types";
import { generateId } from "../../../shared/utils/generateId";
import { getFilterableColumns } from "../metadata/catalog";
import { isListOp, isNullOp } from "../types";
import type { BuilderMode, ClusterKey, FieldRow, FilterRow } from "../types";

function parseValue(raw: string, operator: OperatorValue) {
  if (isNullOp(operator)) return undefined;
  if (isListOp(operator)) {
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
  }
  const n = Number(raw);
  return raw !== "" && !isNaN(n) ? n : raw;
}

export function useQueryBuilder() {
  const [mode, setMode] = useState<BuilderMode>("catalog");
  const [dialect, setDialect] = useState<Dialect>("athena");
  const [fields, setFields] = useState<FieldRow[]>([
    { id: generateId(), table: "", column: "" },
  ]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<ClusterKey>("cluster_01");
  const [clusterFilters, setClusterFilters] = useState<Record<ClusterKey, FilterRow[]>>({
    cluster_01: [],
    cluster_02: [],
    cluster_03: [],
    cluster_04: [],
    cluster_05: [],
    cluster_06: [],
  });
  const [query, setQuery] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function setActiveClusterFilters(rows: FilterRow[]) {
    setClusterFilters((prev) => ({ ...prev, [selectedCluster]: rows }));
  }

  const activeFilters = mode === "catalog" ? clusterFilters[selectedCluster] : filters;

  function validate(): string[] {
    const errs: string[] = [];
    if (mode === "catalog") {
      if (activeFilters.length === 0) {
        errs.push("Add at least one filter.");
      }
      for (const f of activeFilters) {
        if (!f.table.trim()) errs.push("A filter is missing a table selection.");
        if (!f.column.trim()) errs.push("A filter is missing a column selection.");
        if (f.table.trim() && f.column.trim()) {
          const isKnownFilter = getFilterableColumns(f.table).some((column) => column.name === f.column);
          if (!isKnownFilter) errs.push(`"${f.table}.${f.column}" is not available in the catalog.`);
        }
        if (!isNullOp(f.operator as OperatorValue) && !f.value.trim()) {
          errs.push(`Filter on "${f.table}.${f.column}" is missing a value.`);
        }
      }
      return [...new Set(errs)];
    }

    if (fields.every((f) => !f.table.trim() || !f.column.trim())) {
      errs.push("Every field must have a table and column.");
    }
    for (const f of fields) {
      if (!f.table.trim()) errs.push(`A field is missing a table name.`);
      if (!f.column.trim()) errs.push(`A field is missing a column name.`);
    }
    for (const f of filters) {
      if (!f.table.trim()) errs.push("A filter is missing a table name.");
      if (!f.column.trim()) errs.push("A filter is missing a column name.");
      if (!isNullOp(f.operator as OperatorValue) && !f.value.trim()) {
        errs.push(`Filter on "${f.table}.${f.column}" is missing a value.`);
      }
    }
    return [...new Set(errs)];
  }

  async function submit() {
    const errs = validate();
    if (errs.length) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    setLoading(true);
    const requestFields = mode === "catalog"
      ? [{ table: activeFilters[0].table, column: "customer_id" }]
      : fields.map(({ table, column }) => ({ table, column }));

    try {
      const res = await buildQuery({
        dialect,
        fields: requestFields,
        filters: activeFilters.map((f) => ({
          table: f.table,
          column: f.column,
          operator: f.operator,
          value: parseValue(f.value, f.operator as OperatorValue),
        })),
      });
      setQuery(res.query);
    } catch (err: unknown) {
      if (err && typeof err === "object" && "detail" in err) {
        const detail = (err as { detail: { msg: string }[] }).detail;
        if (Array.isArray(detail)) {
          setErrors(detail.map((d) => d.msg));
          return;
        }
      }
      setErrors(["Something went wrong. Is the backend running?"]);
    } finally {
      setLoading(false);
    }
  }

  return {
    mode, setMode,
    dialect, setDialect,
    fields, setFields,
    filters, setFilters,
    selectedCluster, setSelectedCluster,
    clusterFilters,
    activeFilters, setActiveClusterFilters,
    query,
    errors,
    loading,
    submit,
  };
}
