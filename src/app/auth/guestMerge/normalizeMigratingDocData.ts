type FirestoreDocData = Record<string, unknown>;

export function toIsoStringMaybe(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const t = new Date(value);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  }
  if (value instanceof Date) return value.toISOString();

  const asAny = value as any;
  if (asAny && typeof asAny.toDate === "function") {
    try {
      const d = asAny.toDate();
      return d instanceof Date ? d.toISOString() : null;
    } catch {
      return null;
    }
  }
  if (typeof asAny?.seconds === "number") {
    const ms = asAny.seconds * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // heuristics: milliseconds epoch (>= 10^12) else seconds.
    const ms = value >= 1_000_000_000_000 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  return null;
}

export function normalizeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function normalizeStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const filtered = value.filter(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  return filtered.length > 0 ? filtered : undefined;
}

export function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function normalizeMigratingDocData(
  subcollection: "tags" | "books" | "records",
  data: FirestoreDocData,
  id: string,
): FirestoreDocData {
  const nowIso = new Date().toISOString();

  if (subcollection === "tags") {
    const createdAt =
      toIsoStringMaybe((data as any).createdAt) ||
      toIsoStringMaybe((data as any).created_at) ||
      nowIso;
    const text = normalizeString((data as any).text, "").trim();
    const description = normalizeString((data as any).description, "");
    return {
      ...data,
      text,
      description,
      createdAt,
    };
  }

  if (subcollection === "books") {
    const createdAt =
      toIsoStringMaybe((data as any).createdAt) ||
      toIsoStringMaybe((data as any).created_at) ||
      nowIso;
    const title = normalizeString((data as any).title, "");
    const author = normalizeString((data as any).author, "");

    const rawMemos = Array.isArray((data as any).memos)
      ? (data as any).memos
      : [];
    const memos = rawMemos
      .map((m: any, idx: number) => {
        if (!m || typeof m !== "object") return null;
        const memoId = normalizeString(m.id, String(idx));
        const text = normalizeString(m.text, "");
        const createdAt =
          toIsoStringMaybe(m.createdAt) ||
          toIsoStringMaybe(m.created_at) ||
          nowIso;
        return { id: memoId, text, createdAt };
      })
      .filter(Boolean);

    return {
      ...data,
      title,
      ...(author ? { author } : {}),
      memos,
      createdAt,
    };
  }

  // records
  const createdAt =
    toIsoStringMaybe((data as any).createdAt) ||
    toIsoStringMaybe((data as any).created_at) ||
    nowIso;

  const memo = normalizeString((data as any).memo, "");
  const bookIdRaw =
    (data as any).bookId ?? (data as any).book_id ?? (data as any).bookID;
  const bookId = typeof bookIdRaw === "string" ? bookIdRaw : undefined;

  const tagIds =
    normalizeStringArray((data as any).tagIds) ||
    normalizeStringArray((data as any).tag_ids) ||
    normalizeStringArray((data as any).tags);

  let startTime =
    toIsoStringMaybe((data as any).startTime) ||
    toIsoStringMaybe((data as any).startAt) ||
    toIsoStringMaybe((data as any).start_time) ||
    toIsoStringMaybe((data as any).startedAt);
  let endTime =
    toIsoStringMaybe((data as any).endTime) ||
    toIsoStringMaybe((data as any).endAt) ||
    toIsoStringMaybe((data as any).end_time) ||
    toIsoStringMaybe((data as any).endedAt);

  let duration = normalizeNumber((data as any).duration, 0);
  duration = Math.max(0, Math.floor(duration));

  // Fill missing times best-effort so UI can display them.
  if (!startTime && endTime && duration > 0) {
    const end = new Date(endTime);
    if (!Number.isNaN(end.getTime())) {
      startTime = new Date(end.getTime() - duration * 1000).toISOString();
    }
  }
  if (!endTime && startTime && duration > 0) {
    const start = new Date(startTime);
    if (!Number.isNaN(start.getTime())) {
      endTime = new Date(start.getTime() + duration * 1000).toISOString();
    }
  }
  if (!startTime && !endTime) {
    // fallback: at least make it show up in grouped list
    startTime = createdAt;
    endTime = createdAt;
  }

  return {
    ...data,
    memo,
    duration,
    createdAt,
    startTime,
    endTime,
    ...(bookId ? { bookId } : {}),
    ...(tagIds ? { tagIds } : {}),
    _migratedFromAnon: true,
    _migratedFromAnonId: id,
  };
}
