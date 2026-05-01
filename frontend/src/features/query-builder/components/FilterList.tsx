import { Plus, Trash2 } from "lucide-react";
import { generateId } from "../../../shared/utils/generateId";
import { OPERATORS } from "../../../services/types";
import type { ConnectorValue, OperatorValue } from "../../../services/types";
import type { TableMetadata } from "../metadata/catalog";
import { isListOp, isNullOp } from "../types";
import type { BuilderMode, FilterBlock, FilterRow } from "../types";

interface Props {
  blocks: FilterBlock[];
  onChange: (blocks: FilterBlock[]) => void;
  mode?: BuilderMode;
  tables?: TableMetadata[];
}

const IDENTIFIER_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const MAX_LEN = 128;

function isValidIdentifier(val: string) {
  return val === "" || (val.length <= MAX_LEN && IDENTIFIER_RE.test(val));
}

function ConnectorToggle({
  value,
  onChange,
}: {
  value: ConnectorValue;
  onChange: (v: ConnectorValue) => void;
}) {
  return (
    <div className="flex items-center gap-1 self-center">
      {(["AND", "OR"] as ConnectorValue[]).map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`px-2 py-0.5 rounded text-xs font-semibold transition-colors cursor-pointer ${
            value === opt
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

export function FilterList({ blocks, onChange, mode = "manual", tables = [] }: Props) {
  const isCatalog = mode === "catalog";
  const totalFilters = blocks.reduce((n, b) => n + b.filters.length, 0);

  function filterableColumns(tableName: string) {
    return tables.find((t) => t.name === tableName)?.columns.filter((c) => c.filterable) ?? [];
  }

  // ── Block-level helpers ────────────────────────────────────────────────────

  function addBlock() {
    onChange([...blocks, { id: generateId(), connector: "AND", filters: [] }]);
  }

  function removeBlock(blockId: string) {
    onChange(blocks.filter((b) => b.id !== blockId));
  }

  function updateBlockConnector(blockId: string, connector: ConnectorValue) {
    onChange(blocks.map((b) => (b.id === blockId ? { ...b, connector } : b)));
  }

  // ── Filter-row helpers ─────────────────────────────────────────────────────

  function addFilter(blockId: string) {
    if (totalFilters >= 50) return;
    const newRow: FilterRow = {
      id: generateId(),
      table: "",
      column: "",
      operator: "eq",
      value: "",
      connector: "AND",
    };
    onChange(blocks.map((b) => (b.id === blockId ? { ...b, filters: [...b.filters, newRow] } : b)));
  }

  function removeFilter(blockId: string, filterId: string) {
    onChange(
      blocks.map((b) =>
        b.id === blockId ? { ...b, filters: b.filters.filter((f) => f.id !== filterId) } : b
      )
    );
  }

  function updateFilter(blockId: string, filterId: string, key: keyof FilterRow, val: string) {
    if (!isCatalog && (key === "table" || key === "column") && !isValidIdentifier(val)) return;
    onChange(
      blocks.map((b) => {
        if (b.id !== blockId) return b;
        return {
          ...b,
          filters: b.filters.map((f) => {
            if (f.id !== filterId) return f;
            const updated = { ...f, [key]: val };
            if (isCatalog && key === "table") {
              const cols = filterableColumns(val);
              updated.column = cols.some((c) => c.name === f.column) ? f.column : "";
            }
            if (key === "operator" && isNullOp(val as OperatorValue)) {
              updated.value = "";
            }
            return updated;
          }),
        };
      })
    );
  }

  const multiBlock = blocks.length > 1;

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Filters</h2>
        <button
          type="button"
          onClick={addBlock}
          className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={totalFilters >= 50}
        >
          <Plus size={15} />
          Add group
        </button>
      </div>

      {blocks.length === 0 && (
        <p className="text-sm text-gray-400 italic">
          {isCatalog ? "Add at least one filter." : "No filters — query will return all rows."}
        </p>
      )}

      <div className="flex flex-col gap-4">
        {blocks.map((block, blockIdx) => (
          <div key={block.id}>
            {/* Between-block connector */}
            {blockIdx > 0 && (
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 border-t border-dashed border-gray-200" />
                <ConnectorToggle
                  value={block.connector}
                  onChange={(v) => updateBlockConnector(block.id, v)}
                />
                <div className="flex-1 border-t border-dashed border-gray-200" />
              </div>
            )}

            {/* Block card */}
            <div className={`flex flex-col gap-2 rounded-xl p-3 ${multiBlock ? "border border-gray-200 bg-gray-50" : ""}`}>
              {/* Block header */}
              {multiBlock && (
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                    Group {blockIdx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeBlock(block.id)}
                    className="text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {block.filters.length === 0 && (
                <p className="text-sm text-gray-400 italic">No filters in this group.</p>
              )}

              {block.filters.map((f, filterIdx) => (
                <div key={f.id}>
                  {/* Within-block connector */}
                  {filterIdx > 0 && (
                    <div className="flex items-center mb-2">
                      <ConnectorToggle
                        value={f.connector}
                        onChange={(v) => updateFilter(block.id, f.id, "connector", v)}
                      />
                    </div>
                  )}

                  <div className="flex gap-2 items-start">
                    <div className="flex-1 min-w-0 flex flex-col gap-2 bg-white border border-gray-200 rounded-lg p-2 sm:flex-row sm:items-center sm:bg-transparent sm:border-0 sm:rounded-none sm:p-0">
                      <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                        {isCatalog ? (
                          <select
                            value={f.table}
                            onChange={(e) => updateFilter(block.id, f.id, "table", e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer"
                          >
                            <option value="">Table</option>
                            {tables.map((t) => (
                              <option key={t.name} value={t.name}>{t.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            placeholder="table"
                            value={f.table}
                            maxLength={MAX_LEN}
                            onChange={(e) => updateFilter(block.id, f.id, "table", e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        )}
                        <span className="text-gray-400 text-sm">.</span>
                        {isCatalog ? (
                          <select
                            value={f.column}
                            onChange={(e) => updateFilter(block.id, f.id, "column", e.target.value)}
                            disabled={!f.table}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 cursor-pointer disabled:cursor-not-allowed disabled:bg-gray-100"
                          >
                            <option value="">Column</option>
                            {filterableColumns(f.table).map((c) => (
                              <option key={c.name} value={c.name}>{c.label}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            placeholder="column"
                            value={f.column}
                            maxLength={MAX_LEN}
                            onChange={(e) => updateFilter(block.id, f.id, "column", e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        )}
                      </div>

                      <div className="flex items-center gap-2 sm:flex-1 sm:min-w-0">
                        <select
                          value={f.operator}
                          onChange={(e) => updateFilter(block.id, f.id, "operator", e.target.value)}
                          className="rounded-lg border border-gray-200 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white cursor-pointer"
                        >
                          {OPERATORS.map((op) => (
                            <option key={op.value} value={op.value}>{op.label}</option>
                          ))}
                        </select>

                        {!isNullOp(f.operator) && (
                          <input
                            placeholder={isListOp(f.operator) ? "val1, val2, ..." : "value"}
                            value={f.value}
                            onChange={(e) => updateFilter(block.id, f.id, "value", e.target.value)}
                            className="flex-1 min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
                          />
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFilter(block.id, f.id)}
                      className="mt-2 sm:mt-0 text-gray-300 hover:text-red-400 transition-colors cursor-pointer"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Add filter inside block */}
              <button
                type="button"
                onClick={() => addFilter(block.id)}
                disabled={totalFilters >= 50}
                className="flex items-center gap-1.5 text-sm text-violet-600 hover:text-violet-700 font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1 self-start"
              >
                <Plus size={15} />
                Add filter
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
