import * as React from "react";

const URL_REGEX = /https?:\/\/[^\s<>()]+/g;

function stripTrailingPunctuation(url: string) {
  // Common trailing punctuation when URLs appear at the end of a sentence.
  // Keep this conservative to avoid over-stripping.
  const trailingChars = ".,!?;:)]}";
  let next = url;
  let trailing = "";
  while (next.length > 0 && trailingChars.includes(next[next.length - 1]!)) {
    trailing = next[next.length - 1]! + trailing;
    next = next.slice(0, -1);
  }
  return { url: next, trailing };
}

function linkifyString(text: string): React.ReactNode {
  if (!text) return text;

  const matches = Array.from(text.matchAll(URL_REGEX));
  if (matches.length === 0) return text;

  const out: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const m of matches) {
    const start = m.index ?? 0;
    const raw = m[0] ?? "";
    if (start > lastIndex) {
      out.push(text.slice(lastIndex, start));
    }

    const { url, trailing } = stripTrailingPunctuation(raw);
    if (url) {
      out.push(
        <a
          key={`url:${start}:${url}`}
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="cursor-pointer underline underline-offset-2 hover:no-underline"
        >
          {url}
        </a>
      );
    } else {
      out.push(raw);
    }

    if (trailing) out.push(trailing);
    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) out.push(text.slice(lastIndex));
  return <>{out}</>;
}

export function linkifyReactNode(node: React.ReactNode): React.ReactNode {
  if (node == null || typeof node === "boolean") return node;
  if (typeof node === "string") return linkifyString(node);
  if (typeof node === "number") return node;

  if (Array.isArray(node)) {
    return node.map((child) => linkifyReactNode(child));
  }

  if (React.isValidElement(node)) {
    // Avoid nesting links.
    if (node.type === "a") return node;

    const children = (node.props as any)?.children;
    if (children == null) return node;

    const nextChildren = React.Children.map(children, (child) =>
      linkifyReactNode(child)
    );
    return React.cloneElement(node, undefined, nextChildren);
  }

  return node;
}
