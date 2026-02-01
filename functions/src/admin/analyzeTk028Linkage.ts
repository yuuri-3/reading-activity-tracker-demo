import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as fs from "node:fs";
import * as path from "node:path";

type Failure = {
  uid: string;
  kind: "records.createdAt" | "records.bookId" | "memos.createdAt";
  refPath: string;
  reason: string;
  value?: unknown;
};

type MissMemo = {
  memoId: string;
  bookId: string;
  createdAt: string;
  nearestRecordId?: string;
  nearestDiffMinutes?: number;
};

type MissRecord = {
  recordId: string;
  bookId: string;
  createdAt: string;
  nearestMemoId?: string;
  nearestDiffMinutes?: number;
};

type CountSummary = {
  memosTotal: number;
  recordsTotal: number;
  recordsWithBookId: number;
  recordsWithBookMemoId: number;
  recordsEligible: number;
  matchedPairs: number;
  unmatchedMemos: number;
  unmatchedRecords: number;
  invalidRecordDates: number;
  invalidMemoDates: number;
  recordsMissingBookId: number;
};

type UidSummary = {
  uid: string;
  counts: CountSummary;
  missesSample: {
    memos: MissMemo[];
    records: MissRecord[];
  };
};

type Summary = {
  projectId: string;
  windowMinutes: number;
  maxMisses: number;
  targetUids: string[];
  analyzedAt: string;
  finishedAt?: string;
  counts: CountSummary;
  failures: Failure[];
  byUid: UidSummary[];
};

type RecordInfo = {
  id: string;
  bookId: string;
  createdAtMs: number;
  createdAtIso: string;
  hasBookMemoId: boolean;
};

type MemoInfo = {
  id: string;
  bookId: string;
  createdAtMs: number;
  createdAtIso: string;
};

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const trimmed = raw.slice(2);
    const eq = trimmed.indexOf("=");
    if (eq === -1) {
      out[trimmed] = true;
      continue;
    }
    const key = trimmed.slice(0, eq);
    const value = trimmed.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

function requireStringOpt(
  value: string | boolean | undefined,
  name: string,
): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`--${name} is required`);
  }
  return value.trim();
}

function parseUids(uidsRaw: string | boolean | undefined): string[] {
  if (typeof uidsRaw !== "string") return [];
  return uidsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseNumberOpt(
  value: string | boolean | undefined,
  name: string,
  defaultValue: number,
): number {
  if (value === undefined || value === false) return defaultValue;
  const raw = typeof value === "string" ? value : String(value);
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`--${name} must be a positive number`);
  }
  return parsed;
}

function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function toMillis(
  value: unknown,
): { ok: true; ms: number } | { ok: false; reason: string } {
  if (value instanceof Timestamp) {
    return { ok: true, ms: value.toMillis() };
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) return { ok: false, reason: "Invalid Date" };
    return { ok: true, ms };
  }
  if (typeof value === "string") {
    const date = new Date(value);
    const ms = date.getTime();
    if (Number.isNaN(ms)) return { ok: false, reason: "Invalid Date" };
    return { ok: true, ms };
  }
  return { ok: false, reason: `Unsupported type: ${typeof value}` };
}

function initCounts(): CountSummary {
  return {
    memosTotal: 0,
    recordsTotal: 0,
    recordsWithBookId: 0,
    recordsWithBookMemoId: 0,
    recordsEligible: 0,
    matchedPairs: 0,
    unmatchedMemos: 0,
    unmatchedRecords: 0,
    invalidRecordDates: 0,
    invalidMemoDates: 0,
    recordsMissingBookId: 0,
  };
}

function mergeCounts(target: CountSummary, add: CountSummary): void {
  for (const key of Object.keys(target) as Array<keyof CountSummary>) {
    target[key] += add[key];
  }
}

