import * as admin from "firebase-admin";
import { Timestamp, getFirestore } from "firebase-admin/firestore";
import * as fs from "node:fs";
import * as path from "node:path";

type Mode = "dry-run" | "write";

type Failure = {
  uid: string;
  kind:
    | "records.createdAt"
    | "records.bookId"
    | "memos.createdAt"
    | "records.bookMemoId";
  refPath: string;
  reason: string;
  value?: unknown;
};

type MatchSample = {
  recordId: string;
  memoId: string;
  bookId: string;
  recordCreatedAt: string;
  memoCreatedAt: string;
  diffMinutes: number;
};

type CountSummary = {
  memosTotal: number;
  recordsTotal: number;
  recordsWithBookId: number;
  recordsWithBookMemoId: number;
  recordsEligible: number;
  memosEligible: number;
  matchedPairs: number;
  unmatchedMemos: number;
  unmatchedRecords: number;
  skippedMemosAlreadyLinked: number;
  invalidRecordDates: number;
  invalidMemoDates: number;
  recordsMissingBookId: number;
};

type UidSummary = {
  uid: string;
  counts: CountSummary;
  matchesSample: MatchSample[];
};

type Summary = {
  mode: Mode;
  projectId: string;
  databaseId: string;
  windowMinutes: number;
  maxSamples: number;
  targetUids: string[];
  startedAt: string;
  finishedAt?: string;
  options: {
    allowedUids: string[];
  };
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

type PendingUpdate = {
  ref: admin.firestore.DocumentReference;
  bookMemoId: string;
  sample: MatchSample;
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
    memosEligible: 0,
    matchedPairs: 0,
    unmatchedMemos: 0,
    unmatchedRecords: 0,
    skippedMemosAlreadyLinked: 0,
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

async function commitBatches(
  db: admin.firestore.Firestore,
  updates: PendingUpdate[],
): Promise<void> {
  const chunkSize = 400;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const batch = db.batch();
    const slice = updates.slice(i, i + chunkSize);
    for (const update of slice) {
      batch.update(update.ref, { bookMemoId: update.bookMemoId });
    }
    await batch.commit();
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const projectId = requireStringOpt(args.project, "project");
  const databaseId =
    typeof args.database === "string" && args.database.trim().length > 0
      ? args.database.trim()
      : "(default)";
  const uids = parseUids(args.uids ?? args.uid);
  if (uids.length === 0) {
    throw new Error("--uids=<uid1,uid2> (or --uid=<uid>) is required");
  }

  const mode: Mode = args.write ? "write" : "dry-run";
  const windowMinutes = parseNumberOpt(
    args["window-minutes"],
    "window-minutes",
    5,
  );
  const maxSamples = Math.floor(
    parseNumberOpt(args["max-samples"], "max-samples", 50),
  );

  const outPath =
    typeof args.out === "string" && args.out.trim().length > 0
      ? args.out.trim()
      : undefined;

  const allowedUids = parseUids(args["allowed-uids"]);

  if (mode === "write" && allowedUids.length === 0) {
    throw new Error(
      "Refusing to write without --allowed-uids=<uid1,uid2>. (Safety allowlist)",
    );
  }

  if (allowedUids.length > 0) {
    for (const uid of uids) {
      if (!allowedUids.includes(uid)) {
        throw new Error(
          `Target uid is not allowlisted: ${uid}. allowedUids=${allowedUids.join(
            ",",
          )}`,
        );
      }
    }
  }

  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  const db = getFirestore(app, databaseId);
  const windowMs = windowMinutes * 60 * 1000;

  const summary: Summary = {
    mode,
    projectId,
    databaseId,
    windowMinutes,
    maxSamples,
    targetUids: uids,
    startedAt: new Date().toISOString(),
    options: {
      allowedUids,
    },
    counts: initCounts(),
    failures: [],
    byUid: [],
  };

  const pendingUpdates: PendingUpdate[] = [];

  for (const uid of uids) {
    const counts = initCounts();
    const matchesSample: MatchSample[] = [];
    const usedMemoIds = new Set<string>();

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
        usedMemoIds.add(recordData.bookMemoId.trim());
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

      const availableMemos = memos.filter((memo) => !usedMemoIds.has(memo.id));
      counts.skippedMemosAlreadyLinked += memos.length - availableMemos.length;

      counts.recordsEligible += eligibleRecords.length;
      counts.memosEligible += availableMemos.length;

      for (const memo of availableMemos) {
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

          const diffMinutes = Math.round((bestDiff / 60000) * 100) / 100;
          const sample: MatchSample = {
            recordId: bestRecord.id,
            memoId: memo.id,
            bookId,
            recordCreatedAt: bestRecord.createdAtIso,
            memoCreatedAt: memo.createdAtIso,
            diffMinutes,
          };
          if (matchesSample.length < maxSamples) {
            matchesSample.push(sample);
          }

          pendingUpdates.push({
            ref: userDoc.collection("records").doc(bestRecord.id),
            bookMemoId: memo.id,
            sample,
          });
        } else {
          counts.unmatchedMemos += 1;
        }
      }

      for (const record of eligibleRecords) {
        if (matchedRecordIds.has(record.id)) continue;
        counts.unmatchedRecords += 1;
      }
    }

    summary.byUid.push({ uid, counts, matchesSample });
    mergeCounts(summary.counts, counts);
  }

  if (mode === "write") {
    await commitBatches(db, pendingUpdates);
  }

  summary.finishedAt = new Date().toISOString();

  const payload = {
    ...summary,
    failureCount: summary.failures.length,
    updatesPlanned: pendingUpdates.length,
  };

  if (outPath) {
    writeJson(outPath, payload);
  }

  process.stdout.write(JSON.stringify(payload, null, 2) + "\n");

  if (mode === "dry-run") {
    process.stderr.write(
      "DRY-RUN: no writes performed. Use --write to apply changes.\n",
    );
  }
}

main().catch((err) => {
  process.stderr.write(String(err?.stack ?? err) + "\n");
  process.exit(1);
});
