import * as admin from "firebase-admin";
import * as fs from "node:fs";
import * as path from "node:path";

type Mode = "dry-run" | "write";

type Failure = {
  uid: string;
  kind: "books.memos";
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
  options: {
    deleteBooksMemos: boolean;
    allowedUids: string[];
  };
  counts: {
    booksScanned: number;
    booksWithLegacyMemosField: number;
    booksLegacyMemosFieldDeleted: number;
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

function ensureDirForFile(filePath: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath: string, data: unknown): void {
  ensureDirForFile(filePath);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
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

  const deleteBooksMemos = !!args["delete-books-memos"];
  const allowedUids = parseUids(args["allowed-uids"]);

  if (mode === "write" && !deleteBooksMemos) {
    throw new Error(
      "Refusing to write without --delete-books-memos. (Dry-run is allowed.)",
    );
  }

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

  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  });

  const db = admin.firestore();

  const summary: Summary = {
    mode,
    projectId,
    targetUids: uids,
    startedAt: new Date().toISOString(),
    options: {
      deleteBooksMemos,
      allowedUids,
    },
    counts: {
      booksScanned: 0,
      booksWithLegacyMemosField: 0,
      booksLegacyMemosFieldDeleted: 0,
    },
    failures: [],
  };

  for (const uid of uids) {
    const userDoc = db.collection("users").doc(uid);

    const booksSnap = await userDoc.collection("books").get();
    for (const bookDoc of booksSnap.docs) {
      summary.counts.booksScanned += 1;
      const data = bookDoc.data() as Record<string, unknown>;

      if (!("memos" in data)) {
        continue;
      }

      const legacyMemos = data.memos;

      // We only auto-delete when it looks like the expected legacy array (or null).
      if (
        legacyMemos !== null &&
        legacyMemos !== undefined &&
        !Array.isArray(legacyMemos)
      ) {
        summary.failures.push({
          uid,
          kind: "books.memos",
          refPath: bookDoc.ref.path,
          reason: "memos exists but is not an array/null",
          value: legacyMemos,
        });
        continue;
      }

      summary.counts.booksWithLegacyMemosField += 1;

      if (mode === "write") {
        await bookDoc.ref.update({
          memos: admin.firestore.FieldValue.delete(),
        });
        summary.counts.booksLegacyMemosFieldDeleted += 1;
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
