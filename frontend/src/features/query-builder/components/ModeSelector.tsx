import type { BuilderMode } from "../types";

interface Props {
  value: BuilderMode;
  onChange: (mode: BuilderMode) => void;
}

const MODES: { value: BuilderMode; label: string }[] = [
  { value: "catalog", label: "Catalog" },
  { value: "manual", label: "Manual" },
];

export function ModeSelector({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-gray-600">Mode</span>
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
        {MODES.map((mode) => (
          <button
            key={mode.value}
            type="button"
            onClick={() => onChange(mode.value)}
            className={`px-4 py-1.5 transition-colors cursor-pointer ${
              value === mode.value
                ? "bg-violet-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {mode.label}
          </button>
        ))}
      </div>
    </div>
  );
}
