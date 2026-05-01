import { Database } from "lucide-react";
import { QueryBuilder } from "./features/query-builder";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-blue-900 text-white p-2 rounded-xl">
            <Database size={22} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 leading-none">Query Builder</h1>
            <p className="text-sm text-gray-400 mt-0.5">Build SQL queries for Athena or SQLite</p>
          </div>
        </div>

        <QueryBuilder />
      </div>
    </div>
  );
}
