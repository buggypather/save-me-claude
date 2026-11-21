// The pieces both the hook and the command line use: where things are saved, and reading a hook's input.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
/** Where the setting is kept (one small file in your home folder). */
export const CONFIG = join(homedir(), '.save-me-claude.json');
/**
 * The folder the day folders go in: SAVE_ME_CLAUDE_DIR if set, else the one chosen with
 * `save-me-claude where <folder>`, else your home folder (C:\Users\<you> on Windows).
 */
export function saveRoot() {
    if (process.env.SAVE_ME_CLAUDE_DIR)
        return process.env.SAVE_ME_CLAUDE_DIR;
    try {
        const c = JSON.parse(readFileSync(CONFIG, 'utf8'));
        if (c.root)
            return c.root;
    }
    catch {
        // No setting yet.
    }
    return homedir();
}
export function setSaveRoot(root) {
    writeFileSync(CONFIG, JSON.stringify(root ? { root } : {}, null, 2));
}
/** "claude-2026-11-21" for a date (local time). */
export function dayFolder(d) {
    const p = (n) => String(n).padStart(2, '0');
    return `claude-${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
export const filesFolder = (day) => `${day}-files`;
export function ensureDir(path) {
    if (!existsSync(path))
        mkdirSync(path, { recursive: true });
    return path;
}
/** A safe piece of a file name. */
export function safeName(s, max = 40) {
    return s.replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max).replace(/[. ]+$/, '') || 'session';
}
