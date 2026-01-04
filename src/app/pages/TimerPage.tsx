import { useMemo, useState } from "react";

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

export function TimerPage() {
  const { books, tags, createTag } = useApp();
  const [values, setValues] = useState({
    memo: "",
    selectedBookId: "",
    bookMemo: "",
    tagIds: [] as string[],
  });

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
            onClearInputs={() =>
              setValues({
                memo: "",
                selectedBookId: "",
                bookMemo: "",
                tagIds: [],
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
