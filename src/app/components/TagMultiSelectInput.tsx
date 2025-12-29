import { useEffect, useMemo, useRef, useState } from "react";
import { Check, X } from "lucide-react";

import { cn } from "./ui/utils";
import { Badge } from "./ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { NeumorphicInput } from "./NeumorphicInput";

function normalizeTag(raw: string) {
  return raw.trim();
}

function equalsTag(a: string, b: string) {
  return (
    normalizeTag(a).toLocaleLowerCase() === normalizeTag(b).toLocaleLowerCase()
  );
}

export type TagMultiSelectInputProps = {
  id?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

export function TagMultiSelectInput({
  id,
  value,
  onChange,
  options,
  placeholder = "タグを入力してEnterで追加",
  disabled,
  className,
}: TagMultiSelectInputProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isComposing, setIsComposing] = useState(false);
  const ignoreNextEnterRef = useRef(false);
  const triggerPointerDownRef = useRef(false);

  const latestValueRef = useRef<string[]>(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const normalizedOptions = useMemo(() => {
    const unique: string[] = [];
    const merged = [...options, ...value];
    for (const opt of merged) {
      const t = normalizeTag(opt);
      if (!t) continue;
      if (unique.some((u) => equalsTag(u, t))) continue;
      unique.push(t);
    }
    return unique;
  }, [options, value]);

  const query = normalizeTag(inputValue);

  const filteredOptions = useMemo(() => {
    if (!query) return normalizedOptions;
    const q = query.toLocaleLowerCase();
    return normalizedOptions.filter((t) => t.toLocaleLowerCase().includes(q));
  }, [normalizedOptions, query]);

  const canCreate =
    !!query && !normalizedOptions.some((t) => equalsTag(t, query));

  const isSelected = (tag: string) => value.some((v) => equalsTag(v, tag));

  const addTag = (raw: string) => {
    const t = normalizeTag(raw);
    if (!t) return;
    const current = latestValueRef.current;
    if (current.some((v) => equalsTag(v, t))) return;
    const next = [...current, t];
    latestValueRef.current = next;
    onChange(next);
  };

  const toggleTag = (tag: string) => {
    const current = latestValueRef.current;
    if (current.some((v) => equalsTag(v, tag))) {
      const next = current.filter((v) => !equalsTag(v, tag));
      latestValueRef.current = next;
      onChange(next);
      setInputValue("");
      return;
    }
    const next = [...current, tag];
    latestValueRef.current = next;
    onChange(next);
    setInputValue("");
  };

  const removeTag = (tag: string) => {
    const current = latestValueRef.current;
    const next = current.filter((v) => !equalsTag(v, tag));
    latestValueRef.current = next;
    onChange(next);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          // PopoverTriggerはクリックで開閉トグルする。
          // タグ入力中に入力欄をクリックしただけで閉じるのはUXが悪いので抑止する。
          if (!nextOpen && triggerPointerDownRef.current) {
            triggerPointerDownRef.current = false;
            return;
          }
          triggerPointerDownRef.current = false;
          setOpen(nextOpen);
        }}
      >
        <PopoverTrigger asChild>
          <NeumorphicInput
            id={id}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="off"
            onPointerDownCapture={() => {
              triggerPointerDownRef.current = true;
            }}
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
                const text = normalizeTag(inputValue);
                if (!text) return;
                addTag(text);
                setInputValue("");
                setOpen(true);
              }
            }}
          />
        </PopoverTrigger>

        <PopoverContent
          align="start"
          className="w-[--radix-popover-trigger-width] p-1"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-60 overflow-y-auto">
            {canCreate && (
              <button
                type="button"
                className="w-full rounded-sm px-2 py-2 text-left text-sm hover:bg-accent"
                onClick={() => {
                  addTag(query);
                  setInputValue("");
                }}
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
                const selected = isSelected(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                      selected && "bg-accent"
                    )}
                    onClick={() => toggleTag(tag)}
                  >
                    <span className="inline-flex size-4 items-center justify-center">
                      {selected ? <Check className="size-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{tag}</span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>

      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <Badge key={tag} variant="secondary" className="gap-1">
              <span className="max-w-[240px] truncate">{tag}</span>
              <button
                type="button"
                className="rounded-sm hover:opacity-80"
                onClick={() => removeTag(tag)}
                aria-label={`${tag} を削除`}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
