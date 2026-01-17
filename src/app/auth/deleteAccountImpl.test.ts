import { describe, expect, it, vi } from "vitest";

import { ACCOUNT_DELETION_SUBCOLLECTIONS } from "./accountDeletion";
import { deleteAccountImpl } from "./AuthContext";

function createAuthWithUser(uid: string) {
  return { currentUser: { uid } } as any;
}

describe("deleteAccountImpl", () => {
  it("deletes Firestore subcollections based on the centralized list, deletes user doc, then deletes auth user", async () => {
    const calls: string[] = [];
    const uid = "u-test";

    const deleteCollectionDocs = vi.fn(async (_db: any, ...path: any[]) => {
      // path: ["users", uid, subcollection]
      calls.push(String(path[path.length - 1]));
    });

    const deleteUserDoc = vi.fn(async (_db: any, _uid: string) => {
      calls.push("userDoc");
    });

    const deleteAuthUser = vi.fn(async (_user: any) => {
      calls.push("deleteUser");
    });

    const cleanupLocalStorageForUid = vi.fn(() => {
      calls.push("cleanupLocalStorage");
    });

    await deleteAccountImpl({
      auth: createAuthWithUser(uid),
      db: {} as any,
      deleteCollectionDocs,
      deleteUserDoc: async (db, uidArg) => deleteUserDoc(db, uidArg),
      deleteAuthUser: async (user) => deleteAuthUser(user),
      cleanupLocalStorageForUid,
    });

    const subcollectionCalls = deleteCollectionDocs.mock.calls.map(
      ([_db, ...path]) => String(path[path.length - 1])
    );
    expect(subcollectionCalls).toEqual([...ACCOUNT_DELETION_SUBCOLLECTIONS]);

    // Ensure the path includes users/{uid}/{subcollection}
    for (const [dbArg, ...path] of deleteCollectionDocs.mock.calls) {
      expect(dbArg).toBeDefined();
      expect(path[0]).toBe("users");
      expect(path[1]).toBe(uid);
      expect(ACCOUNT_DELETION_SUBCOLLECTIONS).toContain(path[2]);
    }

    expect(calls).toEqual([
      ...ACCOUNT_DELETION_SUBCOLLECTIONS,
      "userDoc",
      "deleteUser",
      "cleanupLocalStorage",
    ]);
  });

  it("does not delete auth user when Firestore deletion fails", async () => {
    const uid = "u-fail";

    const deleteCollectionDocs = vi.fn(async (_db: any, ...path: any[]) => {
      const subcollection = String(path[path.length - 1]);
      if (subcollection === "books") {
        throw new Error("firestore-failed");
      }
    });

    const deleteUserDoc = vi.fn(async (_db: any, _uid: string) => {});
    const deleteAuthUser = vi.fn(async (_user: any) => {});
    const cleanupLocalStorageForUid = vi.fn(() => {});

    await expect(
      deleteAccountImpl({
        auth: createAuthWithUser(uid),
        db: {} as any,
        deleteCollectionDocs,
        deleteUserDoc: async (db, uidArg) => deleteUserDoc(db, uidArg),
        deleteAuthUser: async (user) => deleteAuthUser(user),
        cleanupLocalStorageForUid,
      })
    ).rejects.toThrow("firestore-failed");

    expect(deleteUserDoc).not.toHaveBeenCalled();
    expect(deleteAuthUser).not.toHaveBeenCalled();
    expect(cleanupLocalStorageForUid).not.toHaveBeenCalled();
  });
});
