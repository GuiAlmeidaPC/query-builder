import { useState } from "react";
import { buildQuery } from "../../../services/apiClient";
import type { Dialect, OperatorValue } from "../../../services/types";
import { generateId } from "../../../shared/utils/generateId";
import { useLocalStorage } from "../../../shared/hooks/useLocalStorage";
import { getFilterableColumns } from "../metadata/catalog";
import { isListOp, isNullOp } from "../types";
import type { BuilderMode, ClusterKey, FieldRow, FilterBlock, FilterRow } from "../types";
import { CLUSTERS } from "../types";

function emptyBlock(): FilterBlock {
  return { id: generateId(), connector: "AND", filters: [] };
}

const defaultClusterBlocks: Record<ClusterKey, FilterBlock[]> = {
  cluster_01: [emptyBlock()],
  cluster_02: [emptyBlock()],
  cluster_03: [emptyBlock()],
  cluster_04: [emptyBlock()],
  cluster_05: [emptyBlock()],
  cluster_06: [emptyBlock()],
};

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
  const [manualBlocks, setManualBlocks] = useState<FilterBlock[]>([emptyBlock()]);
  const [selectedCluster, setSelectedCluster] = useLocalStorage<ClusterKey>("qb:selectedCluster", "cluster_01");
  const [clusterBlocks, setClusterBlocks] = useLocalStorage<Record<ClusterKey, FilterBlock[]>>(
    "qb:clusterFilters:v2",
    defaultClusterBlocks,
  );
  const [query, setQuery] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const activeBlocks: FilterBlock[] =
    mode === "catalog"
      ? (clusterBlocks[selectedCluster] ?? [emptyBlock()])
      : manualBlocks;

  function setActiveBlocks(blocks: FilterBlock[]) {
    if (mode === "catalog") {
      setClusterBlocks({ ...defaultClusterBlocks, ...clusterBlocks, [selectedCluster]: blocks });
    } else {
      setManualBlocks(blocks);
    }
  }

  function allFilterRows(): FilterRow[] {
    return activeBlocks.flatMap((b) => b.filters);
  }

  function validate(): string[] {
    const errs: string[] = [];
    const allFilters = allFilterRows();

    if (mode === "catalog") {
      if (allFilters.length === 0) {
        errs.push("Add at least one filter.");
      }
      for (const f of allFilters) {
        if (!f.table.trim()) errs.push("A filter is missing a table selection.");
        if (!f.column.trim()) errs.push("A filter is missing a column selection.");
        if (f.table.trim() && f.column.trim()) {
          const isKnownFilter = getFilterableColumns(f.table).some((col) => col.name === f.column);
          if (!isKnownFilter) errs.push(`"${f.table}.${f.column}" is not available in the catalog.`);
        }
        if (!isNullOp(f.operator) && !f.value.trim()) {
          errs.push(`Filter on "${f.table}.${f.column}" is missing a value.`);
        }
      }
      return [...new Set(errs)];
    }

    if (fields.every((f) => !f.table.trim() || !f.column.trim())) {
      errs.push("Every field must have a table and column.");
    }
    for (const f of fields) {
      if (!f.table.trim()) errs.push("A field is missing a table name.");
      if (!f.column.trim()) errs.push("A field is missing a column name.");
    }
    for (const f of allFilters) {
      if (!f.table.trim()) errs.push("A filter is missing a table name.");
      if (!f.column.trim()) errs.push("A filter is missing a column name.");
      if (!isNullOp(f.operator) && !f.value.trim()) {
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

    const allFilters = allFilterRows();
    const firstFilter = allFilters[0];
    const requestFields = mode === "catalog"
      ? [{ table: firstFilter.table, column: "customer_id" }]
      : fields.map(({ table, column }) => ({ table, column }));

    const filterGroups = activeBlocks
      .filter((b) => b.filters.length > 0)
      .map((b) => ({
        connector: b.connector,
        filters: b.filters.map((f) => ({
          table: f.table,
          column: f.column,
          operator: f.operator,
          value: parseValue(f.value, f.operator),
          connector: f.connector,
        })),
      }));

    try {
      const res = await buildQuery({
        dialect,
        fields: requestFields,
        filter_groups: filterGroups,
      });
      const clusterLabel = CLUSTERS.find((c) => c.id === selectedCluster)?.label ?? selectedCluster;
      const prefix = mode === "catalog" ? `-- Query for ${clusterLabel}\n` : "";
      setQuery(prefix + res.query);
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
    selectedCluster, setSelectedCluster,
    activeBlocks, setActiveBlocks,
    query,
    errors,
    loading,
    submit,
  };
}

