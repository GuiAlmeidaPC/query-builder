import { Database } from "lucide-react";
import { DialectSelector } from "./components/DialectSelector";
import { FieldList } from "./components/FieldList";
import { FilterList } from "./components/FilterList";
import { QueryOutput } from "./components/QueryOutput";
import { useQueryBuilder } from "./hooks/useQueryBuilder";

export default function App() {
  const {
    dialect, setDialect,
    fields, setFields,
    filters, setFilters,
    query,
    errors,
    loading,
    submit,
  } = useQueryBuilder();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-violet-600 text-white p-2 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Query Builder</h1>
            <p className="text-sm text-gray-400 mt-0.5">Build SQL queries for Athena or SQLite</p>
          </div>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col gap-6">

          <DialectSelector value={dialect} onChange={setDialect} />

          <hr className="border-gray-100" />

          <FieldList fields={fields} onChange={setFields} />

          <hr className="border-gray-100" />

          <FilterList filters={filters} onChange={setFilters} />

          {errors.length > 0 && (
            <ul className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex flex-col gap-1">
              {errors.map((e, i) => (
                <li key={i} className="text-sm text-red-600">
                  {e}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm transition-colors cursor-pointer"
          >
            {loading ? "Building…" : "Build Query"}
          </button>
        </div>

        {query && (
          <div className="mt-6 bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <QueryOutput query={query} />
          </div>
        )}
      </div>
    </div>
  );
}
