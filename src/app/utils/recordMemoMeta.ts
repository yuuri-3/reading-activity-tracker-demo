const META_START = "[meta]";
const META_END = "[/meta]";

export type ParsedRecordMemo = {
  body: string;
  meta: Record<string, string>;
};

export function parseRecordMemo(rawMemo: string): ParsedRecordMemo {
  const normalized = rawMemo.replace(/\r\n/g, "\n");

  if (!normalized.startsWith(`${META_START}\n`)) {
    return { body: rawMemo, meta: {} };
  }

  const metaEndLineIndex = normalized.indexOf(`\n${META_END}`);
  if (metaEndLineIndex < 0) {
    return { body: rawMemo, meta: {} };
  }

  const metaBlock = normalized.slice(META_START.length + 1, metaEndLineIndex);
  const meta: Record<string, string> = {};

  for (const line of metaBlock.split("\n")) {
    const separatorIndex = line.indexOf(":");
    if (separatorIndex <= 0) continue;

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();
    if (!key || !value) continue;
    meta[key] = value;
  }

  let bodyStartIndex = metaEndLineIndex + META_END.length + 1;
  if (normalized[bodyStartIndex] === "\n") {
    bodyStartIndex += 1;
  }
  if (normalized[bodyStartIndex] === "\n") {
    bodyStartIndex += 1;
  }

  return {
    body: normalized.slice(bodyStartIndex),
    meta,
  };
}

export function serializeRecordMemo({
  body,
  meta,
}: {
  body: string;
  meta?: Record<string, string>;
}): string {
  const validMetaEntries = Object.entries(meta ?? {}).filter(
    ([key, value]) => key.trim().length > 0 && value.trim().length > 0,
  );

  if (validMetaEntries.length === 0) {
    return body;
  }

  const metaLines = validMetaEntries.map(([key, value]) => {
    return `${key.trim()}: ${value.trim()}`;
  });

  if (!body) {
    return `${META_START}\n${metaLines.join("\n")}\n${META_END}`;
  }

  return `${META_START}\n${metaLines.join("\n")}\n${META_END}\n\n${body}`;
}
