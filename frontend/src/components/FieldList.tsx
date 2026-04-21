import { Plus, Trash2 } from "lucide-react";
import type { FieldRow } from "../types";

interface Props {
  fields: FieldRow[];
  onChange: (fields: FieldRow[]) => void;
}

export function FieldList({ fields, onChange }: Props) {
  function update(id: string, key: keyof FieldRow, val: string) {
    onChange(fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  }

  function add() {
    onChange([
      ...fields,
      { id: crypto.randomUUID(), table: "", column: "" },
    ]);
  }

  function remove(id: string) {
    onChange(fields.filter((f) => f.id !== id));
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Fields
        </h2>
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer"
        >
          <Plus size={15} />
          Add field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          No fields yet — add at least one.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <div key={f.id} className="flex gap-2 items-center">
            <input
              placeholder="table"
              value={f.table}
              onChange={(e) => update(f.id, "table", e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <span className="text-gray-400 text-sm">.</span>
            <input
              placeholder="column"
              value={f.column}
              onChange={(e) => update(f.id, "column", e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
            />
            <button
              type="button"
              onClick={() => remove(f.id)}
              disabled={fields.length === 1}
              className="text-gray-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
