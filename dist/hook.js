#!/usr/bin/env node
// The hook Claude Code runs (async, so it never slows Claude down). On every event it rewrites the
// session's conversation file from the transcript, and for shell commands and file changes it adds
// to the day's actions log in the "-files" folder beside it.
import { appendFileSync, copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { actionEntry, isAction, scriptFor } from './actions.js';
import { dayFolder, ensureDir, filesFolder, safeName, saveRoot } from './shared.js';
import { renderTranscript, requestEntry } from './transcript.js';
/** Each session keeps the day it started in, even past midnight (kept in a small file in the root). */
function sessionPlace(root, id, cwd) {
    const statePath = join(root, '.save-me-claude-state.json');
    let state = {};
    try {
        state = JSON.parse(readFileSync(statePath, 'utf8'));
    }
    catch {
        // First time.
    }
    if (!state[id]) {
        const now = new Date();
        const p = (n) => String(n).padStart(2, '0');
        state[id] = { day: dayFolder(now), name: `${p(now.getHours())}-${p(now.getMinutes())} ${safeName(basename(cwd) || 'claude', 30)} ${id.slice(0, 8)}`, actions: 0 };
        // Old sessions (over 3 days) are forgotten so the file stays small.
        const cutoff = dayFolder(new Date(Date.now() - 3 * 86_400_000));
        for (const [k, v] of Object.entries(state))
            if (v.day < cutoff)
                delete state[k];
    }
    return { state, statePath, place: state[id] };
}
async function main() {
    let raw = '';
    for await (const chunk of process.stdin)
        raw += chunk;
    const input = JSON.parse(raw || '{}');
    const id = input.session_id ?? 'unknown';
    const root = saveRoot();
    const { state, statePath, place } = sessionPlace(root, id, input.cwd ?? '');
    const day = ensureDir(join(root, place.day));
    // Code actions: the log and, for commands, their own script files.
    if ((input.hook_event_name === 'PostToolUse' || input.hook_event_name === 'PostToolUseFailure') && isAction(input.tool_name)) {
        const files = ensureDir(join(root, filesFolder(place.day)));
        place.actions += 1;
        const log = join(files, `${place.name} actions.md`);
        if (!existsSync(log))
            writeFileSync(log, `# Actions Claude took · ${place.name}\n\nCommands run and files changed on this computer.\n\n`);
        appendFileSync(log, actionEntry(input, place.actions, new Date()) + '\n');
        const script = scriptFor(input, place.actions);
        if (script)
            writeFileSync(join(ensureDir(join(files, `${place.name} scripts`)), script.name), script.body);
    }
    writeFileSync(statePath, JSON.stringify(state, null, 1));
    // Your requests: every message you send, in one list for the day (all sessions), as you send it.
    if (input.hook_event_name === 'UserPromptSubmit' && input.prompt)
        appendFileSync(join(day, 'requests.md'), requestEntry(input.prompt, place.name, new Date()));
    // The conversation: the full transcript, readable and raw.
    if (input.transcript_path && existsSync(input.transcript_path)) {
        const jsonl = readFileSync(input.transcript_path, 'utf8');
        writeFileSync(join(day, `${place.name}.md`), renderTranscript(jsonl, `Claude conversation · ${place.name}`));
        copyFileSync(input.transcript_path, join(day, `${place.name}.jsonl`));
    }
    else if (input.hook_event_name === 'UserPromptSubmit' && input.prompt) {
        // No transcript yet: keep the prompt at least.
        appendFileSync(join(day, `${place.name}.md`), `## You · ${new Date().toLocaleTimeString()}\n\n${input.prompt}\n\n`);
    }
}
// A hook must never get in Claude's way: any problem is written to a log and ignored.
main().catch(err => {
    try {
        appendFileSync(join(saveRoot(), '.save-me-claude-errors.log'), `${new Date().toISOString()} ${err instanceof Error ? err.stack : String(err)}\n`);
    }
    catch {
        // Nowhere to write: give up quietly.
    }
});
