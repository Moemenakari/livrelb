"use client";

import { useRef } from "react";
import { Bold, Italic, List } from "lucide-react";
import { textareaClass } from "./ui";

// Description editor: a textarea with Bold / Italic / List buttons. It
// writes the small format the storefront renders (components/ui/rich-text).
export function RichTextarea({
  id,
  value,
  onChange,
  dir,
  rows = 6,
  maxLength = 5000,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  dir?: "rtl" | "ltr";
  rows?: number;
  maxLength?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const wrap = (mark: string) => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const picked = value.slice(a, b) || "text";
    onChange(`${value.slice(0, a)}${mark}${picked}${mark}${value.slice(b)}`);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + mark.length, a + mark.length + picked.length);
    });
  };

  const bullet = () => {
    const el = ref.current;
    if (!el) return;
    const start = value.lastIndexOf("\n", el.selectionStart - 1) + 1;
    const line = value.slice(start);
    onChange(line.startsWith("- ") ? value.slice(0, start) + line.slice(2) : `${value.slice(0, start)}- ${line}`);
    requestAnimationFrame(() => el.focus());
  };

  const tool = "flex size-8 items-center justify-center rounded-md hover:bg-surface";
  return (
    <div className="overflow-hidden rounded-lg border border-line focus-within:border-gold">
      <div className="flex gap-1 border-b border-line bg-background px-1.5 py-1">
        <button type="button" className={tool} onClick={() => wrap("**")} aria-label="Bold" title="Bold">
          <Bold className="size-4" />
        </button>
        <button type="button" className={tool} onClick={() => wrap("*")} aria-label="Italic" title="Italic">
          <Italic className="size-4" />
        </button>
        <button type="button" className={tool} onClick={bullet} aria-label="List" title="Bullet list">
          <List className="size-4" />
        </button>
      </div>
      <textarea
        ref={ref}
        id={id}
        dir={dir}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${textareaClass} rounded-none border-0`}
      />
    </div>
  );
}
