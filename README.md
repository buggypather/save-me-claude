# save-me-claude

Saves every Claude Code conversation to your own computer, in full: your messages, Claude's replies and thinking, and every tool it used with what came back. The code actions Claude took (each command it ran in Bash or PowerShell, with its output, and each file it wrote or edited) go in a matching folder beside it.

It runs in the background, so it never slows Claude down. It works on **Windows**, macOS and Linux.

## What you get

By default it saves into your home folder (`C:\Users\<you>` on Windows), one pair of folders a day:

```
C:\Users\you\
  claude-2026-11-21\                  the conversations
    15-48 my-project 0c9e6a2f.md        readable: everything said and done, in order
    15-48 my-project 0c9e6a2f.jsonl     the raw transcript, exactly as Claude Code keeps it
  claude-2026-11-21-files\            the code actions
    15-48 my-project 0c9e6a2f actions.md   every command (with its output) and file change, numbered
    15-48 my-project 0c9e6a2f scripts\
      001 Bash.sh
      002 PowerShell.ps1                   each command on its own, to look at or run again
```

- Each session is named by the time it started, its project folder and the start of its id.
- A session that runs past midnight stays in the day it started.
- The conversation file is rewritten as the session goes, so it's always complete up to the latest message.


### Your requests

Every message you send is also added, as you send it, to `requests.md` in that day's folder. It holds all your sessions in one list, with the time and session name. Slash commands show as typed (for example `/plugin install x`), and pasted pictures or files are marked. The full conversation files have your messages too, under **You**.

## Install

You need [Node.js](https://nodejs.org) 18 or newer. If you installed Claude Code with npm, you already have it.

**As a Claude Code plugin (recommended).** In Claude Code:

```
/plugin marketplace add buggypather/save-me-claude
/plugin install save-me-claude@save-me-claude
```

Then restart Claude Code. That's all: saving starts with your next message.

**By hand.** Clone the repo anywhere, run `npm install`, and add the hooks from `hooks/hooks.json` to your `~/.claude/settings.json`, replacing `${CLAUDE_PLUGIN_ROOT}` with the folder you cloned to.

## Changing where it saves

One short command:

```
npx save-me-claude where "D:\Claude logs"
```

From then on, the day folders go inside `D:\Claude logs`. The setting lives in `~/.save-me-claude.json`. The other commands:

```
npx save-me-claude where            show where it saves now
npx save-me-claude where --reset    back to your home folder
```

If `npx save-me-claude` isn't found (the plugin isn't published to npm), run the same command with Node from the plugin's folder: `node <plugin folder>/dist/cli.js where "D:\Claude logs"`.

You can also set the `SAVE_ME_CLAUDE_DIR` environment variable, which takes priority over the saved setting:

- **Windows (PowerShell):** `setx SAVE_ME_CLAUDE_DIR "D:\Claude logs"`, then open a new terminal.
- **macOS or Linux:** add `export SAVE_ME_CLAUDE_DIR="$HOME/claude-logs"` to your shell profile.

## Privacy

Everything stays on your computer; nothing is sent anywhere. The files hold everything from your sessions, including anything sensitive you or Claude typed or printed (keys, passwords in command output), so keep the folder somewhere private.

## If something goes wrong

A hook never stops Claude from working. Problems are written to `.save-me-claude-errors.log` in the save folder instead. If saving stops, look there, and open an issue with what it says.

## Contributing

Updates are welcome; see [CONTRIBUTING.md](CONTRIBUTING.md). MIT licensed.
