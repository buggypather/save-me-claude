// The code actions Claude took on your computer: every shell command (Bash, PowerShell) with
// what it printed, and every file written or edited. Each command is also kept as its own script
// file, numbered, so it can be looked at or run again.

export interface ToolEvent {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
  tool_response?: unknown;
  error?: string;
  cwd?: string;
  duration_ms?: number;
}

const SHELLS = new Set(['Bash', 'PowerShell']);
const FILES = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
export const isAction = (tool?: string) => !!tool && (SHELLS.has(tool) || FILES.has(tool));

function output(resp: unknown): string {
  if (typeof resp === 'string') return resp;
  if (resp && typeof resp === 'object') {
    const r = resp as Record<string, unknown>;
    const pieces = [r.stdout, r.stderr, r.output].filter(x => typeof x === 'string' && x) as string[];
    if (pieces.length) return pieces.join('\n');
  }
  return resp === undefined ? '' : JSON.stringify(resp, null, 2);
}

/** One action as a Markdown entry for the day's actions log. */
export function actionEntry(e: ToolEvent, n: number, at: Date): string {
  const i = e.tool_input ?? {};
  const head = `## ${n}. ${e.tool_name} · ${at.toLocaleTimeString()}${e.cwd ? ` · in \`${e.cwd}\`` : ''}${e.duration_ms !== undefined ? ` · ${e.duration_ms} ms` : ''}`;
  const lines = [head, ''];
  if (SHELLS.has(e.tool_name ?? '')) {
    if (typeof i.description === 'string') lines.push(`_${i.description}_`, '');
    lines.push('```' + (e.tool_name === 'Bash' ? 'bash' : 'powershell'), String(i.command ?? ''), '```', '');
    const out = e.error ?? output(e.tool_response);
    if (out.trim()) lines.push(e.error ? '**Failed:**' : '**Output:**', '', '```', out.replace(/\s+$/, ''), '```', '');
  } else {
    lines.push(`File: \`${String(i.file_path ?? i.notebook_path ?? '')}\``, '');
    if (e.tool_name === 'Write') lines.push('Wrote:', '', '```', String(i.content ?? ''), '```', '');
    if (e.tool_name === 'Edit') lines.push('Replaced:', '', '```', String(i.old_string ?? ''), '```', '', 'With:', '', '```', String(i.new_string ?? ''), '```', '');
    if (e.tool_name === 'MultiEdit') lines.push('```json', JSON.stringify(i.edits ?? [], null, 2), '```', '');
    if (e.error) lines.push(`**Failed:** ${e.error}`, '');
  }
  return lines.join('\n');
}

/** A shell command as its own script ("003 Bash.sh" / "004 PowerShell.ps1"); null for file actions. */
export function scriptFor(e: ToolEvent, n: number): { name: string; body: string } | null {
  if (!SHELLS.has(e.tool_name ?? '')) return null;
  const cmd = String(e.tool_input?.command ?? '');
  const ps = e.tool_name === 'PowerShell';
  const note = `${ps ? '#' : '#'} Run by Claude${e.cwd ? ` in ${e.cwd}` : ''}${typeof e.tool_input?.description === 'string' ? `: ${e.tool_input.description}` : ''}`;
  return { name: `${String(n).padStart(3, '0')} ${e.tool_name}.${ps ? 'ps1' : 'sh'}`, body: `${ps ? '' : '#!/usr/bin/env bash\n'}${note}\n${cmd}\n` };
}
