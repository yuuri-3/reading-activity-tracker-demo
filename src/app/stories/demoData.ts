import type { Book, ReadingRecord, Tag } from "../types";

export function createIsoDate(offsetMinutes: number) {
  return new Date(Date.now() + offsetMinutes * 60 * 1000).toISOString();
}

type DemoBooksOptions = {
  variant?: "simple" | "rich";
};

export function createDemoBooks({
  variant = "simple",
}: DemoBooksOptions = {}): Book[] {
  if (variant === "rich") {
    return [
      {
        id: "book-1",
        title: "これが書籍タイトルB (タイトルが長いときはこんな感じ)",
        author: "著者A",
        memos: [
          { id: "m-1", text: "気づきメモ", createdAt: createIsoDate(-60) },
          { id: "m-2", text: "次回読む場所", createdAt: createIsoDate(-30) },
        ],
        createdAt: createIsoDate(-7 * 24 * 60),
      },
      {
        id: "book-2",
        title: "サンプル書籍",
        author: "著者",
        memos: [],
        createdAt: createIsoDate(-3 * 24 * 60),
      },
      {
        id: "book-3",
        title: "もう一冊",
        memos: [{ id: "m-3", text: "メモだけ", createdAt: createIsoDate(-20) }],
        createdAt: createIsoDate(-2 * 24 * 60),
      },
    ];
  }

  return [
    {
      id: "book-1",
      title: "サンプル書籍",
      author: "著者",
      memos: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: "book-2",
      title: "もう一冊",
      memos: [],
      createdAt: new Date().toISOString(),
    },
  ];
}

type DemoRecordsOptions = {
  variant?: "none" | "recent";
};

export function createDemoRecords({
  variant = "recent",
}: DemoRecordsOptions = {}): ReadingRecord[] {
  if (variant === "none") return [];

  return [
    {
      id: "record-1",
      bookId: "book-1",
      duration: 2 * 3600 + 32 * 60,
      memo: "P.10まで読んだ",
      startTime: createIsoDate(-200),
      endTime: createIsoDate(-180),
      createdAt: createIsoDate(-180),
    },
    {
      id: "record-2",
      bookId: "book-2",
      duration: 25 * 60,
      memo: "集中できた",
      startTime: createIsoDate(-90),
      endTime: createIsoDate(-65),
      createdAt: createIsoDate(-65),
    },
  ];
}

export function createDemoTags(): Tag[] {
  return [
    {
      id: "tag-react",
      text: "React",
      description: "ここにタグの補足説明",
      createdAt: createIsoDate(-7 * 24 * 60),
    },
    {
      id: "tag-design",
      text: "Design",
      description: "",
      createdAt: createIsoDate(-6 * 24 * 60),
    },
    {
      id: "tag-journal",
      text: "Journal",
      description: "",
      createdAt: createIsoDate(-5 * 24 * 60),
    },
    {
      id: "tag-dev",
      text: "Dev",
      description: "ここにタグの補足説明",
      createdAt: createIsoDate(-4 * 24 * 60),
    },
  ];
}
