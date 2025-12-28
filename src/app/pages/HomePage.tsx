import { TimerSection } from "../components/TimerSection";
import { FieldItem } from "../components/FieldItem";
import { NeumorphicSelectTrigger } from "../components/NeumorphicSelectTrigger";
import { NeumorphicTextarea } from "../components/NeumorphicTextarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../components/ui/select";
import { useApp } from "../context/AppContext";
import { useState } from "react";

export function HomePage() {
  const { books } = useApp();
  const [values, setValues] = useState({
    memo: "",
    selectedBookId: "",
    bookMemo: "",
  });

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 min-h-0 overflow-y-auto p-6 pb-28">
        <div className="flex flex-col gap-8">
          <TimerSection
            memo={values.memo}
            selectedBookId={values.selectedBookId}
            bookMemo={values.bookMemo}
            onClearInputs={() =>
              setValues({ memo: "", selectedBookId: "", bookMemo: "" })
            }
          />

          <div className="flex w-full flex-col gap-6">
            <FieldItem
              className="w-full"
              labelProps={{ text: "メモ" }}
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
                  value={values.selectedBookId}
                  onValueChange={(selectedBookId) =>
                    setValues((prev) => ({ ...prev, selectedBookId }))
                  }
                >
                  <NeumorphicSelectTrigger id="book">
                    <SelectValue placeholder="選択なし" />
                  </NeumorphicSelectTrigger>
                  <SelectContent>
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
                    setValues((prev) => ({ ...prev, bookMemo: e.target.value }))
                  }
                  rows={1}
                />
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
