import * as crypto from "node:crypto";

import * as admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { GoogleAuth } from "google-auth-library";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

admin.initializeApp();

type GuestMergeCapabilitiesResult = {
  apiVersion: number;
  features: {
    guestMerge: {
      prepareGuestMerge: true;
      previewGuestMerge: true;
      executeGuestMerge: true;
    };
  };
  checkedAt: string; // ISO
};

const GUEST_MERGE_API_VERSION = 1;

type PrepareGuestMergeResult = {
  requestId: string;
  secret: string;
  expiresAt: string; // ISO
};
type PreviewGuestMergeInput = {
  requestId: string;
  secret: string;
};
type PreviewGuestMergeResult = {
  anonUid: string;
  counts: {
    tags: number;
    books: number;
    records: number;
  };
};

type ExecuteGuestMergeInput = {
  requestId: string;
  secret: string;
};

type ExecuteGuestMergeResult = {
  fromUid: string;
  toUid: string;
  moved: {
    tags: number;
    books: number;
    memos: number;
    records: number;
  };
  deleted: {
    tags: number;
    books: number;
    memos: number;
    records: number;
    userDoc: boolean;
    authUser: boolean;
  };
  alreadyDone?: boolean;
};

function requireAuth(auth: unknown): asserts auth is { uid: string } {
  if (!auth || typeof (auth as any).uid !== "string") {
    throw new HttpsError("unauthenticated", "Authentication required");
  }
}

function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new HttpsError("invalid-argument", `${fieldName} is required`);
  }
  return value.trim();
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

type OcrHandwrittenMemoInput = {
  mimeType: string;
  base64: string; // pure base64 (no data URL)
};

type OcrHandwrittenMemoResult = {
  requestId: string;
  text: string;
  provider: {
    name: "gemini";
    model: string;
    location: string;
  };
};

type HttpsErrorDetails = Record<string, unknown>;

const OCR_ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png"]);
const OCR_MAX_IMAGE_BYTES = 4_194_304;

const OCR_REGION = "asia-northeast1";
const OCR_VERTEX_LOCATION = "asia-northeast1";
const OCR_GEMINI_MODEL =
  process.env.OCR_GEMINI_MODEL?.trim() || "gemini-2.5-flash";

const OCR_RATE_LIMITS = {
  perMinute: 5,
  perDay: 30,
} as const;

const OCR_QUOTA_COLLECTION = "ocrQuotaV1" as const;

function getBooleanEnv(name: string): boolean | undefined {
  const raw = process.env[name];
  if (raw == null) return undefined;
  const v = raw.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes" || v === "on") return true;
  if (v === "0" || v === "false" || v === "no" || v === "off") return false;
  return undefined;
}

function isRunningOnEmulator(): boolean {
  return (
    process.env.FUNCTIONS_EMULATOR === "true" ||
    typeof process.env.FIREBASE_EMULATOR_HUB === "string"
  );
}

function shouldRequireAppCheck(): boolean {
  // Default: required on deployed environments; optional on emulator.
  if (isRunningOnEmulator()) return false;
  const override = getBooleanEnv("OCR_REQUIRE_APP_CHECK");
  return override ?? true;
}

function requireAllowedMimeType(mimeType: string): void {
  if (!OCR_ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new HttpsError("invalid-argument", "Unsupported mimeType", {
      reason: "unsupported-mime-type",
      allowed: Array.from(OCR_ALLOWED_MIME_TYPES),
    } satisfies HttpsErrorDetails);
  }
}

function requirePureBase64(base64: string): void {
  if (base64.startsWith("data:")) {
    throw new HttpsError("invalid-argument", "data URL is not allowed", {
      reason: "data-url-not-allowed",
    } satisfies HttpsErrorDetails);
  }

  // Keep it strict to avoid ambiguous decoding.
  const b64 = base64.trim();
  const isValid =
    b64.length > 0 &&
    b64.length % 4 === 0 &&
    /^[A-Za-z0-9+/]+={0,2}$/.test(b64);
  if (!isValid) {
    throw new HttpsError("invalid-argument", "Invalid base64", {
      reason: "invalid-base64",
    } satisfies HttpsErrorDetails);
  }
}

function decodeBase64ToBuffer(base64: string): Buffer {
  requirePureBase64(base64);
  const buf = Buffer.from(base64, "base64");
  if (!buf.length) {
    throw new HttpsError("invalid-argument", "Invalid base64", {
      reason: "invalid-base64",
    } satisfies HttpsErrorDetails);
  }
  return buf;
}

