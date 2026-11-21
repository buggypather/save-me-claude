// Turning Claude Code's transcript (one JSON object a line) into a readable Markdown file with
// everything in it: your messages, Claude's replies and thinking, every tool used and what it gave back.
const fence = (body, lang = '') => {
    const ticks = body.includes('```') ? '````' : '```';
    return `${ticks}${lang}\n${body.replace(/\s+$/, '')}\n${ticks}`;
};
function asText(content) {
    if (typeof content === 'string')
        return content;
    if (Array.isArray(content))
        return content.map(c => (typeof c === 'string' ? c : c && typeof c === 'object' && 'text' in c ? String(c.text) : JSON.stringify(c))).join('\n');
    return content === undefined ? '' : JSON.stringify(content, null, 2);
}
function time(ts) {
    if (!ts)
        return '';
    const d = new Date(ts);
    return Number.isNaN(d.getTime()) ? '' : ` · ${d.toLocaleTimeString()}`;
}
/** What one tool call was: the command for a shell, the file for a file tool, else its input. */
export function describeToolUse(name, input) {
    const i = (input ?? {});
    if ((name === 'Bash' || name === 'PowerShell') && typeof i.command === 'string')
        return fence(i.command, name === 'Bash' ? 'bash' : 'powershell');
    if (typeof i.file_path === 'string' && name === 'Write')
        return `\`${i.file_path}\`\n\n${fence(String(i.content ?? ''))}`;
    if (typeof i.file_path === 'string' && name === 'Edit')
        return `\`${i.file_path}\`\n\nReplaced:\n${fence(String(i.old_string ?? ''))}\nWith:\n${fence(String(i.new_string ?? ''))}`;
    return fence(JSON.stringify(input, null, 2), 'json');
}
/** Slash commands and other tagged text in your messages, made readable. */
export function tidyUserText(t) {
    const cmd = /<command-name>([\s\S]*?)<\/command-name>/.exec(t);
    if (cmd) {
        const args = /<command-args>([\s\S]*?)<\/command-args>/.exec(t)?.[1]?.trim();
        return `\`${cmd[1].trim()}${args ? ' ' + args : ''}\``;
    }
    const out = /<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/.exec(t);
    if (out)
        return fence(out[1].trim());
    return t;
}
/** One entry for the day's requests.md. */
export function requestEntry(prompt, session, at) {
    return `### ${at.toLocaleTimeString()} · ${session}\n\n${tidyUserText(prompt.trim())}\n\n`;
}
/** The whole conversation as Markdown. */
export function renderTranscript(jsonl, title) {
    const out = [`# ${title}`, ''];
    for (const raw of jsonl.split(/\r?\n/)) {
        if (!raw.trim())
            continue;
        let line;
        try {
            line = JSON.parse(raw);
        }
        catch {
            continue;
        }
        if (line.type === 'summary' && line.summary) {
            out.push(`> **Summary:** ${line.summary}`, '');
            continue;
        }
        const m = line.message;
        if (!m)
            continue;
        const who = m.role === 'assistant' ? `## Claude${time(line.timestamp)}` : `## You${time(line.timestamp)}`;
        const blocks = typeof m.content === 'string' ? [{ type: 'text', text: m.content }] : (m.content ?? []);
        const parts = [];
        for (const b of blocks) {
            if (b.type === 'text' && b.text?.trim())
                parts.push(m.role === 'assistant' ? b.text.trim() : tidyUserText(b.text.trim()));
            else if (b.type === 'image')
                parts.push('_[picture attached]_');
            else if (b.type === 'document')
                parts.push('_[file attached]_');
            else if (b.type === 'thinking' && b.thinking?.trim())
                parts.push(`<details><summary>Thinking</summary>\n\n${b.thinking.trim()}\n\n</details>`);
            else if (b.type === 'tool_use')
                parts.push(`**Used ${b.name}:**\n\n${describeToolUse(b.name ?? 'tool', b.input)}`);
            else if (b.type === 'tool_result')
                parts.push(`**${b.is_error ? 'Error' : 'Result'}:**\n\n${fence(asText(b.content))}`);
        }
        if (!parts.length)
            continue;
        // Tool results come back as "user" lines, but they're Claude's work, not yours.
        const onlyResults = blocks.length > 0 && blocks.every(b => b.type === 'tool_result');
        out.push(onlyResults ? `### Tool result${time(line.timestamp)}` : line.isMeta ? `## Note${time(line.timestamp)}` : who, '', parts.join('\n\n'), '');
    }
    return out.join('\n');
}
