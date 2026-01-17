export const ACCOUNT_DELETION_SUBCOLLECTIONS = [
  "records",
  "books",
  "tags",
] as const;

export type AccountDeletionSubcollection =
  (typeof ACCOUNT_DELETION_SUBCOLLECTIONS)[number];

export async function deleteFirestoreUserDataForAccountDeletion(args: {
  deleteSubcollection: (
    subcollection: AccountDeletionSubcollection
  ) => Promise<void>;
  deleteUserDoc: () => Promise<void>;
}) {
  for (const subcollection of ACCOUNT_DELETION_SUBCOLLECTIONS) {
    await args.deleteSubcollection(subcollection);
  }

  await args.deleteUserDoc();
}
