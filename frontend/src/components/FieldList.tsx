import { Plus, Trash2 } from "lucide-react";
import { generateId } from "../utils/generateId";
import type { FieldRow } from "../types";

interface Props {
  fields: FieldRow[];
  onChange: (fields: FieldRow[]) => void;
}

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_LEN = 128;

function isValidIdentifier(val: string) {
  return val === "" || (val.length <= MAX_LEN && IDENTIFIER_RE.test(val));
}

export function FieldList({ fields, onChange }: Props) {
  function update(id: string, key: keyof FieldRow, val: string) {
    if ((key === "table" || key === "column") && !isValidIdentifier(val)) return;
    onChange(fields.map((f) => (f.id === id ? { ...f, [key]: val } : f)));
  }

  function add() {
    if (fields.length >= 50) return;
    onChange([...fields, { id: generateId(), table: "", column: "" }]);
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
          disabled={fields.length >= 50}
          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus size={15} />
          Add field
        </button>
      </div>

      {fields.length === 0 && (
        <p className="text-sm text-gray-400 italic">No fields yet — add at least one.</p>
      )}

      <div className="flex flex-col gap-2">
        {fields.map((f) => (
          <div key={f.id} className="flex gap-2 items-start">
            <div className="flex flex-1 flex-col sm:flex-row sm:items-center gap-2 min-w-0 sm:bg-transparent sm:border-0 sm:rounded-none sm:p-0 bg-gray-50 border border-gray-200 rounded-lg p-2">
              <input
                placeholder="table"
                value={f.table}
                maxLength={MAX_LEN}
                onChange={(e) => update(f.id, "table", e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
              <span className="hidden sm:inline text-gray-400 text-sm">.</span>
              <input
                placeholder="column"
                value={f.column}
                maxLength={MAX_LEN}
                onChange={(e) => update(f.id, "column", e.target.value)}
                className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(f.id)}
              disabled={fields.length === 1}
              className="mt-2 sm:mt-0 text-gray-300 hover:text-red-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 mt-2">
        Names must start with a letter or underscore, contain only letters, digits, or underscores, and be at most 128 characters. Max 50 fields.
      </p>
    </section>
  );
}
