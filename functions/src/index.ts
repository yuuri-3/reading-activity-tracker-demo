import * as crypto from "node:crypto";

import * as admin from "firebase-admin";
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
    records: number;
  };
  deleted: {
    tags: number;
    books: number;
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

const REQUESTS_COLLECTION = "guestMergeRequests" as const;
const REQUEST_TTL_MS = 15 * 60 * 1000;
const REQUEST_DELETE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

async function countSubcollection(
  db: FirebaseFirestore.Firestore,
  uid: string,
  subcollection: "tags" | "books" | "records"
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
  writer: FirebaseFirestore.BulkWriter
): Promise<number> {
  const fromRef = db.collection("users").doc(fromUid).collection(subcollection);
  const toRef = db.collection("users").doc(toUid).collection(subcollection);
  const snap = await fromRef.get();

  for (const docSnap of snap.docs) {
    writer.set(toRef.doc(docSnap.id), docSnap.data(), { merge: true });
  }

  return snap.size;
}

async function deleteSubcollection(
  db: FirebaseFirestore.Firestore,
  uid: string,
  subcollection: "tags" | "books" | "records",
  writer: FirebaseFirestore.BulkWriter
): Promise<number> {
  const ref = db.collection("users").doc(uid).collection(subcollection);
  const snap = await ref.get();

  for (const docSnap of snap.docs) {
    writer.delete(docSnap.ref);
  }

  return snap.size;
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
        createdAt: admin.firestore.Timestamp.fromMillis(createdAtMs),
        expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs),
        deleteAt: admin.firestore.Timestamp.fromMillis(deleteAtMs),
      });

    return {
      requestId,
      secret,
      expiresAt: new Date(expiresAtMs).toISOString(),
    };
  }
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
  }
);

export const previewGuestMerge = onCall(
  async (request): Promise<PreviewGuestMergeResult> => {
    requireAuth(request.auth);

    const requestId = requireString(
      (request.data as PreviewGuestMergeInput | undefined)?.requestId,
      "requestId"
    );
    const secret = requireString(
      (request.data as PreviewGuestMergeInput | undefined)?.secret,
      "secret"
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

    const expiresAt = data.expiresAt as admin.firestore.Timestamp | undefined;
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
  }
);

export const executeGuestMerge = onCall(
  async (request): Promise<ExecuteGuestMergeResult> => {
    requireAuth(request.auth);

    const toUid = request.auth.uid;
    const requestId = requireString(
      (request.data as any)?.requestId,
      "requestId"
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
      const expiresAt = data.expiresAt as admin.firestore.Timestamp | undefined;
      const expiresAtMs = expiresAt?.toMillis?.() ?? 0;
      if (expiresAtMs && Date.now() > expiresAtMs) {
        throw new HttpsError("deadline-exceeded", "Merge request expired");
      }

      const existingDeleteAt = data.deleteAt as
        | admin.firestore.Timestamp
        | undefined;
      const createdAt = data.createdAt as admin.firestore.Timestamp | undefined;
      if (!existingDeleteAt?.toMillis?.()) {
        const createdAtMs = createdAt?.toMillis?.() ?? Date.now();
        const deleteAtMs = createdAtMs + REQUEST_DELETE_TTL_MS;
        tx.update(reqRef, {
          deleteAt: admin.firestore.Timestamp.fromMillis(deleteAtMs),
        });
      }

      if (status === "done") {
        const doneBy = typeof data.doneByUid === "string" ? data.doneByUid : "";
        if (doneBy && doneBy === toUid) {
          return { anonUid: fromUid, alreadyDone: true };
        }
        throw new HttpsError(
          "failed-precondition",
          "Merge request already used"
        );
      }

      if (status === "processing") {
        throw new HttpsError(
          "aborted",
          "Merge request is being processed. Please retry shortly."
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
        processingStartedAt: admin.firestore.Timestamp.now(),
      });

      return { anonUid: fromUid, alreadyDone: false };
    });

    if (alreadyDone) {
      return {
        fromUid: anonUid,
        toUid,
        moved: { tags: 0, books: 0, records: 0 },
        deleted: {
          tags: 0,
          books: 0,
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
        doneAt: admin.firestore.Timestamp.now(),
        result: {
          moved: { tags: 0, books: 0, records: 0 },
          deleted: {
            tags: 0,
            books: 0,
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
        moved: { tags: 0, books: 0, records: 0 },
        deleted: {
          tags: 0,
          books: 0,
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
        writer
      );
      const movedBooks = await copySubcollection(
        db,
        anonUid,
        toUid,
        "books",
        writer
      );
      const movedRecords = await copySubcollection(
        db,
        anonUid,
        toUid,
        "records",
        writer
      );

      const deletedRecords = await deleteSubcollection(
        db,
        anonUid,
        "records",
        writer
      );
      const deletedBooks = await deleteSubcollection(
        db,
        anonUid,
        "books",
        writer
      );
      const deletedTags = await deleteSubcollection(
        db,
        anonUid,
        "tags",
        writer
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
        moved: { tags: movedTags, books: movedBooks, records: movedRecords },
        deleted: {
          tags: deletedTags,
          books: deletedBooks,
          records: deletedRecords,
          userDoc: deletedUserDoc,
          authUser: deletedAuthUser,
        },
      };

      await reqRef.update({
        status: "done",
        doneByUid: toUid,
        doneAt: admin.firestore.Timestamp.now(),
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
        failedAt: admin.firestore.Timestamp.now(),
        failedByUid: toUid,
        error: err instanceof Error ? err.message : String(err),
      });

      throw new HttpsError(
        "internal",
        "Guest merge failed. Please try again later."
      );
    }
  }
);

export const ocrHandwrittenMemo = onCall(
  { region: "asia-northeast1" },
  async () => {
    throw new HttpsError("failed-precondition", "OCR is not available");
  }
);