function getJstParts(now: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
} {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(now);
  const get = (type: string) =>
    Number(parts.find((p) => p.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function getJstBucketKeys(now: Date): { minuteKey: string; dayKey: string } {
  const p = getJstParts(now);
  const pad2 = (n: number) => String(n).padStart(2, "0");
  const dayKey = `${p.year}${pad2(p.month)}${pad2(p.day)}`;
  const minuteKey = `${dayKey}${pad2(p.hour)}${pad2(p.minute)}`;
  return { minuteKey, dayKey };
}

function computeRetryAfterSeconds(now: Date): number {
  const nowMs = now.getTime();
  const msToNextMinute = 60_000 - (nowMs % 60_000);

  // JST has no DST; offset is always +09:00.
  const p = getJstParts(now);
  const jstMidnightUtcMs =
    Date.UTC(p.year, p.month - 1, p.day, 0, 0, 0) - 9 * 60 * 60 * 1000;
  const nextJstMidnightUtcMs = jstMidnightUtcMs + 24 * 60 * 60 * 1000;
  const msToNextJstMidnight = Math.max(0, nextJstMidnightUtcMs - nowMs);

  const ms = Math.min(msToNextMinute, msToNextJstMidnight || msToNextMinute);
  return Math.max(1, Math.ceil(ms / 1000));
}

async function requireValidAppCheckToken(request: any): Promise<void> {
  const rawHeaders = request?.rawRequest?.headers as
    | Record<string, unknown>
    | undefined;
  const token =
    (typeof rawHeaders?.["x-firebase-appcheck"] === "string"
      ? (rawHeaders["x-firebase-appcheck"] as string)
      : undefined) ||
    (typeof rawHeaders?.["X-Firebase-AppCheck"] === "string"
      ? (rawHeaders["X-Firebase-AppCheck"] as string)
      : undefined);

  if (!token) {
    throw new HttpsError("permission-denied", "App Check required", {
      reason: "app-check-required",
    } satisfies HttpsErrorDetails);
  }

  try {
    await admin.appCheck().verifyToken(token);
  } catch {
    throw new HttpsError("permission-denied", "Invalid App Check token", {
      reason: "app-check-invalid",
    } satisfies HttpsErrorDetails);
  }
}

async function consumeOcrQuotaOrThrow(
  db: FirebaseFirestore.Firestore,
  uid: string,
  now: Date,
): Promise<void> {
  const { minuteKey, dayKey } = getJstBucketKeys(now);
  const minuteRef = db
    .collection(OCR_QUOTA_COLLECTION)
    .doc(`${uid}_m_${minuteKey}`);
  const dayRef = db.collection(OCR_QUOTA_COLLECTION).doc(`${uid}_d_${dayKey}`);

  const nowMs = now.getTime();
  const retryAfterSeconds = computeRetryAfterSeconds(now);

  await db.runTransaction(async (tx) => {
    const [minuteSnap, daySnap] = await Promise.all([
      tx.get(minuteRef),
      tx.get(dayRef),
    ]);

    const minuteCount = minuteSnap.exists
      ? Number((minuteSnap.data() as any)?.count ?? 0)
      : 0;
    const dayCount = daySnap.exists
      ? Number((daySnap.data() as any)?.count ?? 0)
      : 0;

    const nextMinute = minuteCount + 1;
    const nextDay = dayCount + 1;

    if (
      nextMinute > OCR_RATE_LIMITS.perMinute ||
      nextDay > OCR_RATE_LIMITS.perDay
    ) {
      throw new HttpsError("resource-exhausted", "Rate limit exceeded", {
        reason: "rate-limit",
        retryAfterSeconds,
        limits: OCR_RATE_LIMITS,
        buckets: { minute: minuteKey, day: dayKey },
      } satisfies HttpsErrorDetails);
    }

    const tsNow = Timestamp.fromMillis(nowMs);

    // Keep docs for a while (can be used with Firestore TTL if enabled later).
    const deleteAtMinute = Timestamp.fromMillis(
      nowMs + 8 * 24 * 60 * 60 * 1000,
    );
    const deleteAtDay = Timestamp.fromMillis(nowMs + 40 * 24 * 60 * 60 * 1000);

    tx.set(
      minuteRef,
      {
        uid,
        scope: "minute",
        bucket: minuteKey,
        count: nextMinute,
        updatedAt: tsNow,
        deleteAt: deleteAtMinute,
      },
      { merge: true },
    );

    tx.set(
      dayRef,
      {
        uid,
        scope: "day",
        bucket: dayKey,
        count: nextDay,
        updatedAt: tsNow,
        deleteAt: deleteAtDay,
      },
      { merge: true },
    );
  });
}

type OcrProvider = {
  name: "gemini";
  extractTextFromImage(args: {
    requestId: string;
    projectId: string;
    location: string;
    model: string;
    mimeType: string;
    imageBase64: string;
  }): Promise<string>;
};

const geminiProvider: OcrProvider = {
  name: "gemini",
  async extractTextFromImage({
    requestId,
    projectId,
    location,
    model,
    mimeType,
    imageBase64,
  }): Promise<string> {
    const auth = new GoogleAuth({
      scopes: ["https://www.googleapis.com/auth/cloud-platform"],
    });
    const client = await auth.getClient();
    const accessToken = await client.getAccessToken();
    const token =
      typeof accessToken === "string"
        ? accessToken
        : (accessToken as any)?.token;
    if (!token) {
      throw new Error("Failed to acquire access token");
    }

    const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent`;

    const prompt =
      "あなたはOCRです。画像内の手書き文字をできるだけ正確に文字起こししてください。" +
      "\n- 推測や補完はしない\n- 余計な解説はしない\n- 文字起こし結果のみを返す";

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Request-Id": requestId,
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      }),
    });

    const text = await resp.text();
    if (!resp.ok) {
      // Keep the error message non-sensitive. Do not log image/text.
      if (resp.status === 400) {
        throw new HttpsError("invalid-argument", "Invalid image", {
          reason: "provider-invalid-image",
        } satisfies HttpsErrorDetails);
      }
      if (resp.status === 429) {
        throw new HttpsError("resource-exhausted", "Provider rate limited", {
          reason: "provider-rate-limit",
        } satisfies HttpsErrorDetails);
      }
      // Do not include response body in thrown error to avoid leaking sensitive data into logs.
      throw new Error(`Vertex AI error: ${resp.status}`);
    }

    const json = JSON.parse(text) as any;
    const parts =
      (json?.candidates?.[0]?.content?.parts as Array<any> | undefined) ?? [];
    const out = parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .join("")
      .trim();
    return out;
  },
};

const REQUESTS_COLLECTION = "guestMergeRequests" as const;
const REQUEST_TTL_MS = 15 * 60 * 1000;
const REQUEST_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function countSubcollection(
  db: FirebaseFirestore.Firestore,
  uid: string,
  subcollection: "tags" | "books" | "records",
): Promise<number> {
  const ref = db.collection("users").doc(uid).collection(subcollection);
  const snap = await ref.get();
  return snap.size;
}

async function copySubcollection(
  db: FirebaseFirestore.Firestore,
  fromUid: string,
  toUid: string,
  subcollection: "tags" | "books" | "records",
  writer: FirebaseFirestore.BulkWriter,
): Promise<number> {
  const fromRef = db.collection("users").doc(fromUid).collection(subcollection);
  const toRef = db.collection("users").doc(toUid).collection(subcollection);
  const snap = await fromRef.get();

  for (const docSnap of snap.docs) {
    writer.set(toRef.doc(docSnap.id), docSnap.data(), { merge: true });
  }

  return snap.size;
}

async function copyBookMemos(
  db: FirebaseFirestore.Firestore,
  fromUid: string,
  toUid: string,
  writer: FirebaseFirestore.BulkWriter,
): Promise<number> {
  const fromBooksRef = db.collection("users").doc(fromUid).collection("books");
  const toBooksRef = db.collection("users").doc(toUid).collection("books");
  const booksSnap = await fromBooksRef.get();

  let total = 0;
  for (const bookSnap of booksSnap.docs) {
    const memosSnap = await bookSnap.ref.collection("memos").get();
    const toMemosRef = toBooksRef.doc(bookSnap.id).collection("memos");
    for (const memoSnap of memosSnap.docs) {
      writer.set(toMemosRef.doc(memoSnap.id), memoSnap.data(), { merge: true });
    }
    total += memosSnap.size;
  }

  return total;
}

async function deleteSubcollection(
  db: FirebaseFirestore.Firestore,
  uid: string,
  subcollection: "tags" | "books" | "records",
  writer: FirebaseFirestore.BulkWriter,
): Promise<number> {
  const ref = db.collection("users").doc(uid).collection(subcollection);
  const snap = await ref.get();

  for (const docSnap of snap.docs) {
    writer.delete(docSnap.ref);
  }

  return snap.size;
}

async function deleteBookMemos(
  db: FirebaseFirestore.Firestore,
  uid: string,
  writer: FirebaseFirestore.BulkWriter,
): Promise<number> {
  const booksRef = db.collection("users").doc(uid).collection("books");
  const booksSnap = await booksRef.get();

  let total = 0;
  for (const bookSnap of booksSnap.docs) {
    const memosSnap = await bookSnap.ref.collection("memos").get();
    for (const memoSnap of memosSnap.docs) {
      writer.delete(memoSnap.ref);
    }
    total += memosSnap.size;
  }

  return total;
}

async function deleteAuthUserIfLikelyAnonymous(uid: string): Promise<boolean> {
  try {
    const record = await admin.auth().getUser(uid);

    const hasProviders = (record.providerData ?? []).length > 0;
    const hasIdentifiers = !!record.email || !!record.phoneNumber;

    // Safety: only auto-delete if it looks like a true anonymous account.
    if (hasProviders || hasIdentifiers) {
      return false;
    }

    await admin.auth().deleteUser(uid);
    return true;
  } catch (err: any) {
    // Not found or already deleted: treat as non-fatal.
    const code = typeof err?.code === "string" ? err.code : "";
    if (code.includes("auth/user-not-found")) return false;
    logger.warn("Failed to delete auth user", { uid, err });
    return false;
  }
}

export const prepareGuestMerge = onCall(
  async (request): Promise<PrepareGuestMergeResult> => {
    requireAuth(request.auth);

    const anonUid = request.auth.uid;
    const requestId = crypto.randomUUID();
    const secret = crypto.randomBytes(32).toString("base64url");
    const secretHash = sha256Hex(secret);

    const createdAtMs = Date.now();
    const expiresAtMs = createdAtMs + REQUEST_TTL_MS;
    const deleteAtMs = createdAtMs + REQUEST_DELETE_TTL_MS;

    const db = admin.firestore();
    await db
      .collection(REQUESTS_COLLECTION)
      .doc(requestId)
      .set({
        anonUid,
        secretHash,
        status: "pending",
        createdAt: Timestamp.fromMillis(createdAtMs),
        expiresAt: Timestamp.fromMillis(expiresAtMs),
        deleteAt: Timestamp.fromMillis(deleteAtMs),
      });

    return {
      requestId,
      secret,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  },
);

// Health check / capability endpoint for the frontend.
// If this callable is missing, the frontend can treat it as “Functions not deployed / too old”.
export const getGuestMergeCapabilities = onCall(
  async (request): Promise<GuestMergeCapabilitiesResult> => {
    requireAuth(request.auth);
    return {
      apiVersion: GUEST_MERGE_API_VERSION,
      features: {
        guestMerge: {
          prepareGuestMerge: true,
          previewGuestMerge: true,
          executeGuestMerge: true,
        },
      },
      checkedAt: new Date().toISOString(),
    };
  },
);

export const previewGuestMerge = onCall(
  async (request): Promise<PreviewGuestMergeResult> => {
    requireAuth(request.auth);

    const requestId = requireString(
      (request.data as PreviewGuestMergeInput | undefined)?.requestId,
      "requestId",
    );
    const secret = requireString(
      (request.data as PreviewGuestMergeInput | undefined)?.secret,
      "secret",
    );

    const db = admin.firestore();
    const reqRef = db.collection(REQUESTS_COLLECTION).doc(requestId);
    const snap = await reqRef.get();
    if (!snap.exists) {
      throw new HttpsError("not-found", "Merge request not found");
    }

    const data = snap.data() as any;
    const anonUid = typeof data.anonUid === "string" ? data.anonUid : "";
    if (!anonUid) {
      throw new HttpsError("failed-precondition", "Invalid merge request");
    }

    // Only allow the original anonymous user to preview.
    if (request.auth.uid !== anonUid) {
      throw new HttpsError("permission-denied", "Not allowed to preview");
    }

    const status = typeof data.status === "string" ? data.status : "";
    if (status === "done") {
      // preview is still safe but not useful
      return {
        anonUid,
        counts: { tags: 0, books: 0, records: 0 },
      };
    }

    const expiresAt = data.expiresAt as FirebaseFirestore.Timestamp | undefined;
    const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
    if (expiresAtMs && Date.now() > expiresAtMs) {
      throw new HttpsError("deadline-exceeded", "Merge request expired");
    }

    const expectedHash =
      typeof data.secretHash === "string" ? data.secretHash : "";
    if (!expectedHash || expectedHash !== sha256Hex(secret)) {
      throw new HttpsError("permission-denied", "Invalid merge secret");
    }

    const [tags, books, records] = await Promise.all([
      countSubcollection(db, anonUid, "tags"),
      countSubcollection(db, anonUid, "books"),
      countSubcollection(db, anonUid, "records"),
    ]);

    return {
      anonUid,
      counts: { tags, books, records },
    };
  },
);

export const executeGuestMerge = onCall(
  async (request): Promise<ExecuteGuestMergeResult> => {
    requireAuth(request.auth);

    const toUid = request.auth.uid;
    const requestId = requireString(
      (request.data as any)?.requestId,
      "requestId",
    );
    const secret = requireString((request.data as any)?.secret, "secret");

    const db = admin.firestore();
    const reqRef = db.collection(REQUESTS_COLLECTION).doc(requestId);

    const { anonUid, alreadyDone } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(reqRef);
      if (!snap.exists) {
        throw new HttpsError("not-found", "Merge request not found");
      }

      const data = snap.data() as any;
      const fromUid = typeof data.anonUid === "string" ? data.anonUid : "";
      if (!fromUid) {
        throw new HttpsError("failed-precondition", "Invalid merge request");
      }

      const status = typeof data.status === "string" ? data.status : "";
      const expiresAt = data.expiresAt as
        | FirebaseFirestore.Timestamp
        | undefined;
      const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
      if (expiresAtMs && Date.now() > expiresAtMs) {
        throw new HttpsError("deadline-exceeded", "Merge request expired");
      }

      const existingDeleteAt = data.deleteAt as
        | FirebaseFirestore.Timestamp
        | undefined;
      const createdAt = data.createdAt as
        | FirebaseFirestore.Timestamp
        | undefined;
      if (!existingDeleteAt?.toMillis?.()) {
        const createdAtMs = createdAt?.toMillis?.() ?? Date.now();
        const deleteAtMs = createdAtMs + REQUEST_DELETE_TTL_MS;
        tx.update(reqRef, {
          deleteAt: Timestamp.fromMillis(deleteAtMs),
        });
      }

      if (status === "done") {
        const doneBy = typeof data.doneByUid === "string" ? data.doneByUid : "";
        if (doneBy && doneBy === toUid) {
          return { anonUid: fromUid, alreadyDone: true };
        }
        throw new HttpsError(
          "failed-precondition",
          "Merge request already used",
        );
      }

      if (status === "processing") {
        throw new HttpsError(
          "aborted",
          "Merge request is being processed. Please retry shortly.",
        );
      }

      const expectedHash =
        typeof data.secretHash === "string" ? data.secretHash : "";
      if (!expectedHash || expectedHash !== sha256Hex(secret)) {
        throw new HttpsError("permission-denied", "Invalid merge secret");
      }

      tx.update(reqRef, {
        status: "processing",
        processingByUid: toUid,
        processingStartedAt: Timestamp.now(),
      });

      return { anonUid: fromUid, alreadyDone: false };
    });

    if (alreadyDone) {
      return {
        fromUid: anonUid,
        toUid,
        moved: { tags: 0, books: 0, memos: 0, records: 0 },
        deleted: {
          tags: 0,
          books: 0,
          memos: 0,
          records: 0,
          userDoc: false,
          authUser: false,
        },
        alreadyDone: true,
      };
    }

    // No-op safety: linking keeps uid the same, so no migration needed.
    if (anonUid === toUid) {
      await reqRef.update({
        status: "done",
        doneByUid: toUid,
        doneAt: Timestamp.now(),
        result: {
          moved: { tags: 0, books: 0, memos: 0, records: 0 },
          deleted: {
            tags: 0,
            books: 0,
            memos: 0,
            records: 0,
            userDoc: false,
            authUser: false,
          },
          note: "fromUid equals toUid (likely link flow)",
        },
      });
      return {
        fromUid: anonUid,
        toUid,
        moved: { tags: 0, books: 0, memos: 0, records: 0 },
        deleted: {
          tags: 0,
          books: 0,
          memos: 0,
          records: 0,
          userDoc: false,
          authUser: false,
        },
      };
    }

    const writer = db.bulkWriter();

    try {
      const movedTags = await copySubcollection(
        db,
        anonUid,
        toUid,
        "tags",
        writer,
      );
      const movedBooks = await copySubcollection(
        db,
        anonUid,
        toUid,
        "books",
        writer,
      );
      const movedMemos = await copyBookMemos(db, anonUid, toUid, writer);
      const movedRecords = await copySubcollection(
        db,
        anonUid,
        toUid,
        "records",
        writer,
      );

      const deletedRecords = await deleteSubcollection(
        db,
        anonUid,
        "records",
        writer,
      );

      // Subcollections are not deleted automatically; delete memos explicitly before deleting books.
      const deletedMemos = await deleteBookMemos(db, anonUid, writer);
      const deletedBooks = await deleteSubcollection(
        db,
        anonUid,
        "books",
        writer,
      );
      const deletedTags = await deleteSubcollection(
        db,
        anonUid,
        "tags",
        writer,
      );

      await writer.close();

      let deletedUserDoc = false;
      try {
        await db.collection("users").doc(anonUid).delete();
        deletedUserDoc = true;
      } catch {
        // ignore
      }

      const deletedAuthUser = await deleteAuthUserIfLikelyAnonymous(anonUid);

      const result = {
        fromUid: anonUid,
        toUid,
        moved: {
          tags: movedTags,
          books: movedBooks,
          memos: movedMemos,
          records: movedRecords,
        },
        deleted: {
          tags: deletedTags,
          books: deletedBooks,
          memos: deletedMemos,
          records: deletedRecords,
          userDoc: deletedUserDoc,
          authUser: deletedAuthUser,
        },
      };

      await reqRef.update({
        status: "done",
        doneByUid: toUid,
        doneAt: Timestamp.now(),
        result,
      });

      return result;
    } catch (err) {
      logger.error("Guest merge failed", { requestId, toUid, anonUid, err });
      try {
        await writer.close();
      } catch {
        // ignore
      }

      await reqRef.update({
        status: "failed",
        failedAt: Timestamp.now(),
        failedByUid: toUid,
        error: err instanceof Error ? err.message : String(err),
      });

      throw new HttpsError(
        "internal",
        "Guest merge failed. Please try again later.",
      );
    }
  },
);

export const ocrHandwrittenMemo = onCall(
  {
    region: OCR_REGION,
    timeoutSeconds: 120,
    memory: "1GiB",
  },
  async (request): Promise<OcrHandwrittenMemoResult> => {
    requireAuth(request.auth);

    const requestId = crypto.randomUUID();
    const uid = request.auth.uid;

    if (shouldRequireAppCheck()) {
      await requireValidAppCheckToken(request);
    }

    const input = request.data as OcrHandwrittenMemoInput | undefined;
    const mimeType = requireString(input?.mimeType, "mimeType");
    const base64 = requireString(input?.base64, "base64");
    requireAllowedMimeType(mimeType);

    const buf = decodeBase64ToBuffer(base64);
    if (buf.byteLength > OCR_MAX_IMAGE_BYTES) {
      throw new HttpsError("invalid-argument", "Payload too large", {
        reason: "payload-too-large",
        maxBytes: OCR_MAX_IMAGE_BYTES,
      } satisfies HttpsErrorDetails);
    }

    const db = admin.firestore();
    const now = new Date();

    // Rate-limit before calling the provider to prevent cost blow-ups.
    await consumeOcrQuotaOrThrow(db, uid, now);

    // Project ID should be available on deployed functions.
    const projectId =
      admin.app().options.projectId ||
      process.env.GCLOUD_PROJECT ||
      process.env.GCP_PROJECT;
    if (!projectId) {
      throw new HttpsError("internal", "Project ID not resolved");
    }

    logger.info("OCR request accepted", {
      requestId,
      uid,
      mimeType,
      bytes: buf.byteLength,
    });

    try {
      const text = await geminiProvider.extractTextFromImage({
        requestId,
        projectId,
        location: OCR_VERTEX_LOCATION,
        model: OCR_GEMINI_MODEL,
        mimeType,
        imageBase64: base64,
      });

      return {
        requestId,
        text,
        provider: {
          name: geminiProvider.name,
          model: OCR_GEMINI_MODEL,
          location: OCR_VERTEX_LOCATION,
        },
      };
    } catch (err) {
      // Never log image base64 or extracted text.
      const errInfo =
        err instanceof Error
          ? { name: err.name, message: err.message }
          : { message: String(err) };
      logger.error("OCR failed", { requestId, uid, err: errInfo });
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", "OCR failed. Please try again later.", {
        requestId,
      } satisfies HttpsErrorDetails);
    }
  },
);
