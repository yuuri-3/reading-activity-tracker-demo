import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as fs from "node:fs";
import * as path from "node:path";

type Mode = "dry-run" | "write";

type Failure = {
  uid: string;
  kind:
    | "books.createdAt"
    | "books.memos[]"
    | "memos.createdAt"
    | "records.startTime"
    | "records.endTime"
    | "records.createdAt"
    | "tags.createdAt";
  refPath: string;
  reason: string;
  value?: unknown;
};

type Summary = {
  mode: Mode;
  projectId: string;
  targetUids: string[];
  startedAt: string;
  finishedAt?: string;
  counts: {
    booksScanned: number;
    booksUpdated: number;
    memosCreatedOrUpdated: number;
    recordsScanned: number;
    recordsUpdated: number;
    tagsScanned: number;
    tagsUpdated: number;
  };
  failures: Failure[];
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

function assertAllowedUids(args: {
  mode: Mode;
  targetUids: string[];
  allowedUidsRaw: string | boolean | undefined;
}): void {
  const { mode, targetUids, allowedUidsRaw } = args;
  if (mode === "dry-run") return;

  const allowedUids = parseUids(allowedUidsRaw);
  if (allowedUids.length === 0) {
    throw new Error(
      "--allowed-uids=<uid1,uid2,...> is required in write mode (safety guard)",
    );
  }

  const allowedSet = new Set(allowedUids);
  const denied = targetUids.filter((uid) => !allowedSet.has(uid));
  if (denied.length > 0) {
    throw new Error(
      `targetUids contains uid(s) not in --allowed-uids: ${denied.join(", ")}`,
    );
  }
}

function toTimestampOrError(
  value: unknown,
): { ok: true; ts: Timestamp } | { ok: false; reason: string } {
  if (value instanceof Timestamp) {
    return { ok: true, ts: value };
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    if (Number.isNaN(ms)) return { ok: false, reason: "Invalid Date" };
    return { ok: true, ts: Timestamp.fromDate(value) };
  }
  if (typeof value === "string") {
    const date = new Date(value);
    const ms = date.getTime();
    if (Number.isNaN(ms)) return { ok: false, reason: "Invalid Date" };
    return { ok: true, ts: Timestamp.fromDate(date) };
  }
  return { ok: false, reason: `Unsupported type: ${typeof value}` };
}

function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

async function setMergeIfWrite(
  mode: Mode,
  ref: admin.firestore.DocumentReference,
  data: admin.firestore.DocumentData,
): Promise<void> {
  if (mode === "dry-run") return;
  await ref.set(data, { merge: true });
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));

  const projectId = requireStringOpt(args.project, "project");
  const uids = parseUids(args.uids ?? args.uid);
  if (uids.length === 0) {
    throw new Error("--uids=<uid1,uid2> (or --uid=<uid>) is required");
  }

  const mode: Mode = args.write ? "write" : "dry-run";
  const outPath =
    typeof args.out === "string" && args.out.trim().length > 0
      ? args.out.trim()
      : undefined;

  // Safety guard: require explicit projectId.
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  assertAllowedUids({
    mode,
    targetUids: uids,
    allowedUidsRaw: args["allowed-uids"],
  });

  const db = admin.firestore();

  const summary: Summary = {
    mode,
    projectId,
    targetUids: uids,
    startedAt: new Date().toISOString(),
    counts: {
      booksScanned: 0,
      booksUpdated: 0,
      memosCreatedOrUpdated: 0,
      recordsScanned: 0,
      recordsUpdated: 0,
      tagsScanned: 0,
      tagsUpdated: 0,
    },
    failures: [],
  };

  for (const uid of uids) {
    const userDoc = db.collection("users").doc(uid);

    // Books (+ embedded legacy memos[] → subcollection)
    const booksSnap = await userDoc.collection("books").get();
    for (const bookDoc of booksSnap.docs) {
      summary.counts.booksScanned += 1;
      const bookData = bookDoc.data();

      const createdAtRes = toTimestampOrError(bookData.createdAt);
      if (!createdAtRes.ok) {
        summary.failures.push({
          uid,
          kind: "books.createdAt",
          refPath: bookDoc.ref.path,
          reason: createdAtRes.reason,
          value: bookData.createdAt,
        });
      } else if (!(bookData.createdAt instanceof Timestamp)) {
        await setMergeIfWrite(mode, bookDoc.ref, {
          createdAt: createdAtRes.ts,
        });
        summary.counts.booksUpdated += 1;
      }

      const legacyMemos = bookData.memos;
      if (legacyMemos != null && !Array.isArray(legacyMemos)) {
        summary.failures.push({
          uid,
          kind: "books.memos[]",
          refPath: bookDoc.ref.path,
          reason: "memos is not an array",
          value: legacyMemos,
        });
        continue;
      }

      if (Array.isArray(legacyMemos)) {
        const seenCountById = new Map<string, number>();

        for (let i = 0; i < legacyMemos.length; i += 1) {
          const memo = legacyMemos[i] as any;
          const rawId = typeof memo?.id === "string" ? memo.id : "";
          if (!rawId) {
            summary.failures.push({
              uid,
              kind: "books.memos[]",
              refPath: bookDoc.ref.path,
              reason: "BookMemo.id is missing",
              value: memo,
            });
            continue;
          }

          const count = (seenCountById.get(rawId) ?? 0) + 1;
          seenCountById.set(rawId, count);
          const memoId = count === 1 ? rawId : `${rawId}_${count - 1}`;

          const text = typeof memo?.text === "string" ? memo.text : "";
          const createdAtMemoRes = toTimestampOrError(memo?.createdAt);
          if (!createdAtMemoRes.ok) {
            summary.failures.push({
              uid,
              kind: "memos.createdAt",
              refPath: `${bookDoc.ref.path}/memos/${memoId}`,
              reason: createdAtMemoRes.reason,
              value: memo?.createdAt,
            });
            continue;
          }

          const memoRef = bookDoc.ref.collection("memos").doc(memoId);
          await setMergeIfWrite(mode, memoRef, {
            text,
            createdAt: createdAtMemoRes.ts,
          });
          summary.counts.memosCreatedOrUpdated += 1;
        }
      }
    }

    // Records
    const recordsSnap = await userDoc.collection("records").get();
    for (const recordDoc of recordsSnap.docs) {
      summary.counts.recordsScanned += 1;
      const data = recordDoc.data();

      const updates: Record<string, unknown> = {};
      let shouldUpdate = false;

      const startRes = toTimestampOrError(data.startTime);
      if (!startRes.ok) {
        summary.failures.push({
          uid,
          kind: "records.startTime",
          refPath: recordDoc.ref.path,
          reason: startRes.reason,
          value: data.startTime,
        });
      } else if (!(data.startTime instanceof Timestamp)) {
        updates.startTime = startRes.ts;
        shouldUpdate = true;
      }

      const endRes = toTimestampOrError(data.endTime);
      if (!endRes.ok) {
        summary.failures.push({
          uid,
          kind: "records.endTime",
          refPath: recordDoc.ref.path,
          reason: endRes.reason,
          value: data.endTime,
        });
      } else if (!(data.endTime instanceof Timestamp)) {
        updates.endTime = endRes.ts;
        shouldUpdate = true;
      }

      const createdRes = toTimestampOrError(data.createdAt);
      if (!createdRes.ok) {
        summary.failures.push({
          uid,
          kind: "records.createdAt",
          refPath: recordDoc.ref.path,
          reason: createdRes.reason,
          value: data.createdAt,
        });
      } else if (!(data.createdAt instanceof Timestamp)) {
        updates.createdAt = createdRes.ts;
        shouldUpdate = true;
      }

      if (shouldUpdate) {
        await setMergeIfWrite(mode, recordDoc.ref, updates);
        summary.counts.recordsUpdated += 1;
      }
    }

    // Tags
    const tagsSnap = await userDoc.collection("tags").get();
    for (const tagDoc of tagsSnap.docs) {
      summary.counts.tagsScanned += 1;
      const data = tagDoc.data();

      const createdRes = toTimestampOrError(data.createdAt);
      if (!createdRes.ok) {
        summary.failures.push({
          uid,
          kind: "tags.createdAt",
          refPath: tagDoc.ref.path,
          reason: createdRes.reason,
          value: data.createdAt,
        });
        continue;
      }

      if (!(data.createdAt instanceof Timestamp)) {
        await setMergeIfWrite(mode, tagDoc.ref, {
          createdAt: createdRes.ts,
        });
        summary.counts.tagsUpdated += 1;
      }
    }
  }

  summary.finishedAt = new Date().toISOString();

  const payload = {
    ...summary,
    failureCount: summary.failures.length,
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
