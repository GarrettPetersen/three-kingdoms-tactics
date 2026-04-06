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
 *   --audio <mode>       Audio: "mixed" = clip (game) audio + music (default); "music-only" = music only, no clip audio
 *   --title-lang <lang>  End title card language: "en" or "zh" (default: en). Use --no-title-card to skip.
 *
 * Example:
 *   node tools/export_trailer.js --clips-dir ./downloads --output my_trailer.mp4 --title-lang zh
 */

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');
const sharp = require('sharp');

const projectRoot = path.resolve(__dirname, '..');

// Use node-canvas to render tagline in Dogica (SVG @font-face is ignored by Sharp/librsvg)
function createTaglineImageWithCanvas(text, lang) {
  try {
    const { createCanvas, registerFont } = require('canvas');
    if (fs.existsSync(FONT_DOGICA_PATH)) {
      registerFont(FONT_DOGICA_PATH, { family: 'Dogica' });
    }
    if (lang === 'zh' && fs.existsSync(FONT_ZPIX_PATH)) {
      registerFont(FONT_ZPIX_PATH, { family: 'zpix' });
    }
    const w = TITLE_CARD_W;
    const h = 120;
    const canvas = createCanvas(w, h);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    const fontFamily = lang === 'zh' ? 'zpix, Dogica, sans-serif' : 'Dogica, sans-serif';
    const fontSize = lang === 'zh' ? 36 : TAGLINE_FONT_SIZE; // zpix at 36px fits better
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, w / 2, h / 2);
    return canvas.toBuffer('image/png');
  } catch (e) {
    console.warn('Canvas tagline failed (install canvas?), falling back to SVG:', e.message);
    return null;
  }
}

const TITLE_CARD = {
  en: {
    image: path.join(projectRoot, 'public', 'assets', 'misc', 'three_kingdoms_stratagem_title_new.png'),
    text: 'Wishlist it now on Steam'
  },
  zh: {
    image: path.join(projectRoot, 'public', 'assets', 'misc', '三国玄机.png'),
    text: '请在Steam上添加愿望单'
  }
};

const TITLE_CARD_DURATION = 5;
const TITLE_CARD_W = 1920;
const TITLE_CARD_H = 1080;
const TITLE_MAX_H = 520;   // max height for title image
const TAGLINE_Y = 820;     // baseline for "Wishlist..." text
const TAGLINE_FONT_SIZE = 48;
const FONT_DOGICA_PATH = path.join(projectRoot, 'src', 'fonts', 'dogicapixel.ttf');
const FONT_ZPIX_PATH = path.join(projectRoot, 'src', 'fonts', 'zpix.ttf');

