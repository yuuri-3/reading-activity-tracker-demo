// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  type RulesTestEnvironment,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInAnonymously,
} from "firebase/auth";
import {
  connectFirestoreEmulator,
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { deleteApp, initializeApp, type FirebaseApp } from "firebase/app";
import {
  connectFunctionsEmulator,
  getFunctions,
  httpsCallable,
} from "firebase/functions";
import { describe, afterAll, afterEach, beforeAll, it, expect } from "vitest";

import {
  normalizeCallableErrorCode,
  getCallableErrorCode,
} from "./functionsError";

const PROJECT_ID = "yomzoy";
const EMULATOR_HOST = "127.0.0.1";
const PORTS = {
  auth: 9099,
  firestore: 8080,
  functions: 5001,
};

const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeWithEmulator = hasFirestoreEmulator ? describe : describe.skip;

type TestAppBundle = {
  app: FirebaseApp;
  auth: ReturnType<typeof getAuth>;
  db: ReturnType<typeof getFirestore>;
  functions: ReturnType<typeof getFunctions>;
};

async function createTestApp(name: string): Promise<TestAppBundle> {
  const app = initializeApp(
    {
      projectId: PROJECT_ID,
      apiKey: "demo-key",
      appId: `demo-${name}`,
    },
    `guest-merge-${name}`,
  );
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${PORTS.auth}`, {
    disableWarnings: true,
  });

  const db = getFirestore(app);
  connectFirestoreEmulator(db, EMULATOR_HOST, PORTS.firestore);

  const functions = getFunctions(app);
  connectFunctionsEmulator(functions, EMULATOR_HOST, PORTS.functions);

  return { app, auth, db, functions };
}

async function seedUserData(
  testEnv: RulesTestEnvironment,
  uid: string,
  counts: { tags: number; books: number; memos: number; records: number },
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();

    await setDoc(doc(adminDb, "users", uid), {
      seededAt: Timestamp.now(),
    });

    for (let i = 0; i < counts.tags; i += 1) {
      await setDoc(doc(adminDb, "users", uid, "tags", `tag-${i + 1}`), {
        name: `tag-${i + 1}`,
      });
    }

    for (let i = 0; i < counts.books; i += 1) {
      const bookId = `book-${i + 1}`;
      await setDoc(doc(adminDb, "users", uid, "books", bookId), {
        title: `book-${i + 1}`,
      });

      for (let j = 0; j < counts.memos; j += 1) {
        await setDoc(
          doc(adminDb, "users", uid, "books", bookId, "memos", `memo-${j + 1}`),
          {
            text: `memo-${j + 1}`,
          },
        );
      }
    }

    for (let i = 0; i < counts.records; i += 1) {
      await setDoc(doc(adminDb, "users", uid, "records", `record-${i + 1}`), {
        title: `record-${i + 1}`,
      });
    }
  });
}

async function countSubcollection(
  testEnv: RulesTestEnvironment,
  uid: string,
  subcollection: "tags" | "books" | "records",
) {
  let size = 0;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    const snap = await getDocs(
      collection(adminDb, "users", uid, subcollection),
    );
    size = snap.size;
  });
  return size;
}

async function countBookMemos(testEnv: RulesTestEnvironment, uid: string) {
  let total = 0;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    const booksSnap = await getDocs(collection(adminDb, "users", uid, "books"));
    for (const b of booksSnap.docs) {
      const memosSnap = await getDocs(
        collection(adminDb, "users", uid, "books", b.id, "memos"),
      );
      total += memosSnap.size;
    }
  });
  return total;
}

async function hasUserDoc(testEnv: RulesTestEnvironment, uid: string) {
  let exists = false;
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    const snap = await getDoc(doc(adminDb, "users", uid));
    exists = snap.exists();
  });
  return exists;
}

async function expireMergeRequest(
  testEnv: RulesTestEnvironment,
  requestId: string,
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const adminDb = context.firestore();
    await setDoc(
      doc(adminDb, "guestMergeRequests", requestId),
      { expiresAt: Timestamp.fromMillis(Date.now() - 1000) },
      { merge: true },
    );
  });
}

describeWithEmulator("Guest merge integration (backend)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules: readFileSync(
          path.join(process.cwd(), "firestore.rules"),
          "utf8",
        ),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  afterEach(async () => {
    await testEnv.clearFirestore();
  });

  it("merges anon data into the signed-in user", async () => {
    const anonBundle = await createTestApp("anon-success");
    const targetBundle = await createTestApp("target-success");

    try {
      const anonCredential = await signInAnonymously(anonBundle.auth);
      const anonUid = anonCredential.user.uid;

      const targetCredential = await createUserWithEmailAndPassword(
        targetBundle.auth,
        "guest-merge@example.com",
        "password-123",
      );
      const targetUid = targetCredential.user.uid;

      await seedUserData(testEnv, anonUid, {
        tags: 2,
        books: 1,
        memos: 2,
        records: 1,
      });

      const prepare = httpsCallable(anonBundle.functions, "prepareGuestMerge");
      const prepareRes = await prepare({});
      const prepareData = prepareRes.data as {
        requestId: string;
        secret: string;
      };

      expect(prepareData.requestId).toBeTruthy();
      expect(prepareData.secret).toBeTruthy();

      const preview = httpsCallable(anonBundle.functions, "previewGuestMerge");
      const previewRes = await preview({
        requestId: prepareData.requestId,
        secret: prepareData.secret,
      });
      const previewData = previewRes.data as {
        counts: { tags: number; books: number; records: number };
      };

      expect(previewData.counts).toEqual({ tags: 2, books: 1, records: 1 });

      const execute = httpsCallable(
        targetBundle.functions,
        "executeGuestMerge",
      );
      await execute({
        requestId: prepareData.requestId,
        secret: prepareData.secret,
      });

      const mergedCounts = await Promise.all([
        countSubcollection(testEnv, targetUid, "tags"),
        countSubcollection(testEnv, targetUid, "books"),
        countSubcollection(testEnv, targetUid, "records"),
      ]);

      expect(mergedCounts).toEqual([2, 1, 1]);

      const mergedMemos = await countBookMemos(testEnv, targetUid);
      expect(mergedMemos).toBe(2);

      const anonCounts = await Promise.all([
        countSubcollection(testEnv, anonUid, "tags"),
        countSubcollection(testEnv, anonUid, "books"),
        countSubcollection(testEnv, anonUid, "records"),
      ]);

      expect(anonCounts).toEqual([0, 0, 0]);

      const anonMemos = await countBookMemos(testEnv, anonUid);
      expect(anonMemos).toBe(0);

      const anonDocExists = await hasUserDoc(testEnv, anonUid);
      expect(anonDocExists).toBe(false);
    } finally {
      await deleteApp(anonBundle.app);
      await deleteApp(targetBundle.app);
    }
  });

  it("rejects preview from a different account", async () => {
    const anonBundle = await createTestApp("anon-preview");
    const otherBundle = await createTestApp("other-preview");

    try {
      const anonCredential = await signInAnonymously(anonBundle.auth);
      const anonUid = anonCredential.user.uid;

      await createUserWithEmailAndPassword(
        otherBundle.auth,
        "guest-merge-other@example.com",
        "password-123",
      );

      await seedUserData(testEnv, anonUid, {
        tags: 1,
        books: 0,
        memos: 0,
        records: 0,
      });

      const prepare = httpsCallable(anonBundle.functions, "prepareGuestMerge");
      const prepareRes = await prepare({});
      const prepareData = prepareRes.data as {
        requestId: string;
        secret: string;
      };

      const preview = httpsCallable(otherBundle.functions, "previewGuestMerge");
      await expect(
        preview({
          requestId: prepareData.requestId,
          secret: prepareData.secret,
        }),
      ).rejects.toMatchObject({
        code: expect.stringContaining("permission-denied"),
      });
    } finally {
      await deleteApp(anonBundle.app);
      await deleteApp(otherBundle.app);
    }
  });

  it("rejects expired requests", async () => {
    const anonBundle = await createTestApp("anon-expire");

    try {
      const anonCredential = await signInAnonymously(anonBundle.auth);
      const anonUid = anonCredential.user.uid;

      await seedUserData(testEnv, anonUid, {
        tags: 1,
        books: 0,
        memos: 0,
        records: 0,
      });

      const prepare = httpsCallable(anonBundle.functions, "prepareGuestMerge");
      const prepareRes = await prepare({});
      const prepareData = prepareRes.data as {
        requestId: string;
        secret: string;
      };

      await expireMergeRequest(testEnv, prepareData.requestId);

      const preview = httpsCallable(anonBundle.functions, "previewGuestMerge");
      const previewErr = await preview({
        requestId: prepareData.requestId,
        secret: prepareData.secret,
      }).catch((err) => err);

      const previewCode = normalizeCallableErrorCode(
        getCallableErrorCode(previewErr) ?? "",
      );
      expect(previewCode).toBe("deadline-exceeded");

      const execute = httpsCallable(anonBundle.functions, "executeGuestMerge");
      const executeErr = await execute({
        requestId: prepareData.requestId,
        secret: prepareData.secret,
      }).catch((err) => err);

      const executeCode = normalizeCallableErrorCode(
        getCallableErrorCode(executeErr) ?? "",
      );
      expect(executeCode).toBe("deadline-exceeded");
    } finally {
      await deleteApp(anonBundle.app);
    }
  });

  it("rejects invalid secrets", async () => {
    const anonBundle = await createTestApp("anon-secret");
    const targetBundle = await createTestApp("target-secret");

    try {
      const anonCredential = await signInAnonymously(anonBundle.auth);
      const anonUid = anonCredential.user.uid;

      await createUserWithEmailAndPassword(
        targetBundle.auth,
        "guest-merge-secret@example.com",
        "password-123",
      );

      await seedUserData(testEnv, anonUid, {
        tags: 1,
        books: 1,
        memos: 1,
        records: 0,
      });

      const prepare = httpsCallable(anonBundle.functions, "prepareGuestMerge");
      const prepareRes = await prepare({});
      const prepareData = prepareRes.data as {
        requestId: string;
        secret: string;
      };

      const preview = httpsCallable(anonBundle.functions, "previewGuestMerge");
      const previewErr = await preview({
        requestId: prepareData.requestId,
        secret: `${prepareData.secret}-invalid`,
      }).catch((err) => err);

      const previewCode = normalizeCallableErrorCode(
        getCallableErrorCode(previewErr) ?? "",
      );
      expect(previewCode).toBe("permission-denied");

      const execute = httpsCallable(
        targetBundle.functions,
        "executeGuestMerge",
      );
      const executeErr = await execute({
        requestId: prepareData.requestId,
        secret: `${prepareData.secret}-invalid`,
      }).catch((err) => err);

      const executeCode = normalizeCallableErrorCode(
        getCallableErrorCode(executeErr) ?? "",
      );
      expect(executeCode).toBe("permission-denied");
    } finally {
      await deleteApp(anonBundle.app);
      await deleteApp(targetBundle.app);
    }
  });
});
