import { readFileSync } from "node:fs";
import path from "node:path";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { afterAll, beforeAll, describe, it } from "vitest";

// NOTE:
// This test is expected to run against the Firebase Emulator Suite.
// Use: `npm run test:rules`

const hasFirestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const describeWithEmulator = hasFirestoreEmulator ? describe : describe.skip;

describeWithEmulator("Firestore Rules (smoke)", () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "yomzoy-rules-test",
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

  it("denies all unauthenticated access", async () => {
    const db = testEnv.unauthenticatedContext().firestore();

    await assertFails(getDoc(doc(db, "users", "u1", "books", "b1")));
    await assertFails(
      getDoc(doc(db, "users", "u1", "books", "b1", "memos", "m1")),
    );
    await assertFails(
      setDoc(doc(db, "users", "u1", "books", "b1"), { title: "x" }),
    );
    await assertFails(
      setDoc(doc(db, "users", "u1", "books", "b1", "memos", "m1"), {
        text: "memo",
      }),
    );
  });

  it("allows owner read/write under their /users/{uid}/...", async () => {
    const uid = "ownerUid";
    const db = testEnv.authenticatedContext(uid).firestore();

    await assertSucceeds(
      setDoc(doc(db, "users", uid, "books", "b1"), { title: "book" }),
    );
    await assertSucceeds(getDoc(doc(db, "users", uid, "books", "b1")));

    await assertSucceeds(
      setDoc(doc(db, "users", uid, "books", "b1", "memos", "m1"), {
        text: "memo",
      }),
    );
    await assertSucceeds(
      getDoc(doc(db, "users", uid, "books", "b1", "memos", "m1")),
    );

    await assertSucceeds(
      setDoc(doc(db, "users", uid, "records", "r1"), { memo: "record" }),
    );
    await assertSucceeds(
      setDoc(doc(db, "users", uid, "tags", "t1"), { name: "tag" }),
    );
  });

  it("denies cross-user access", async () => {
    const ownerUid = "ownerUid";
    const otherUid = "otherUid";

    const otherDb = testEnv.authenticatedContext(otherUid).firestore();

    await assertFails(getDoc(doc(otherDb, "users", ownerUid, "books", "b1")));
    await assertFails(
      getDoc(doc(otherDb, "users", ownerUid, "books", "b1", "memos", "m1")),
    );
    await assertFails(
      setDoc(doc(otherDb, "users", ownerUid, "books", "b1"), { title: "x" }),
    );
    await assertFails(
      setDoc(doc(otherDb, "users", ownerUid, "books", "b1", "memos", "m1"), {
        text: "x",
      }),
    );
  });
});
