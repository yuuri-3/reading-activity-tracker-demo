import * as admin from "firebase-admin";
import * as fs from "node:fs";
import * as path from "node:path";

type MemoInfo = {
  bookId: string;
  bookTitle: string;
  legacyMemosCount: number;
  subCollectionMemosCount: number;
  legacyMemos: Array<{
    id: string;
    text: string;
    createdAt: string;
  }>;
  difference: number; // legacyMemosCount - subCollectionMemosCount
};

type Summary = {
  projectId: string;
  uid: string;
  analyzedAt: string;
  totalBooks: number;
  booksWithLegacyMemos: number;
  books: MemoInfo[];
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
  const uid = requireStringOpt(args.uid, "uid");
  const outPath =
    typeof args.out === "string" && args.out.trim().length > 0
      ? args.out.trim()
      : undefined;

  console.log(`Analyzing memos for user: ${uid}`);
  console.log(`Project: ${projectId}`);

  admin.initializeApp({
    projectId,
  });

  const db = admin.firestore();
  const booksRef = db.collection("users").doc(uid).collection("books");
  const booksSnap = await booksRef.get();

  console.log(`Found ${booksSnap.size} books`);

  const booksInfo: MemoInfo[] = [];
  let booksWithLegacyCount = 0;

  for (const bookDoc of booksSnap.docs) {
    const bookData = bookDoc.data();
    const bookId = bookDoc.id;
    const bookTitle = bookData.title ?? "(no title)";

    // Check legacy memos array
    const legacyMemos = bookData.memos;
    const legacyMemosArray: Array<{
      id: string;
      text: string;
      createdAt: string;
    }> = [];

    let legacyMemosCount = 0;
    if (Array.isArray(legacyMemos)) {
      legacyMemosCount = legacyMemos.length;
      for (const memo of legacyMemos) {
        legacyMemosArray.push({
          id: memo?.id ?? "(no id)",
          text:
            typeof memo?.text === "string"
              ? memo.text.substring(0, 100)
              : "(no text)",
          createdAt: memo?.createdAt ?? "(no date)",
        });
      }
    }

    // Check subcollection memos
    const memosSubCollSnap = await bookDoc.ref.collection("memos").get();
    const subCollectionMemosCount = memosSubCollSnap.size;

    const difference = legacyMemosCount - subCollectionMemosCount;

    if (legacyMemosCount > 0) {
      booksWithLegacyCount++;
    }

    booksInfo.push({
      bookId,
      bookTitle,
      legacyMemosCount,
      subCollectionMemosCount,
      legacyMemos: legacyMemosArray,
      difference,
    });
  }

  const summary: Summary = {
    projectId,
    uid,
    analyzedAt: new Date().toISOString(),
    totalBooks: booksSnap.size,
    booksWithLegacyMemos: booksWithLegacyCount,
    books: booksInfo,
  };

  console.log("\n=== Summary ===");
  console.log(`Total books: ${summary.totalBooks}`);
  console.log(`Books with legacy memos field: ${summary.booksWithLegacyMemos}`);
  console.log("\nBooks with differences:");
  for (const book of booksInfo) {
    if (book.difference !== 0) {
      console.log(
        `  ${book.bookTitle}: legacy=${book.legacyMemosCount}, subcollection=${book.subCollectionMemosCount}, diff=${book.difference}`,
      );
    }
  }

  if (outPath) {
    writeJson(outPath, summary);
    console.log(`\nDetailed report written to: ${outPath}`);
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
