import { CLUSTERS } from "../types";
import type { ClusterKey } from "../types";

interface Props {
  value: ClusterKey;
  onChange: (cluster: ClusterKey) => void;
}

export function ClusterSelector({ value, onChange }: Props) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Output Cluster
      </h2>
      <div className="flex flex-wrap gap-2">
        {CLUSTERS.map((cluster) => (
          <button
            key={cluster.id}
            type="button"
            onClick={() => onChange(cluster.id)}
            className={`px-4 py-1.5 rounded-lg border text-sm font-medium transition-colors cursor-pointer ${
              value === cluster.id
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {cluster.label}
          </button>
        ))}
      </div>
    </section>
  );
}
