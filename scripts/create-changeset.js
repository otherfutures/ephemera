#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { randomBytes } from 'crypto';

// Get the last git tag
function getLastTag() {
  try {
    return execSync('git describe --tags --abbrev=0', { encoding: 'utf-8' }).trim();
  } catch (error) {
    // If no tags exist, use the first commit
    try {
      return execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      console.error('Error: Could not find any commits in the repository');
      process.exit(1);
    }
  }
}

// Get all commit messages since the last tag
function getCommitsSinceTag(tag) {
  try {
    const commits = execSync(`git log ${tag}..HEAD --pretty=format:"- %s"`, {
      encoding: 'utf-8',
    }).trim();
    return commits || '- No commits since last tag';
  } catch (error) {
    console.error('Error getting commits:', error.message);
    return '- Error retrieving commits';
  }
}

// Generate a random changeset filename
function generateChangesetId() {
  return randomBytes(4).toString('hex');
}

// Create the changeset file
function createChangesetFile(summary) {
  const changesetId = generateChangesetId();
  const changesetDir = join(process.cwd(), '.changeset');
  const changesetPath = join(changesetDir, `${changesetId}.md`);

  // Ensure .changeset directory exists
  mkdirSync(changesetDir, { recursive: true });

  const changesetContent = `---
"@ephemera/api": patch
"@ephemera/web": patch
"@ephemera/shared": patch
---

${summary}
`;

  writeFileSync(changesetPath, changesetContent);
  return changesetPath;
}

// Open editor for the user to edit the changeset
function openEditor(filePath) {
  return new Promise((resolve, reject) => {
    const editor = process.env.EDITOR || process.env.VISUAL || 'vi';
    const child = spawn(editor, [filePath], {
      stdio: 'inherit',
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
}

// Main execution
async function main() {
  console.log('Creating changeset with commit messages since last tag...\n');

  const lastTag = getLastTag();
  console.log(`Last tag: ${lastTag}\n`);

  const commits = getCommitsSinceTag(lastTag);
  console.log('Commits since last tag:');
  console.log(commits);
  console.log();

  // Create the changeset file with prefilled commits
  const changesetPath = createChangesetFile(commits);
  console.log(`Created changeset file: ${changesetPath}`);
  console.log('Opening editor for you to review and edit...\n');

  try {
    await openEditor(changesetPath);
    console.log('\nChangeset created successfully!');
    console.log('Run "pnpm changeset:status" to see pending changesets.');
  } catch (error) {
    console.error('Error opening editor:', error.message);
    console.log(`\nYou can manually edit the file at: ${changesetPath}`);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
