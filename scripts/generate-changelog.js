import { execSync } from 'child_process';

const CATEGORIES = [
  { types: ['feat'], emoji: '🚀', heading: 'Features' },
  { types: ['fix'], emoji: '🐛', heading: 'Bug Fixes' },
  { types: ['design'], emoji: '🎨', heading: 'Design' },
  { types: ['refactor'], emoji: '🔧', heading: 'Refactoring' },
  { types: ['style'], emoji: '💄', heading: 'Style' },
  { types: ['perf'], emoji: '⚡', heading: 'Performance' },
  { types: ['docs'], emoji: '📖', heading: 'Documentation' },
  { types: ['test'], emoji: '🧪', heading: 'Tests' },
  { types: ['ci', 'build'], emoji: '👷', heading: 'CI / Build' },
  { types: ['chore', 'other'], emoji: '🛠️', heading: 'Chores' },
];

function exec(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim();
}

function getPreviousTag() {
  try {
    return exec('git describe --tags --abbrev=0 2>nul');
  } catch {
    return null;
  }
}

function getCommitsSinceTag(tag) {
  const range = tag ? `${tag}..HEAD` : 'HEAD';
  const format = '%s|||%h|||%an';
  try {
    const raw = exec(`git log ${range} --no-merges --format="${format}"`);
    return raw.split('\n').filter(Boolean).map((line) => {
      const [subject, hash, author] = line.split('|||');
      return { subject: subject.trim(), hash: hash.trim(), author: author.trim() };
    });
  } catch {
    return [];
  }
}

function parseCommit(subject) {
  const conventional = /^(\w+)(?:\(([^)]*)\))?:\s*(.*)$/;
  const match = subject.match(conventional);
  if (match) {
    return { type: match[1].toLowerCase(), scope: match[2] || null, description: match[3] };
  }
  return { type: 'other', scope: null, description: subject };
}

function buildChangelog(commits, newVersion) {
  const grouped = {};
  const knownTypes = new Set();
  for (const { types } of CATEGORIES) {
    for (const type of types) {
      grouped[type] = [];
      knownTypes.add(type);
    }
  }

  const unknown = [];

  for (const commit of commits) {
    const parsed = parseCommit(commit.subject);
    if (knownTypes.has(parsed.type)) {
      grouped[parsed.type].push({ ...commit, ...parsed });
    } else {
      unknown.push(commit);
    }
  }

  const lines = [`## AeroNotch v${newVersion}\n`];

  for (const category of CATEGORIES) {
    const entries = category.types.flatMap((t) => grouped[t] || []);
    if (entries.length === 0) continue;

    lines.push(`### ${category.emoji} ${category.heading}\n`);
    for (const entry of entries) {
      const scope = entry.scope ? `**${entry.scope}:** ` : '';
      lines.push(`- ${scope}${entry.description} (\`${entry.hash}\`)`);
    }
    lines.push('');
  }

  if (unknown.length > 0) {
    lines.push(`### 📦 Other`);
    for (const entry of unknown) {
      lines.push(`- ${entry.description || entry.subject} (\`${entry.hash}\`)`);
    }
    lines.push('');
  }

  if (lines.length <= 2) {
    lines.push('_No notable changes in this release._');
  }

  return lines.join('\n');
}

// --- Main ---
const newVersion = process.argv[2];
if (!newVersion) {
  console.error('Usage: node generate-changelog.js <newVersion>');
  process.exit(1);
}

const prevTag = getPreviousTag();
const commits = getCommitsSinceTag(prevTag);
const changelog = buildChangelog(commits, newVersion);

// Output both the changelog text and the raw commit count for workflow use
console.log(changelog);
