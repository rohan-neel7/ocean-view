import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '../../');

const SENSITIVE_PATTERN = /(AIza[0-9A-Za-z-_]{35}|sk-[a-zA-Z0-9]{48}|pk_[a-zA-Z0-9]{24,}|rk_[a-zA-Z0-9]{24,}|Bearer\s[a-zA-Z0-9-._~+/]+=*)/i;

const IGNORED_DIRS = ['node_modules', '.git', 'dist', 'build', '.env', '.env.local', '.env.development'];
const IGNORED_FILES = ['package-lock.json', 'package.json', 'secretLeak.test.js']; // Don't flag this test file itself!

function walkSync(dir, filelist = []) {
  if (!fs.existsSync(dir)) return filelist;
  
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      if (!IGNORED_DIRS.includes(file)) {
        filelist = walkSync(dirFile, filelist);
      }
    } else {
      if (!IGNORED_FILES.includes(file) && (!file.startsWith('.env') || file === '.env.example')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
}

test('Source code should not contain hardcoded API keys or secrets', () => {
  const srcFiles = walkSync(path.join(PROJECT_ROOT, 'src'));
  const serverFiles = walkSync(path.join(PROJECT_ROOT, 'server'));

  const allFilesToScan = [...srcFiles, ...serverFiles];
  const leaks = [];

  for (const filePath of allFilesToScan) {
    const ext = path.extname(filePath);
    // Only scan text-based files
    if (['.js', '.jsx', '.json', '.md', '.css', '.html'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Strip out this specific pattern to avoid false positives in comments talking about the regex
        // E.g. skip if line contains the regex definition itself
        if (line.includes('SENSITIVE_PATTERN') || line.includes('/^(AIza|sk-|pk_|rk_|Bearer\\s)/')) return;
        
        const match = line.match(SENSITIVE_PATTERN);
        if (match) {
          leaks.push(`File: ${path.relative(PROJECT_ROOT, filePath)}:${index + 1} - Found potential secret: ${match[0].substring(0, 10)}...`);
        }
      });
    }
  }

  if (leaks.length > 0) {
    console.error('⚠️ SECRET LEAK DETECTED ⚠️');
    console.error(leaks.join('\n'));
    assert.fail(`Found ${leaks.length} hardcoded secrets in source code.`);
  } else {
    assert.ok(true, 'No hardcoded secrets found in source code.');
  }
});
