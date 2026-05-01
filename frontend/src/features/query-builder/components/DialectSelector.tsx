import type { Dialect } from "../../../services/types";

interface Props {
  value: Dialect;
  onChange: (d: Dialect) => void;
}

export function DialectSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Dialect</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
        {(["athena", "sqlite"] as Dialect[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => onChange(d)}
            className={`px-4 py-1.5 transition-colors cursor-pointer ${
              value === d
                ? "bg-blue-900 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {d === "athena" ? "Athena" : "SQLite"}
          </button>
        ))}
      </div>
    </div>
  );
}
