import type { ReactNode } from "react";

// The small rich text the admin editor writes (product descriptions):
// **bold**, *italic*, lines starting with "- " as a bullet list, one
// paragraph per line. Rendered as React elements, never as raw HTML.

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(match[1] ? <strong key={match.index} className="font-medium">{match[1]}</strong> : <em key={match.index}>{match[2]}</em>);
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 ps-5">
        {list.map((item, i) => (
          <li key={i}>{inline(item)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (/^[-•]\s+/.test(trimmed)) {
      list.push(trimmed.replace(/^[-•]\s+/, ""));
      continue;
    }
    flush();
    if (trimmed) blocks.push(<p key={`p-${blocks.length}`}>{inline(trimmed)}</p>);
  }
  flush();
  return <>{blocks}</>;
}
