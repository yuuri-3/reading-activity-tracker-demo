import { describe, expect, it, vi } from "vitest";

import {
  ACCOUNT_DELETION_SUBCOLLECTIONS,
  deleteFirestoreUserDataForAccountDeletion,
} from "./accountDeletion";

describe("deleteFirestoreUserDataForAccountDeletion", () => {
  it("deletes subcollections in order and deletes user doc last", async () => {
    const calls: string[] = [];

    const deleteSubcollection = vi.fn(async (subcollection) => {
      calls.push(String(subcollection));
    });
    const deleteUserDoc = vi.fn(async () => {
      calls.push("userDoc");
    });

    await deleteFirestoreUserDataForAccountDeletion({
      deleteSubcollection,
      deleteUserDoc,
    });

    expect(calls).toEqual([...ACCOUNT_DELETION_SUBCOLLECTIONS, "userDoc"]);
    expect(deleteSubcollection).toHaveBeenCalledTimes(
      ACCOUNT_DELETION_SUBCOLLECTIONS.length
    );
    expect(deleteUserDoc).toHaveBeenCalledTimes(1);
  });

  it("does not delete user doc when a subcollection delete fails", async () => {
    const deleteSubcollection = vi.fn(async (subcollection) => {
      if (subcollection === "books") {
        throw new Error("boom");
      }
    });
    const deleteUserDoc = vi.fn(async () => {});

    await expect(
      deleteFirestoreUserDataForAccountDeletion({
        deleteSubcollection,
        deleteUserDoc,
      })
    ).rejects.toThrow("boom");

    expect(deleteUserDoc).not.toHaveBeenCalled();
  });

  it("propagates user doc deletion failure", async () => {
    const deleteSubcollection = vi.fn(async () => {});
    const deleteUserDoc = vi.fn(async () => {
      throw new Error("user-doc-failed");
    });

    await expect(
      deleteFirestoreUserDataForAccountDeletion({
        deleteSubcollection,
        deleteUserDoc,
      })
    ).rejects.toThrow("user-doc-failed");
  });
});
