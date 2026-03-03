#!/usr/bin/env node
/**
 * Concatenate trailer clip WebMs and mix in a music track.
 * Requires ffmpeg on PATH.
 *
 * Usage:
 *   node tools/export_trailer.js [options]
 *
 * Options:
 *   --clips-dir <path>   Directory containing trailer_clip_001.webm, etc. (default: current dir)
 *   --music <path>       Music file to lay over the whole video (default: public/assets/music/campaign_loop.ogg)
 *   --output <path>      Output MP4 path (default: trailer_export.mp4)
 *   --audio <mode>       Audio: "music-only" = overlay music only (no clip audio, use when clips have game music);
 *                        "mixed" = clip audio + music (default if clips have no game music)
 *
 * Example:
 *   node tools/export_trailer.js --clips-dir ./downloads --output my_trailer.mp4 --audio music-only
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

const projectRoot = path.resolve(__dirname, '..');

// Prepend common ffmpeg install locations so it's found when run from IDE or minimal PATH
const EXTRA_PATHS = [
  '/opt/homebrew/bin',   // macOS Apple Silicon Homebrew
  '/usr/local/bin',      // macOS Intel Homebrew, Linux
  '/opt/local/bin'       // macOS MacPorts
].filter(p => fs.existsSync(p));
if (EXTRA_PATHS.length) {
  process.env.PATH = EXTRA_PATHS.join(path.delimiter) + path.delimiter + (process.env.PATH || '');
}

function ensureFfmpeg() {
  try {
    execSync('ffmpeg -version', { stdio: 'pipe', env: process.env });
  } catch (_) {
    console.error('ffmpeg is not installed or not on PATH.');
    console.error('Install it and try again, e.g.:');
    console.error('  macOS (Homebrew): brew install ffmpeg');
    console.error('  Windows (scoop):  scoop install ffmpeg');
    process.exit(1);
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  const out = {
    clipsDir: process.cwd(),
    music: path.join(projectRoot, 'public', 'assets', 'music', 'campaign_loop.ogg'),
    output: path.join(projectRoot, 'trailer_export.mp4'),
    audioMode: 'music-only'  // 'music-only' = overlay music only (default; use when clips have game music); 'mixed' = clip audio + music
  };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--clips-dir' && args[i + 1]) {
      out.clipsDir = path.resolve(args[++i]);
    } else if (args[i] === '--music' && args[i + 1]) {
      out.music = path.resolve(args[++i]);
    } else if (args[i] === '--output' && args[i + 1]) {
      out.output = path.resolve(args[++i]);
    } else if (args[i] === '--audio' && args[i + 1]) {
      const v = args[++i].toLowerCase();
      out.audioMode = (v === 'mixed' || v === 'music-only') ? v : out.audioMode;
    }
  }
  return out;
}

function findClips(clipsDir) {
  if (!fs.existsSync(clipsDir)) {
    console.error('Clips dir not found:', clipsDir);
    process.exit(1);
  }
  const files = fs.readdirSync(clipsDir);
  const match = /^trailer_clip_(\d+)\.webm$/i;
  const numbered = files
    .filter(f => match.test(f))
    .map(f => ({ name: f, n: parseInt(match.exec(f)[1], 10) }))
    .sort((a, b) => a.n - b.n);
  return numbered.map(x => path.join(clipsDir, x.name));
}

function main() {
  ensureFfmpeg();
  const { clipsDir, music, output, audioMode } = parseArgs();

  const clips = findClips(clipsDir);
  if (clips.length === 0) {
    console.error('No trailer_clip_*.webm files found in', clipsDir);
    process.exit(1);
  }

  if (!fs.existsSync(music)) {
    console.error('Music file not found:', music);
    process.exit(1);
  }

  const listPath = path.join(clipsDir, '.trailer_concat_list.txt');
  const listContent = clips
    .map(f => `file '${path.resolve(f).replace(/\\/g, '/').replace(/'/g, "'\\''")}'`)
    .join('\n');
  fs.writeFileSync(listPath, listContent, 'utf8');

  try {
    // Concat video from clips; upscale to 1080p (nearest-neighbour for pixel art).
    const videoFilter = '[0:v]scale=1920:1080:flags=neighbor[vout]';
    let filterComplex;
    let maps;
    if (audioMode === 'music-only') {
      // Use overlay music only (no clip audio) — use when clips already contain game music
      filterComplex = videoFilter;
      maps = ['-map', '[vout]', '-map', '1:a'];
    } else {
      // Mixed: clip audio louder than music
      filterComplex = [
        videoFilter,
        '[0:a]volume=1.8[aclip]',
        '[1:a]volume=0.4[amusic]',
        '[aclip][amusic]amix=inputs=2:duration=first[aout]'
      ].join(';');
      maps = ['-map', '[vout]', '-map', '[aout]'];
    }
    execFileSync('ffmpeg', [
      '-y',
      '-f', 'concat', '-safe', '0', '-i', listPath,
      '-i', music,
      '-filter_complex', filterComplex,
      ...maps,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-c:a', 'aac', '-b:a', '192k',
      '-shortest',
      output
    ], { stdio: 'inherit' });
    console.log('Wrote', output);
  } finally {
    try { fs.unlinkSync(listPath); } catch (_) {}
  }
}

main();
