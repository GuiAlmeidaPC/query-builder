import { useState } from "react";
import { buildQuery } from "../api";
import { isListOp, isNullOp } from "../types";
import type { Dialect, FieldRow, FilterRow, OperatorValue } from "../types";

function parseValue(raw: string, operator: OperatorValue) {
  if (isNullOp(operator)) return undefined;
  if (isListOp(operator)) {
    return raw.split(",").map((v) => v.trim()).filter(Boolean);
  }
  const n = Number(raw);
  return raw !== "" && !isNaN(n) ? n : raw;
}

export function useQueryBuilder() {
  const [dialect, setDialect] = useState<Dialect>("athena");
  const [fields, setFields] = useState<FieldRow[]>([
    { id: crypto.randomUUID(), table: "", column: "" },
  ]);
  const [filters, setFilters] = useState<FilterRow[]>([]);
  const [query, setQuery] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  function validate(): string[] {
    const errs: string[] = [];
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
    try {
      const res = await buildQuery({
        dialect,
        fields: fields.map(({ table, column }) => ({ table, column })),
        filters: filters.map((f) => ({
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
    dialect, setDialect,
    fields, setFields,
    filters, setFilters,
    query,
    errors,
    loading,
    submit,
  };
}
