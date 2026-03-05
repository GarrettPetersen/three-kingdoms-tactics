#!/usr/bin/env node
/**
 * Normalize loudness of all voice OGG files to a target LUFS (dialogue).
 * Uses ffmpeg loudnorm (two-pass) so every line plays at a consistent level.
 *
 * Usage:
 *   node tools/normalize_voice_loudness.js [options]
 *
 * Options:
 *   --target-lufs <number>   Target integrated loudness in LUFS (default: -16)
 *   --voices-dir <path>      Root of voices (default: public/assets/audio/voices)
 *   --dry-run                Print what would be done, do not overwrite files
 *   --limit <n>              Process at most n files (for testing)
 *
 * Requires ffmpeg on PATH.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync, spawnSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

const EXTRA_PATHS = [
  '/opt/homebrew/bin',
  '/usr/local/bin',
  '/opt/local/bin'
].filter(p => fs.existsSync(p));
if (EXTRA_PATHS.length) {
  process.env.PATH = EXTRA_PATHS.join(path.delimiter) + path.delimiter + (process.env.PATH || '');
}

function ensureFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe', env: process.env });
  } catch (_) {
    console.error('ffmpeg is not installed or not on PATH.');
    console.error('Install: brew install ffmpeg');
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    targetLufs: -16,
    voicesDir: path.join(projectRoot, 'public', 'assets', 'audio', 'voices'),
    dryRun: false,
    limit: null
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target-lufs' && args[i + 1] != null) {
      out.targetLufs = parseFloat(args[++i], 10);
    } else if (args[i] === '--voices-dir' && args[i + 1]) {
      out.voicesDir = path.resolve(args[++i]);
    } else if (args[i] === '--dry-run') {
      out.dryRun = true;
    } else if (args[i] === '--limit' && args[i + 1] != null) {
      out.limit = parseInt(args[++i], 10);
    }
  }
  return out;
}

function findOggFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      out.push(...findOggFiles(full));
    } else if (name.endsWith('.ogg')) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Run ffmpeg loudnorm first pass; returns parsed JSON with input_* and target_offset.
 */
function measureLoudness(filePath, targetLufs) {
  const I = targetLufs;
  const TP = -1.5;
  const LRA = 11;
  const result = spawnSync('ffmpeg', [
    '-i', filePath,
    '-af', `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}:print_format=json`,
    '-f', 'null', '-'
  ], { encoding: 'utf8', env: process.env, maxBuffer: 4 * 1024 * 1024 });
  const stderr = (result.stderr || '').toString();
  const jsonMatch = stderr.match(/\{\s*"input_i"[\s\S]*?"target_offset"[\s\S]*?\}/);
  if (!jsonMatch) {
    if (result.status !== 0) console.error(filePath, 'loudnorm measure failed:', stderr.slice(-400));
    return null;
  }
  try {
    return JSON.parse(jsonMatch[0]);
  } catch (_) {
    return null;
  }
}

/**
 * Apply loudnorm second pass with measured values; write to output path.
 * FFmpeg expects measured_* and offset from the first-pass JSON (input_* -> measured_*, target_offset -> offset).
 */
function applyLoudness(filePath, outputPath, targetLufs, measured) {
  if (!measured || measured.input_i == null) return false;
  const I = targetLufs;
  const TP = -1.5;
  const LRA = 11;
  const args = [
    '-y', '-i', filePath,
    '-af', [
      `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}`,
      `measured_I=${measured.input_i}`,
      `measured_TP=${measured.input_tp}`,
      `measured_LRA=${measured.input_lra}`,
      `measured_thresh=${measured.input_thresh}`,
      `offset=${measured.target_offset}`,
      'linear=true'
    ].join(':'),
    '-c:a', 'libopus', '-b:a', '64k',
    outputPath
  ];
  try {
    execFileSync('ffmpeg', args, { stdio: 'pipe', env: process.env, maxBuffer: 10 * 1024 * 1024 });
    return true;
  } catch (e) {
    console.error('ffmpeg apply failed:', e.message);
    return false;
  }
}

function main() {
  ensureFfmpeg();
  const { targetLufs, voicesDir, dryRun } = parseArgs();

  const files = findOggFiles(voicesDir);
  if (files.length === 0) {
    console.log('No .ogg files under', voicesDir);
    return;
  }

  console.log(`Target loudness: ${targetLufs} LUFS`);
  console.log(`Found ${files.length} voice file(s)`);
  if (dryRun) console.log('(dry run – no files will be changed)\n');

  let done = 0;
  let failed = 0;
  for (const filePath of files) {
    const rel = path.relative(projectRoot, filePath);
    const measured = measureLoudness(filePath, targetLufs);
    if (!measured) {
      failed++;
      continue;
    }
    const inputI = parseFloat(measured.input_i, 10);
    const delta = Math.abs(inputI - targetLufs);
    if (delta < 0.5) {
      if (!dryRun) console.log(`  [skip] ${rel} (already ~${inputI.toFixed(1)} LUFS)`);
      done++;
      continue;
    }
    if (dryRun) {
      console.log(`  [would normalize] ${rel} ${inputI.toFixed(1)} -> ${targetLufs} LUFS`);
      done++;
      continue;
    }
    const tmpPath = filePath + '.norm.ogg';
    if (applyLoudness(filePath, tmpPath, targetLufs, measured)) {
      fs.renameSync(tmpPath, filePath);
      console.log(`  ${rel} ${inputI.toFixed(1)} -> ${targetLufs} LUFS`);
      done++;
    } else {
      if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);
      failed++;
    }
  }

  console.log(`\nDone: ${done} processed, ${failed} failed.`);
}

main();
