import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

import type { Tag } from "../types";

type TagUpdates = Partial<Pick<Tag, "text" | "description">>;

type TagInput = {
  text: string;
  description?: string;
};

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Partial<T>;
}

function normalizeTagText(text: string) {
  return text.trim();
}

export async function createTag(
  db: Firestore | null,
  uid: string | undefined,
  tag: TagInput,
) {
  if (!db || !uid) return null;
  const text = normalizeTagText(tag.text);
  if (!text) return null;
  const created = await addDoc(collection(db, "users", uid, "tags"), {
    text,
    description: tag.description ?? "",
    createdAt: Timestamp.now(),
  });
  return created.id;
}

export async function updateTag(
  db: Firestore | null,
  uid: string | undefined,
  id: string,
  current: Tag | undefined,
  updates: TagUpdates,
) {
  if (!db || !uid || !current) return;

  const nextText =
    typeof updates.text === "string"
      ? normalizeTagText(updates.text)
      : current.text;
  const nextDescription =
    typeof updates.description === "string"
      ? updates.description
      : current.description;

  await updateDoc(
    doc(db, "users", uid, "tags", id),
    stripUndefined({
      ...(nextText !== current.text ? { text: nextText } : {}),
      ...(nextDescription !== current.description
        ? { description: nextDescription }
        : {}),
    }),
  );
}

export async function deleteTag(
  db: Firestore | null,
  uid: string | undefined,
  id: string,
) {
  if (!db || !uid) return;
  await deleteDoc(doc(db, "users", uid, "tags", id));
}

export async function restoreTag(
  db: Firestore | null,
  uid: string | undefined,
  tag: Tag,
) {
  if (!db || !uid) return;
  const { id, ...rest } = tag;
  const createdAtIso = tag.createdAt ?? "";
  const createdAtDate = createdAtIso ? new Date(createdAtIso) : null;
  const createdAt =
    createdAtDate && !Number.isNaN(createdAtDate.getTime())
      ? Timestamp.fromDate(createdAtDate)
      : undefined;
  await setDoc(
    doc(db, "users", uid, "tags", id),
    stripUndefined({
      ...rest,
      text: normalizeTagText(tag.text),
      description: tag.description ?? "",
      createdAt,
    } as unknown as Record<string, unknown>),
    { merge: true },
  );
}
