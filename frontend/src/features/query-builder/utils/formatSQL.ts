const INDENT = "    ";

/** Split by top-level commas, ignoring commas inside parentheses or quotes. */
function splitTopLevelCommas(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let current = "";

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];

    if (ch === "'" && !inQuote) { inQuote = true; current += ch; continue; }
    if (ch === "'" && inQuote) {
      current += ch;
      if (str[i + 1] === "'") { current += str[++i]; } // '' escape
      else inQuote = false;
      continue;
    }

    if (!inQuote) {
      if (ch === "(") depth++;
      else if (ch === ")") depth--;
      else if (ch === "," && depth === 0) {
        parts.push(current.trim());
        current = "";
        continue;
      }
    }
    current += ch;
  }

  if (current.trim()) parts.push(current.trim());
  return parts;
}

/** Split WHERE body on top-level AND / OR, keeping the keyword with the condition. */
function splitConditions(str: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let i = 0;
  let start = 0;

  while (i < str.length) {
    const ch = str[i];

    if (ch === "'" && !inQuote) { inQuote = true; i++; continue; }
    if (ch === "'" && inQuote) {
      i++;
      if (str[i] === "'") i++; // '' escape
      else inQuote = false;
      continue;
    }

    if (!inQuote) {
      if (ch === "(") { depth++; i++; continue; }
      if (ch === ")") { depth--; i++; continue; }

      if (depth === 0) {
        const rest = str.slice(i).toUpperCase();
        const kwLen = rest.startsWith("AND ") ? 4 : rest.startsWith("OR ") ? 3 : 0;
        if (kwLen > 0) {
          parts.push(str.slice(start, i).trim());
          start = i; // next part starts at "AND"/"OR"
          i += kwLen;
          continue; // skip the i++ below
        }
      }
    }

    i++;
  }

  parts.push(str.slice(start).trim());
  return parts.filter(Boolean);
}

/** Split the FROM-onward portion into clause segments (FROM / JOIN / WHERE). */
function splitClauses(str: string): string[] {
  const segments: string[] = [];
  const re = /\b(FROM|JOIN|WHERE)\b/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(str)) !== null) {
    if (m.index > last) segments.push(str.slice(last, m.index).trim());
    last = m.index;
  }
  segments.push(str.slice(last).trim());
  return segments.filter(Boolean);
}

export function formatSQL(query: string): string {
  // Preserve any leading -- comment line before formatting the SQL
  let prefix = "";
  let sql = query;
  if (query.startsWith("--")) {
    const newlineIdx = query.indexOf("\n");
    if (newlineIdx !== -1) {
      prefix = query.slice(0, newlineIdx + 1);
      sql = query.slice(newlineIdx + 1);
    }
  }

  const fromIdx = sql.search(/\bFROM\b/);
  if (fromIdx === -1) return query;

  // ── SELECT ────────────────────────────────────────────────────────────────
  const rawFields = sql.slice("SELECT ".length, fromIdx).trim();
  const fields = splitTopLevelCommas(rawFields);
  const selectBlock =
    "SELECT\n" + fields.map((f) => `${INDENT}${f}`).join(",\n");

  // ── FROM / JOIN / WHERE ───────────────────────────────────────────────────
  const clauses = splitClauses(sql.slice(fromIdx)).map((seg) => {
    if (seg.startsWith("JOIN")) {
      // JOIN "table" ON "a"."k" = "b"."k"
      return seg.replace(/\bON\b/, `\n${INDENT}ON`);
    }

    if (seg.startsWith("WHERE")) {
      const body = seg.slice("WHERE".length).trim();
      const conditions = splitConditions(body);
      if (conditions.length <= 1) return `WHERE ${body}`;
      return "WHERE\n" + conditions.map((c) => `${INDENT}${c}`).join("\n");
    }

    return seg;
  });

  return prefix + [selectBlock, ...clauses].join("\n");
}
