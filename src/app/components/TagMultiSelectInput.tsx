import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import { cn } from "./ui/utils";
import { Badge } from "./ui/badge";
import { Popover, PopoverAnchor, PopoverContent } from "./ui/popover";
import { NeumorphicInput } from "./NeumorphicInput";
import type { Tag } from "../types";

type TagOption = Pick<Tag, "id" | "text">;

function normalizeTagText(raw: string) {
  return raw.trim();
}

function equalsTagText(a: string, b: string) {
  return (
    normalizeTagText(a).toLocaleLowerCase() ===
    normalizeTagText(b).toLocaleLowerCase()
  );
}

export type TagMultiSelectInputProps = {
  id?: string;
  value: string[]; // tagIds
  onChange: (next: string[]) => void; // tagIds
  options: TagOption[];
  onCreateOption?: (text: string) => Promise<string | null> | string | null;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function TagMultiSelectInput({
  id,
  value,
  onChange,
  options,
  onCreateOption,
  placeholder = "タグを入力してEnterで追加",
  disabled,
  className,
}: TagMultiSelectInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const ignoreNextEnterRef = useRef(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);

  const latestValueRef = useRef<string[]>(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const tagsById = useMemo(() => {
    return new Map(options.map((t) => [t.id, t]));
  }, [options]);

  const normalizedOptions = useMemo(() => {
    const unique: TagOption[] = [];
    const seen = new Set<string>();
    for (const opt of options) {
      const text = normalizeTagText(opt.text);
      if (!text) continue;
      if (seen.has(opt.id)) continue;
      seen.add(opt.id);
      unique.push({ ...opt, text });
    }
    return unique;
  }, [options]);

  const query = normalizeTagText(inputValue);

  const filteredOptions = useMemo(() => {
    if (!query) return normalizedOptions;
    const q = query.toLocaleLowerCase();
    return normalizedOptions.filter((t) =>
      t.text.toLocaleLowerCase().includes(q)
    );
  }, [normalizedOptions, query]);

  // Duplicates are allowed (we rely on stable IDs for reference).
  // Still keep exact-match toggle behavior on Enter.
  const canCreate = !!query && !!onCreateOption;

  const isSelected = (tagId: string) => latestValueRef.current.includes(tagId);

  const addTagId = (tagId: string) => {
    if (!tagId) return;
    const current = latestValueRef.current;
    if (current.includes(tagId)) return;
    const next = [...current, tagId];
    latestValueRef.current = next;
    onChange(next);
  };

  const createTag = async (text: string) => {
    if (!onCreateOption) return;
    if (isCreating) return;
    const t = normalizeTagText(text);
    if (!t) return;

    try {
      setIsCreating(true);
      const createdId = await onCreateOption(t);
      if (!createdId) return;
      addTagId(createdId);
      setInputValue("");
      setOpen(true);
    } finally {
      setIsCreating(false);
    }
  };

  const toggleTagId = (tagId: string) => {
    const current = latestValueRef.current;
    if (current.includes(tagId)) {
      const next = current.filter((v) => v !== tagId);
      latestValueRef.current = next;
      onChange(next);
      setInputValue("");
      return;
    }
    const next = [...current, tagId];
    latestValueRef.current = next;
    onChange(next);
    setInputValue("");
  };

  const removeTag = (tagId: string) => {
    const current = latestValueRef.current;
    const next = current.filter((v) => v !== tagId);
    latestValueRef.current = next;
    onChange(next);
  };

  const findExactMatch = (text: string) => {
    return normalizedOptions.find((t) => equalsTagText(t.text, text)) ?? null;
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverAnchor asChild>
          <div ref={anchorRef} className="w-full">
            <NeumorphicInput
              id={id}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={placeholder}
              disabled={disabled}
              autoComplete="off"
              onFocus={() => setOpen(true)}
              onCompositionStart={() => {
                setIsComposing(true);
              }}
              onCompositionEnd={() => {
                setIsComposing(false);
                // IME確定のEnterと「追加」のEnterを分離するため、確定直後のEnterは無視
                ignoreNextEnterRef.current = true;
                window.setTimeout(() => {
                  ignoreNextEnterRef.current = false;
                }, 0);
                setOpen(true);
              }}
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setOpen(false);
                  return;
                }

                if (e.key === "Enter") {
                  const native = e.nativeEvent as unknown as {
                    isComposing?: boolean;
                  };

                  // IME変換確定のEnterでは追加しない
                  if (
                    ignoreNextEnterRef.current ||
                    isComposing ||
                    native.isComposing
                  ) {
                    setOpen(true);
                    return;
                  }

                  e.preventDefault();
                  const text = normalizeTagText(inputValue);
                  if (!text) return;

                  const exact = findExactMatch(text);
                  if (exact) {
                    toggleTagId(exact.id);
                    setInputValue("");
                    setOpen(true);
                    return;
                  }

                  if (canCreate) {
                    void createTag(text);
                    return;
                  }
                }
              }}
            />
          </div>
        </PopoverAnchor>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] max-h-[min(var(--radix-popover-content-available-height),15rem)] overflow-y-auto overscroll-contain touch-pan-y p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onWheelCapture={(e) => {
            e.stopPropagation();
          }}
          onInteractOutside={(e) => {
            const target = e.target as Node | null;
            if (target && anchorRef.current?.contains(target)) {
              e.preventDefault();
            }
          }}
        >
          <div>
            {canCreate && (
              <button
                type="button"
                className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  void createTag(query);
                }}
                disabled={disabled || isCreating}
              >
                「{query}」を追加
              </button>
            )}

            {filteredOptions.length === 0 && !canCreate ? (
              <p className="px-2 py-2 text-sm text-muted-foreground">
                候補がありません
              </p>
            ) : (
              filteredOptions.map((tag) => {
                const selected = isSelected(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                      selected && "bg-accent"
                    )}
                    onClick={() => toggleTagId(tag.id)}
                  >
                    <span className="inline-flex size-4 items-center justify-center">
                      {selected ? <Check className="size-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{tag.text}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((tagId) => {
            const label = tagsById.get(tagId)?.text ?? tagId;
            return (
              <Badge key={tagId} variant="secondary" className="gap-1">
                <span className="max-w-[240px] truncate">{label}</span>
                <button
                  type="button"
                  className="rounded-sm hover:opacity-80"
                  onClick={() => removeTag(tagId)}
                  aria-label={`${label} を削除`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