function findNearestDiffMinutes(
  sourceMs: number,
  targets: Array<{ createdAtMs: number; id: string }>,
): { id?: string; diffMinutes?: number } {
  let bestId: string | undefined;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    const diff = Math.abs(sourceMs - target.createdAtMs);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestId = target.id;
    }
  }
  if (!bestId || !Number.isFinite(bestDiff)) return {};
  return {
    id: bestId,
    diffMinutes: Math.round((bestDiff / 60000) * 100) / 100,
  };
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const projectId = requireStringOpt(args.project, "project");
  const uids = parseUids(args.uids ?? args.uid);
  if (uids.length === 0) {
    throw new Error("--uids=<uid1,uid2> (or --uid=<uid>) is required");
  }

  const windowMinutes = parseNumberOpt(
    args["window-minutes"],
    "window-minutes",
    5,
  );
  const maxMisses = Math.floor(
    parseNumberOpt(args["max-misses"], "max-misses", 50),
  );
  const outPath =
    typeof args.out === "string" && args.out.trim().length > 0
      ? args.out.trim()
      : undefined;

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  const db = admin.firestore();
  const summary: Summary = {
    projectId,
    windowMinutes,
    maxMisses,
    targetUids: uids,
    analyzedAt: new Date().toISOString(),
    counts: initCounts(),
    failures: [],
    byUid: [],
  };

  const windowMs = windowMinutes * 60 * 1000;

  for (const uid of uids) {
    const counts = initCounts();
    const missesSample: UidSummary["missesSample"] = {
      memos: [],
      records: [],
    };

    const userDoc = db.collection("users").doc(uid);

    const booksSnap = await userDoc.collection("books").get();
    const memosByBook = new Map<string, MemoInfo[]>();

    for (const bookDoc of booksSnap.docs) {
      const bookId = bookDoc.id;
      const memosSnap = await bookDoc.ref.collection("memos").get();
      for (const memoDoc of memosSnap.docs) {
        const memoData = memoDoc.data();
        const createdAtRes = toMillis(memoData.createdAt);
        if (!createdAtRes.ok) {
          summary.failures.push({
            uid,
            kind: "memos.createdAt",
            refPath: memoDoc.ref.path,
            reason: createdAtRes.reason,
            value: memoData.createdAt,
          });
          counts.invalidMemoDates += 1;
          continue;
        }

        const memoInfo: MemoInfo = {
          id: memoDoc.id,
          bookId,
          createdAtMs: createdAtRes.ms,
          createdAtIso: new Date(createdAtRes.ms).toISOString(),
        };
        const list = memosByBook.get(bookId) ?? [];
        list.push(memoInfo);
        memosByBook.set(bookId, list);
        counts.memosTotal += 1;
      }
    }

    const recordsSnap = await userDoc.collection("records").get();
    const recordsByBook = new Map<string, RecordInfo[]>();

    for (const recordDoc of recordsSnap.docs) {
      counts.recordsTotal += 1;
      const recordData = recordDoc.data();
      const bookId = recordData.bookId;
      if (typeof bookId !== "string" || bookId.trim().length === 0) {
        counts.recordsMissingBookId += 1;
        summary.failures.push({
          uid,
          kind: "records.bookId",
          refPath: recordDoc.ref.path,
          reason: "bookId is missing or not a string",
          value: recordData.bookId,
        });
        continue;
      }

      counts.recordsWithBookId += 1;

      const createdAtRes = toMillis(recordData.createdAt);
      if (!createdAtRes.ok) {
        counts.invalidRecordDates += 1;
        summary.failures.push({
          uid,
          kind: "records.createdAt",
          refPath: recordDoc.ref.path,
          reason: createdAtRes.reason,
          value: recordData.createdAt,
        });
        continue;
      }

      const hasBookMemoId =
        typeof recordData.bookMemoId === "string" &&
        recordData.bookMemoId.trim().length > 0;
      if (hasBookMemoId) {
        counts.recordsWithBookMemoId += 1;
      }

      const recordInfo: RecordInfo = {
        id: recordDoc.id,
        bookId,
        createdAtMs: createdAtRes.ms,
        createdAtIso: new Date(createdAtRes.ms).toISOString(),
        hasBookMemoId,
      };

      const list = recordsByBook.get(bookId) ?? [];
      list.push(recordInfo);
      recordsByBook.set(bookId, list);
    }

    for (const [bookId, list] of recordsByBook.entries()) {
      recordsByBook.set(
        bookId,
        list.sort((a, b) => a.createdAtMs - b.createdAtMs),
      );
    }

    for (const [bookId, list] of memosByBook.entries()) {
      memosByBook.set(
        bookId,
        list.sort((a, b) => a.createdAtMs - b.createdAtMs),
      );
    }

    for (const [bookId, memos] of memosByBook.entries()) {
      const records = recordsByBook.get(bookId) ?? [];
      const eligibleRecords = records.filter((record) => !record.hasBookMemoId);
      const matchedRecordIds = new Set<string>();

      counts.recordsEligible += eligibleRecords.length;

      for (const memo of memos) {
        let bestRecord: RecordInfo | undefined;
        let bestDiff = Number.POSITIVE_INFINITY;

        for (const record of eligibleRecords) {
          if (matchedRecordIds.has(record.id)) continue;
          const diff = Math.abs(memo.createdAtMs - record.createdAtMs);
          if (diff <= windowMs && diff < bestDiff) {
            bestDiff = diff;
            bestRecord = record;
          }
        }

        if (bestRecord) {
          matchedRecordIds.add(bestRecord.id);
          counts.matchedPairs += 1;
        } else {
          counts.unmatchedMemos += 1;
          if (missesSample.memos.length < maxMisses) {
            const nearest = findNearestDiffMinutes(
              memo.createdAtMs,
              eligibleRecords,
            );
            missesSample.memos.push({
              memoId: memo.id,
              bookId,
              createdAt: memo.createdAtIso,
              nearestRecordId: nearest.id,
              nearestDiffMinutes: nearest.diffMinutes,
            });
          }
        }
      }

      for (const record of eligibleRecords) {
        if (matchedRecordIds.has(record.id)) continue;
        counts.unmatchedRecords += 1;
        if (missesSample.records.length < maxMisses) {
          const nearest = findNearestDiffMinutes(record.createdAtMs, memos);
          missesSample.records.push({
            recordId: record.id,
            bookId,
            createdAt: record.createdAtIso,
            nearestMemoId: nearest.id,
            nearestDiffMinutes: nearest.diffMinutes,
          });
        }
      }
    }

    const uidSummary: UidSummary = {
      uid,
      counts,
      missesSample,
    };

    summary.byUid.push(uidSummary);
    mergeCounts(summary.counts, counts);
  }

  summary.finishedAt = new Date().toISOString();

  if (outPath) {
    writeJson(outPath, summary);
  }

  process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
