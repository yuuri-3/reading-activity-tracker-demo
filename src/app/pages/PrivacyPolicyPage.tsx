import { useMemo } from "react";

import privacyPolicyMarkdown from "../../../docs/privacy-policy.md?raw";
import { Header } from "../components/Header";
import { IconBack } from "../components/icons/IconBack";

type Block =
  | { type: "h1"; text: string }
  | { type: "h2"; text: string }
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

function parseMarkdownToBlocks(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let paragraphLines: string[] = [];
  let listItems: string[] = [];

  const flushParagraph = () => {
    const text = paragraphLines.join(" ").trim();
    if (text) blocks.push({ type: "p", text });
    paragraphLines = [];
  };

  const flushList = () => {
    if (listItems.length > 0) blocks.push({ type: "ul", items: listItems });
    listItems = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (!line.trim()) {
      flushList();
      flushParagraph();
      continue;
    }

    if (line.startsWith("# ")) {
      flushList();
      flushParagraph();
      blocks.push({ type: "h1", text: line.slice(2).trim() });
      continue;
    }

    if (line.startsWith("## ")) {
      flushList();
      flushParagraph();
      blocks.push({ type: "h2", text: line.slice(3).trim() });
      continue;
    }

    if (line.startsWith("- ")) {
      flushParagraph();
      listItems.push(line.slice(2).trim());
      continue;
    }

    paragraphLines.push(line.trim());
  }

  flushList();
  flushParagraph();

  return blocks;
}

export type PrivacyPolicyPageProps = {
  onClose?: () => void;
};

export function PrivacyPolicyPage({ onClose }: PrivacyPolicyPageProps) {
  const blocks = useMemo(
    () => parseMarkdownToBlocks(privacyPolicyMarkdown),
    []
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-[#e8edf2] to-[#dde3ea]">
      <div className="w-full max-w-2xl mx-auto">
        <Header
          variant="simple"
          pageTitle="プライバシーポリシー"
          icon={
            <button
              type="button"
              className="text-muted-foreground"
              onClick={() => {
                if (onClose) {
                  onClose();
                  return;
                }

                try {
                  window.history.back();
                } catch {
                  window.location.assign("/");
                }
              }}
              aria-label="戻る"
            >
              <IconBack size={28} />
            </button>
          }
          action={null}
        />

        <div className="px-6 pt-4 pb-28">
          <div className="rounded-[12px] p-5 bg-[var(--background-solid)] [box-shadow:var(--shadow-neumorphism-sm)]">
            <div className="flex flex-col gap-4">
              {blocks.map((block, idx) => {
                if (block.type === "h1") {
                  return (
                    <h2
                      key={idx}
                      className="text-xl leading-[1.3] tracking-[0.04em] text-foreground"
                    >
                      {block.text}
                    </h2>
                  );
                }

                if (block.type === "h2") {
                  return (
                    <h3
                      key={idx}
                      className="pt-2 text-base leading-[1.4] font-medium text-foreground"
                    >
                      {block.text}
                    </h3>
                  );
                }

                if (block.type === "ul") {
                  return (
                    <ul
                      key={idx}
                      className="list-disc pl-5 text-sm leading-6 text-foreground"
                    >
                      {block.items.map((item, itemIdx) => (
                        <li key={itemIdx}>{item}</li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={idx} className="text-sm leading-6 text-foreground">
                    {block.text}
                  </p>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
