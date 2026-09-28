function renderInline(text) {
  const tokens = [];
  const pattern = /(\*\*[^*]+\*\*)|(\*[^*]+\*)|(`[^`]+`)|(\[[^\]]+\]\([^)]*\))/g;
  let last = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      tokens.push(text.slice(last, match.index));
    }
    const token = match[0];
    const key = tokens.length;
    if (token.startsWith("**")) {
      tokens.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("[")) {
      const link = token.match(/^\[([^\]]+)\]\(([^)]*)\)$/);
      if (link) {
        tokens.push(
          <a
            key={key}
            href={link[2]}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            {link[1]}
          </a>
        );
      } else {
        tokens.push(token);
      }
    } else if (token.startsWith("`")) {
      tokens.push(
        <code
          key={key}
          className="rounded bg-black/30 px-1 py-0.5 font-mono text-xs text-primary"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else {
      tokens.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    last = match.index + token.length;
  }
  if (last < text.length) {
    tokens.push(text.slice(last));
  }
  return tokens;
}

export default function Markdown({ children }) {
  const text = String(children ?? "");
  const lines = text.split(/\r?\n/);
  const blocks = [];
  let list = null;
  let paragraph = [];

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push(<p key={`p${blocks.length}`}>{renderInline(paragraph.join(" "))}</p>);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (!list) return;
    const ListTag = list.ordered ? "ol" : "ul";
    const className = list.ordered
      ? "ml-4 list-decimal space-y-1"
      : "ml-4 list-disc space-y-1";
    blocks.push(
      <ListTag key={`l${blocks.length}`} className={className}>
        {list.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </ListTag>
    );
    list = null;
  };

  lines.forEach((raw) => {
    const line = raw.trimEnd();
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      flushParagraph();
      flushList();
      const level = Math.min(heading[1].length + 2, 5);
      const Tag = `h${level}`;
      blocks.push(<Tag key={`h${blocks.length}`}>{renderInline(heading[2])}</Tag>);
      return;
    }

    const bullet = line.match(/^([-*])\s+(.*)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const ordered = Boolean(numbered);
      const content = (numbered || bullet)[2];
      if (!list || list.ordered !== ordered) {
        flushList();
        list = { ordered, items: [] };
      }
      list.items.push(content);
      return;
    }

    if (!line.trim()) {
      flushParagraph();
      flushList();
      return;
    }

    flushList();
    paragraph.push(line);
  });

  flushParagraph();
  flushList();

  return <>{blocks}</>;
}
