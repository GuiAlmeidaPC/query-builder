import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatSQL } from "../utils/formatSQL";

interface Props {
  query: string;
}

type TokenType = "keyword" | "string" | "number" | "identifier" | "comment" | "text";

interface Token {
  type: TokenType;
  value: string;
}

const KEYWORDS = new Set([
  "SELECT", "FROM", "JOIN", "ON", "WHERE",
  "AND", "OR", "NOT", "IN", "LIKE", "IS", "NULL",
]);

function tokenize(query: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < query.length) {
    // Single-line comment
    if (query[i] === "-" && query[i + 1] === "-") {
      let j = i;
      while (j < query.length && query[j] !== "\n") j++;
      tokens.push({ type: "comment", value: query.slice(i, j) });
      i = j;
      continue;
    }

    // Single-quoted string literal (handles '' escapes)
    if (query[i] === "'") {
      let j = i + 1;
      while (j < query.length) {
        if (query[j] === "'" && query[j + 1] === "'") { j += 2; continue; }
        if (query[j] === "'") break;
        j++;
      }
      tokens.push({ type: "string", value: query.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Double-quoted identifier
    if (query[i] === '"') {
      let j = i + 1;
      while (j < query.length && query[j] !== '"') j++;
      tokens.push({ type: "identifier", value: query.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Number
    if (/\d/.test(query[i])) {
      let j = i;
      while (j < query.length && /[\d.]/.test(query[j])) j++;
      tokens.push({ type: "number", value: query.slice(i, j) });
      i = j;
      continue;
    }

    // Word — keyword or plain text
    if (/[A-Za-z_]/.test(query[i])) {
      let j = i;
      while (j < query.length && /[A-Za-z_]/.test(query[j])) j++;
      const word = query.slice(i, j);
      tokens.push({ type: KEYWORDS.has(word) ? "keyword" : "text", value: word });
      i = j;
      continue;
    }

    // Any other character — merge with previous text token if possible
    const last = tokens[tokens.length - 1];
    if (last?.type === "text") {
      last.value += query[i];
    } else {
      tokens.push({ type: "text", value: query[i] });
    }
    i++;
  }

  return tokens;
}

const COLOR: Record<TokenType, string> = {
  keyword:    "text-blue-900 font-semibold",
  string:     "text-emerald-600",
  number:     "text-amber-600",
  identifier: "text-sky-600",
  comment:    "text-gray-400 italic",
  text:       "",
};

export function QueryOutput({ query }: Props) {
  const [copied, setCopied] = useState(false);
  const formatted = formatSQL(query);

  function copy() {
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const tokens = tokenize(formatted);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Generated Query
        </h2>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
        >
          {copied ? (
            <>
              <Check size={15} className="text-emerald-500" />
              <span className="text-emerald-500">Copied</span>
            </>
          ) : (
            <>
              <Copy size={15} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm font-mono whitespace-pre-wrap break-all leading-relaxed">
        {tokens.map((token, i) => (
          <span key={i} className={COLOR[token.type]}>
            {token.value}
          </span>
        ))}
      </pre>
    </section>
  );
}
