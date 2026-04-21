import { Plus, Trash2 } from "lucide-react";
import { OPERATORS, isListOp, isNullOp } from "../types";
import type { FilterRow, OperatorValue } from "../types";

interface Props {
  filters: FilterRow[];
  onChange: (filters: FilterRow[]) => void;
}

export function FilterList({ filters, onChange }: Props) {
  function update(id: string, key: keyof FilterRow, val: string) {
    onChange(
      filters.map((f) => {
        if (f.id !== id) return f;
        const updated = { ...f, [key]: val };
        // clear value when switching to a null operator
        if (key === "operator" && isNullOp(val as OperatorValue)) {
          updated.value = "";
        }
        return updated;
      })
    );
  }

  function add() {
    onChange([
      ...filters,
      {
        id: crypto.randomUUID(),
        table: "",
        column: "",
        operator: "eq",
        value: "",
      },
    ]);
  }

  function remove(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Filters
        </h2>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer"
        >
          <Plus size={15} />
          Add filter
        </button>
      </div>

      {filters.length === 0 && (
        <p className="text-sm text-gray-400 italic">No filters — query will return all rows.</p>
      )}

      <div className="flex flex-col gap-2">
        {filters.map((f) => (
          <div key={f.id} className="flex gap-2 items-center flex-wrap">
            <input
              placeholder="table"
              value={f.table}
              onChange={(e) => update(f.id, "table", e.target.value)}
              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <span className="text-gray-400 text-sm">.</span>
            <input
              placeholder="column"
              value={f.column}
              onChange={(e) => update(f.id, "column", e.target.value)}
              className="w-28 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <select
              value={f.operator}
              onChange={(e) => update(f.id, "operator", e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer"
            >
              {OPERATORS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>

            {!isNullOp(f.operator as OperatorValue) && (
              <input
                placeholder={
                  isListOp(f.operator as OperatorValue)
                    ? "val1, val2, ..."
                    : "value"
                }
                value={f.value}
                onChange={(e) => update(f.id, "value", e.target.value)}
                className="flex-1 min-w-24 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            )}

            <button
              type="button"
              onClick={() => remove(f.id)}
              className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
