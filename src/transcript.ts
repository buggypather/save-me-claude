// Turning Claude Code's transcript (one JSON object a line) into a readable Markdown file with
// everything in it: your messages, Claude's replies and thinking, every tool used and what it gave back.

type Block = { type?: string; text?: string; thinking?: string; name?: string; input?: unknown; content?: unknown; is_error?: boolean; tool_use_id?: string };
interface Line {
  type?: string;
  timestamp?: string;
  summary?: string;
  isMeta?: boolean;
  message?: { role?: string; content?: string | Block[]; model?: string };
}

const fence = (body: string, lang = '') => {
  const ticks = body.includes('```') ? '````' : '```';
  return `${ticks}${lang}\n${body.replace(/\s+$/, '')}\n${ticks}`;
};
function asText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => (typeof c === 'string' ? c : c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : JSON.stringify(c))).join('\n');
  return content === undefined ? '' : JSON.stringify(content, null, 2);
}
function time(ts?: string): string {
  if (!ts) return '';
  const d = new Date(ts);
  return Number.isNaN(d.getTime()) ? '' : ` · ${d.toLocaleTimeString()}`;
}

/** What one tool call was: the command for a shell, the file for a file tool, else its input. */
export function describeToolUse(name: string, input: unknown): string {
  const i = (input ?? {}) as Record<string, unknown>;
  if ((name === 'Bash' || name === 'PowerShell') && typeof i.command === 'string') return fence(i.command, name === 'Bash' ? 'bash' : 'powershell');
  if (typeof i.file_path === 'string' && name === 'Write') return `\`${i.file_path}\`\n\n${fence(String(i.content ?? ''))}`;
  if (typeof i.file_path === 'string' && name === 'Edit') return `\`${i.file_path}\`\n\nReplaced:\n${fence(String(i.old_string ?? ''))}\nWith:\n${fence(String(i.new_string ?? ''))}`;
  return fence(JSON.stringify(input, null, 2), 'json');
}

/** The whole conversation as Markdown. */
export function renderTranscript(jsonl: string, title: string): string {
  const out: string[] = [`# ${title}`, ''];
  for (const raw of jsonl.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    let line: Line;
    try {
      line = JSON.parse(raw) as Line;
    } catch {
      continue;
    }
    if (line.type === 'summary' && line.summary) {
      out.push(`> **Summary:** ${line.summary}`, '');
      continue;
    }
    const m = line.message;
    if (!m) continue;
    const who = m.role === 'assistant' ? `## Claude${time(line.timestamp)}` : `## You${time(line.timestamp)}`;
    const blocks: Block[] = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : (m.content ?? []);
    const parts: string[] = [];
    for (const b of blocks) {
      if (b.type === 'text' && b.text?.trim()) parts.push(b.text.trim());
      else if (b.type === 'thinking' && b.thinking?.trim()) parts.push(`<details><summary>Thinking</summary>\n\n${b.thinking.trim()}\n\n</details>`);
      else if (b.type === 'tool_use') parts.push(`**Used ${b.name}:**\n\n${describeToolUse(b.name ?? 'tool', b.input)}`);
      else if (b.type === 'tool_result') parts.push(`**${b.is_error ? 'Error' : 'Result'}:**\n\n${fence(asText(b.content))}`);
    }
    if (!parts.length) continue;
    // Tool results come back as "user" lines, but they're Claude's work, not yours.
    const onlyResults = blocks.length > 0 && blocks.every(b => b.type === 'tool_result');
    out.push(onlyResults ? `### Tool result${time(line.timestamp)}` : line.isMeta ? `## Note${time(line.timestamp)}` : who, '', parts.join('\n\n'), '');
  }
  return out.join('\n');
}