// Steam trailer spec: up to 1920x1080, 30/60 fps, high bit rate (5,000+ Kbps), .mp4, H.264, AAC, 16:9
const STEAM_FPS = 30;
const STEAM_VIDEO_BITRATE = '6000k';   // 5,000+ Kbps required
const STEAM_VIDEO_MAXRATE = '8000k';
const STEAM_VIDEO_BUFSIZE = '12000k';
const STEAM_AUDIO_BITRATE = '192k';
const STEAM_AUDIO_CHANNELS = 2;        // stereo (Steam transcodes to stereo)

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
    audioMode: 'mixed',
    titleCard: true,
    titleLang: 'en'  // 'en' | 'zh'
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
    } else if (args[i] === '--title-lang' && args[i + 1]) {
      const v = args[++i].toLowerCase();
      out.titleLang = (v === 'zh' || v === 'en') ? v : out.titleLang;
    } else if (args[i] === '--no-title-card') {
      out.titleCard = false;
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

/** White-on-black title mask (same as intro): dark pixels -> white, light -> transparent. */
async function titleImageToWhiteOnBlack(imagePath) {
  const { data, info } = await sharp(imagePath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  for (let i = 0; i < data.length; i += channels) {
    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
    if (avg < 128) {
      data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; data[i + 3] = 255;
    } else {
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = 0;
    }
  }
  return sharp(data, { raw: { width, height, channels } }).png().toBuffer();
}

/** Build title card image (1920x1080): black bg, title (white on black, fill width, integer scale), tagline below in pixel font (Dogica/zpix). */
async function createTitleCardImage(outputPath, lang) {
  const cfg = TITLE_CARD[lang];
  if (!cfg || !fs.existsSync(cfg.image)) throw new Error('Title card image not found for lang ' + lang);

  const whiteOnBlack = await titleImageToWhiteOnBlack(cfg.image);
  const titleMeta = await sharp(whiteOnBlack).metadata();
  // Integer scale so title fits in card (1920x1080) and fills width when possible
  const maxTitleH = TITLE_CARD_H - 120 - 80;
  const scaleW = Math.floor(TITLE_CARD_W / titleMeta.width);
  const scaleH = Math.floor(maxTitleH / titleMeta.height);
  const scale = Math.max(1, Math.min(scaleW || 1, scaleH || 1));
  const tw = titleMeta.width * scale;
  const th = titleMeta.height * scale;
  const tx = Math.round((TITLE_CARD_W - tw) / 2);
  const ty = Math.round((TITLE_CARD_H - th) / 2 - 80);

  const titleResized = await sharp(whiteOnBlack)
    .resize(tw, th, { kernel: sharp.kernel.nearest })
    .toBuffer();

  // Prefer node-canvas so Dogica actually renders (Sharp's SVG renderer ignores @font-face)
  let textOverlay = createTaglineImageWithCanvas(cfg.text, lang);
  if (!textOverlay) {
    const textEscaped = cfg.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const fontFamily = lang === 'zh' ? "'PingFang SC', sans-serif" : "sans-serif";
    const textSvg = Buffer.from(
      `<svg width="${TITLE_CARD_W}" height="120" xmlns="http://www.w3.org/2000/svg">
        <text x="${TITLE_CARD_W / 2}" y="70" font-size="${TAGLINE_FONT_SIZE}" fill="white" text-anchor="middle" font-family="${fontFamily}">${textEscaped}</text>
      </svg>`
    );
    textOverlay = await sharp(textSvg).resize(TITLE_CARD_W, 120).toBuffer();
  }

  const blackBg = await sharp({
    create: { width: TITLE_CARD_W, height: TITLE_CARD_H, channels: 3, background: { r: 0, g: 0, b: 0 } }
  })
    .png()
    .toBuffer();

  await sharp(blackBg)
    .composite([
      { input: titleResized, left: tx, top: Math.max(0, ty) },
      { input: textOverlay, left: 0, top: TAGLINE_Y - 60 }
    ])
    .png()
    .toFile(outputPath);
}

async function main() {
  ensureFfmpeg();
  const { clipsDir, music, output, audioMode, titleCard, titleLang } = parseArgs();

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

  const finalOutput = output;
  const mainVideoPath = titleCard
    ? path.join(path.dirname(output), '.trailer_main_' + path.basename(output))
    : output;

  try {
    // Letterbox to 1080p: scale clip to fit 1920x1080 (nearest-neighbour for pixel art), add black bars.
    const videoFilter = '[0:v]scale=1080:1080:flags=neighbor,pad=1920:1080:(ow-iw)/2:0:black[vout]';
    let filterComplex;
    let maps;
    if (audioMode === 'music-only') {
      filterComplex = videoFilter;
      maps = ['-map', '[vout]', '-map', '1:a'];
    } else {
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
      '-stream_loop', '-1', '-i', music,
      '-filter_complex', filterComplex,
      ...maps,
      '-r', String(STEAM_FPS),
      '-c:v', 'libx264', '-preset', 'medium',
      '-b:v', STEAM_VIDEO_BITRATE, '-maxrate', STEAM_VIDEO_MAXRATE, '-bufsize', STEAM_VIDEO_BUFSIZE,
      '-c:a', 'aac', '-b:a', STEAM_AUDIO_BITRATE, '-ac', String(STEAM_AUDIO_CHANNELS),
      '-shortest',
      mainVideoPath
    ], { stdio: 'inherit' });

    if (titleCard) {
      const cfg = TITLE_CARD[titleLang];
      if (!cfg || !fs.existsSync(cfg.image)) {
        console.error('Title card image not found for lang', titleLang, ':', cfg ? cfg.image : 'no config');
        process.exit(1);
      }
      const titleCardPng = path.join(path.dirname(output), '.trailer_title_card.png');
      const titleCardPath = path.join(path.dirname(output), '.trailer_title_' + path.basename(output));
      try {
        await createTitleCardImage(titleCardPng, titleLang);
        execFileSync('ffmpeg', [
          '-y',
          '-loop', '1', '-t', String(TITLE_CARD_DURATION), '-i', titleCardPng,
          '-stream_loop', '-1', '-t', String(TITLE_CARD_DURATION), '-i', music,
          '-r', String(STEAM_FPS),
          '-map', '0:v', '-map', '1:a',
          '-c:v', 'libx264', '-preset', 'medium',
          '-b:v', STEAM_VIDEO_BITRATE, '-maxrate', STEAM_VIDEO_MAXRATE, '-bufsize', STEAM_VIDEO_BUFSIZE,
          '-c:a', 'aac', '-b:a', STEAM_AUDIO_BITRATE, '-ac', String(STEAM_AUDIO_CHANNELS),
          '-shortest',
          titleCardPath
        ], { stdio: 'inherit' });

        // Concat using filter (re-encode) so output has contiguous timestamps and full duration.
        // Concat demuxer + -c copy can produce non-monotonic DTS and some players cut off the tail.
        execFileSync('ffmpeg', [
          '-y',
          '-i', mainVideoPath,
          '-i', titleCardPath,
          '-filter_complex', '[0:v][0:a][1:v][1:a]concat=n=2:v=1:a=1[v][a]',
          '-map', '[v]', '-map', '[a]',
          '-r', String(STEAM_FPS),
          '-c:v', 'libx264', '-preset', 'medium',
          '-b:v', STEAM_VIDEO_BITRATE, '-maxrate', STEAM_VIDEO_MAXRATE, '-bufsize', STEAM_VIDEO_BUFSIZE,
          '-c:a', 'aac', '-b:a', STEAM_AUDIO_BITRATE, '-ac', String(STEAM_AUDIO_CHANNELS),
          finalOutput
        ], { stdio: 'inherit' });
      } finally {
        try { fs.unlinkSync(titleCardPng); } catch (_) {}
        try { fs.unlinkSync(titleCardPath); } catch (_) {}
        try { fs.unlinkSync(mainVideoPath); } catch (_) {}
      }
    }
    console.log('Wrote', finalOutput);
  } finally {
    try { fs.unlinkSync(listPath); } catch (_) {}
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
