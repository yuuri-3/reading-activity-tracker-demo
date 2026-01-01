import { useEffect, useMemo, useRef, useState } from "react";

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
import { useApp } from "../context/AppContext";
import { useVisualViewportHeight } from "../utils/useVisualViewportHeight";

export function TimerPage() {
  const { books, records } = useApp();
  const viewportHeight = useVisualViewportHeight();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const prevHeightRef = useRef(viewportHeight);
  const [values, setValues] = useState({
    memo: "",
    selectedBookId: "",
    bookMemo: "",
    tags: [] as string[],
  });

  const tagOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const r of records) {
      for (const t of r.tags ?? []) {
        const trimmed = t.trim();
        if (!trimmed) continue;
        const key = trimmed.toLocaleLowerCase();
        if (!unique.has(key)) unique.set(key, trimmed);
      }
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b, "ja"));
  }, [records]);

  useEffect(() => {
    const prev = prevHeightRef.current;
    // Heuristic: if the visual viewport height increases notably, the keyboard likely closed.
    if (viewportHeight > prev + 80) {
      scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevHeightRef.current = viewportHeight;
  }, [viewportHeight]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !scrollEl.contains(target)) return;
      // Defer to allow the keyboard animation to start, then center the input area.
      requestAnimationFrame(() => {
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
    };

    scrollEl.addEventListener("focusin", handleFocusIn);
    return () => {
      scrollEl.removeEventListener("focusin", handleFocusIn);
    };
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto" ref={scrollRef}>
        <div
          className="max-w-2xl mx-auto px-6 pt-12 pb-28"
          style={{
            paddingBottom: "calc(7rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          <div className="flex flex-col gap-5">
            <TimerSection
              memo={values.memo}
              selectedBookId={values.selectedBookId}
              bookMemo={values.bookMemo}
              tags={values.tags}
              onClearInputs={() =>
                setValues({
                  memo: "",
                  selectedBookId: "",
                  bookMemo: "",
                  tags: [],
                })
              }
            />

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
                    rows={1}
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
                    rows={1}
                  />
                }
              />

              <FieldItem
                className="w-full"
                labelProps={{ text: "タグ" }}
                instance={
                  <TagMultiSelectInput
                    id="tags"
                    value={values.tags}
                    onChange={(tags) =>
                      setValues((prev) => ({ ...prev, tags }))
                    }
                    options={tagOptions}
                    placeholder="タグを選択もしくは追加してください"
                  />
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
