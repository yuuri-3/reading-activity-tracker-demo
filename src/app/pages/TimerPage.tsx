import { useCallback, useEffect, useMemo, useState } from "react";

import { TimerSection } from "../components/TimerSection";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicSelectTrigger } from "../components/NeumorphicSelectTrigger";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectNoneItem,
  SelectValue,
  fromSelectValue,
  toSelectValue,
} from "../components/ui/select";
import { TagMultiSelectInput } from "../components/TagMultiSelectInput";
import { Button } from "../components/ui/button";
import { useApp } from "../context/AppContext";
import { useAuth } from "../auth/AuthContext";

type PersistedTimerInputsV1 = {
  v: 1;
  memo: string;
  selectedBookId: string;
  bookMemo: string;
  tagIds: string[];
};

type TimerPageProps = {
  showOcrEntry?: boolean;
  onOpenOcr?: () => void;
};

const TIMER_INPUTS_STORAGE_VERSION = 1 as const;

function getTimerInputsStorageKey(uid: string | undefined) {
  return `yomzoy:timerInputs:v${TIMER_INPUTS_STORAGE_VERSION}:${uid ?? "anon"}`;
}

function loadPersistedTimerInputs(
  storageKey: string,
): PersistedTimerInputsV1 | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PersistedTimerInputsV1>;
    if (parsed.v !== TIMER_INPUTS_STORAGE_VERSION) return null;

    const memo = typeof parsed.memo === "string" ? parsed.memo : "";
    const selectedBookId =
      typeof parsed.selectedBookId === "string" ? parsed.selectedBookId : "";
    const bookMemo = typeof parsed.bookMemo === "string" ? parsed.bookMemo : "";
    const tagIds = Array.isArray(parsed.tagIds)
      ? parsed.tagIds.filter(
          (value): value is string => typeof value === "string",
        )
      : [];

    return {
      v: TIMER_INPUTS_STORAGE_VERSION,
      memo,
      selectedBookId,
      bookMemo,
      tagIds,
    };
  } catch {
    return null;
  }
}

function savePersistedTimerInputs(
  storageKey: string,
  state: PersistedTimerInputsV1,
) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state));
  } catch {
    // ignore (e.g. storage full / disabled)
  }
}

function clearPersistedTimerInputs(storageKey: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(storageKey);
  } catch {
    // ignore
  }
}

function getDefaultTimerInputs() {
  return {
    memo: "",
    selectedBookId: "",
    bookMemo: "",
    tagIds: [] as string[],
  };
}

export function TimerPage({ showOcrEntry, onOpenOcr }: TimerPageProps) {
  const { books, tags, createTag } = useApp();
  const { user } = useAuth();
  const storageKey = useMemo(
    () => getTimerInputsStorageKey(user?.uid),
    [user?.uid],
  );
  const [values, setValues] = useState(getDefaultTimerInputs);

  useEffect(() => {
    const restored = loadPersistedTimerInputs(storageKey);
    if (restored) {
      setValues({
        memo: restored.memo,
        selectedBookId: restored.selectedBookId,
        bookMemo: restored.bookMemo,
        tagIds: restored.tagIds,
      });
      return;
    }
    setValues(getDefaultTimerInputs());
  }, [storageKey]);

  useEffect(() => {
    const payload: PersistedTimerInputsV1 = {
      v: TIMER_INPUTS_STORAGE_VERSION,
      memo: values.memo,
      selectedBookId: values.selectedBookId,
      bookMemo: values.bookMemo,
      tagIds: values.tagIds,
    };
    savePersistedTimerInputs(storageKey, payload);
  }, [
    storageKey,
    values.bookMemo,
    values.memo,
    values.selectedBookId,
    values.tagIds,
  ]);

  const handleClearInputs = useCallback(() => {
    setValues(getDefaultTimerInputs());
    clearPersistedTimerInputs(storageKey);
  }, [storageKey]);

  const tagOptions = useMemo(() => {
    return [...tags].sort((a, b) => a.text.localeCompare(b.text, "ja"));
  }, [tags]);

  return (
    <div className="w-full">
      <div className="max-w-2xl mx-auto px-6 pt-12 pb-32">
        <div className="flex flex-col gap-5">
          <TimerSection
            memo={values.memo}
            selectedBookId={values.selectedBookId}
            bookMemo={values.bookMemo}
            tagIds={values.tagIds}
            onClearInputs={handleClearInputs}
          />

          {showOcrEntry ? (
            <div className="flex w-full justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenOcr?.();
                }}
                disabled={!onOpenOcr}
              >
                手書きメモを読み取る（OCR）
              </Button>
            </div>
          ) : null}

          <div className="flex w-full flex-col gap-6">
            <FieldItem
              className="w-full"
              labelProps={{ text: "記録メモ" }}
              instance={
                <NeumorphicTextarea
                  id="memo"
                  placeholder="例）P.10まで読んだ"
                  value={values.memo}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, memo: e.target.value }))
                  }
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍" }}
              instance={
                <Select
                  value={toSelectValue(values.selectedBookId)}
                  onValueChange={(next) =>
                    setValues((prev) => ({
                      ...prev,
                      selectedBookId: fromSelectValue(next),
                    }))
                  }
                >
                  <NeumorphicSelectTrigger id="book">
                    <SelectValue placeholder="選択なし" />
                  </NeumorphicSelectTrigger>
                  <SelectContent>
                    <SelectNoneItem />
                    {books.map((book) => (
                      <SelectItem key={book.id} value={book.id}>
                        {book.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "書籍に関するメモ" }}
              instance={
                <NeumorphicTextarea
                  id="bookMemo"
                  placeholder="例）第2章に具体的な例が多い"
                  value={values.bookMemo}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      bookMemo: e.target.value,
                    }))
                  }
                  rows={2}
                  autoResize
                />
              }
            />

            <FieldItem
              className="w-full"
              labelProps={{ text: "タグ" }}
              instance={
                <TagMultiSelectInput
                  id="tags"
                  value={values.tagIds}
                  onChange={(tagIds) =>
                    setValues((prev) => ({ ...prev, tagIds }))
                  }
                  options={tagOptions}
                  onCreateOption={async (text) => {
                    return await createTag({ text });
                  }}
                  placeholder="タグを選択もしくは追加してください"
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
