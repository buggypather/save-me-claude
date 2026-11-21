import { describe, expect, it } from 'vitest';
import { actionEntry, scriptFor } from '../src/actions';
import { dayFolder, filesFolder, safeName } from '../src/shared';
import { renderTranscript } from '../src/transcript';

const jsonl = [
  { type: 'user', timestamp: '2026-11-21T15:00:00Z', message: { role: 'user', content: 'Make hello.txt' } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'thinking', thinking: 'Easy.' }, { type: 'text', text: 'Doing it.' }, { type: 'tool_use', name: 'Bash', input: { command: 'echo hi > hello.txt' } }] } },
  { type: 'user', message: { role: 'user', content: [{ type: 'tool_result', content: 'done' }] } },
  { type: 'assistant', message: { role: 'assistant', content: [{ type: 'text', text: 'Made it.' }] } },
  'not json',
].map(l => (typeof l === 'string' ? l : JSON.stringify(l))).join('\n');

describe('save-me-claude', () => {
  it('names the folders', () => {
    expect(dayFolder(new Date(2026, 10, 21, 23, 59))).toBe('claude-2026-11-21');
    expect(filesFolder('claude-2026-11-21')).toBe('claude-2026-11-21-files');
    expect(safeName('C:\\my:project?')).toBe('C my project');
  });
  it('writes every part of the conversation', () => {
    const md = renderTranscript(jsonl, 'Test');
    expect(md).toContain('## You');
    expect(md).toContain('Make hello.txt');
    expect(md).toContain('<summary>Thinking</summary>');
    expect(md).toContain('**Used Bash:**');
    expect(md).toContain('echo hi > hello.txt');
    expect(md).toContain('### Tool result');
    expect(md).toContain('Made it.');
  });
  it('logs commands and keeps them as scripts', () => {
    const e = { tool_name: 'PowerShell', tool_input: { command: 'Get-ChildItem', description: 'List files' }, tool_response: { stdout: 'a.txt' }, cwd: 'C:\\x' };
    const entry = actionEntry(e, 3, new Date());
    expect(entry).toContain('## 3. PowerShell');
    expect(entry).toContain('Get-ChildItem');
    expect(entry).toContain('a.txt');
    expect(scriptFor(e, 3)).toEqual({ name: '003 PowerShell.ps1', body: '# Run by Claude in C:\\x: List files\nGet-ChildItem\n' });
    expect(scriptFor({ tool_name: 'Write', tool_input: {} }, 4)).toBeNull();
  });
});
