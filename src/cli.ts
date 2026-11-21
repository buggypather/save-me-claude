#!/usr/bin/env node
// save-me-claude where <folder>   save into <folder> from now on (it holds the day folders)
// save-me-claude where --reset    back to your home folder
// save-me-claude where            show where things are saved
import { resolve } from 'node:path';
import { CONFIG, saveRoot, setSaveRoot } from './shared.js';

const [cmd, arg] = process.argv.slice(2);
if (cmd === 'where') {
  if (arg === '--reset') {
    setSaveRoot(null);
    console.log(`Back to the default: ${saveRoot()}`);
  } else if (arg) {
    setSaveRoot(resolve(arg));
    console.log(`Conversations will be saved in ${saveRoot()} (setting kept in ${CONFIG}).`);
  } else console.log(`Saving in ${saveRoot()}${process.env.SAVE_ME_CLAUDE_DIR ? ' (from SAVE_ME_CLAUDE_DIR)' : ''}.`);
} else {
  console.log('save-me-claude where <folder>   choose where conversations are saved\nsave-me-claude where --reset    back to your home folder\nsave-me-claude where            show the folder');
}
