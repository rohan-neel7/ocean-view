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

test('Repository files should not contain hardcoded API keys or secrets', () => {
  const scanDirs = ['src', 'server', 'tests', 'scripts', 'docs'];
  const allFilesToScan = [];

  for (const dir of scanDirs) {
    allFilesToScan.push(...walkSync(path.join(PROJECT_ROOT, dir)));
  }

  // Also scan root config/entry files
  const rootEntries = fs.readdirSync(PROJECT_ROOT, { withFileTypes: true });
  for (const entry of rootEntries) {
    if (entry.isFile() && !IGNORED_FILES.includes(entry.name) && (!entry.name.startsWith('.env') || entry.name === '.env.example')) {
      const ext = path.extname(entry.name);
      if (['.js', '.jsx', '.json', '.md', '.html'].includes(ext)) {
        allFilesToScan.push(path.join(PROJECT_ROOT, entry.name));
      }
    }
  }

  const leaks = [];

  for (const filePath of allFilesToScan) {
    const ext = path.extname(filePath);
    if (['.js', '.jsx', '.json', '.md', '.css', '.html'].includes(ext)) {
      const content = fs.readFileSync(filePath, 'utf8');
      
      const lines = content.split('\n');
      lines.forEach((line, index) => {
        // Strip out regex definitions and check lines to avoid false positives
        if (
          line.includes('SENSITIVE_PATTERN') ||
          line.includes('AIza') && (line.includes('startsWith') || line.includes('test(') || line.includes('/^(')) ||
          line.includes('MOCK_') ||
          line.includes('mock_')
        ) return;
        
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
    assert.fail(`Found ${leaks.length} hardcoded secrets in repository files.`);
  } else {
    assert.ok(true, 'No hardcoded secrets found in repository files.');
  }
});
