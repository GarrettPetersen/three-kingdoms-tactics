import { promises as fs } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ROOT = process.cwd();
const DIST_DIR = path.join(ROOT, 'dist');
const OUTPUT_ZIP = path.resolve(
    ROOT,
    process.argv[2] || 'build/three-kingdoms-stratagem-demo-itch.zip'
);

const ITCH_LIMITS = {
    maxFiles: 1000,
    maxPathLength: 240,
    maxExtractedBytes: 500 * 1024 * 1024,
    maxSingleFileBytes: 200 * 1024 * 1024
};

const EXCLUDED_PREFIXES = [
    'assets/all_sound_effects/',
    'assets/all_songs/',
    'assets/voice_samples/',
    'assets/audio/voices/zh/',
    'assets/audio/voices/en/ch2_',
    'assets/audio/voices/en/map_lb_ch2_',
    'assets/portraits/snes_raw/',
    'assets/portraits/img2img_refs/',
    'assets/portraits/character_creator/',
    'assets/portraits/female_character_creator/',
    'assets/portraits/stylized/',
    'assets/portraits/generated/',
    'assets/portraits/generated_replacements/',
    'assets/portraits/large_sources/'
];

const EXCLUDED_SUFFIXES = [
    '.DS_Store',
    '.aseprite'
];

function toZipPath(filePath) {
    return filePath.split(path.sep).join('/');
}

function shouldInclude(zipPath) {
    if (EXCLUDED_SUFFIXES.some(suffix => zipPath.endsWith(suffix))) return false;
    return !EXCLUDED_PREFIXES.some(prefix => zipPath.startsWith(prefix));
}

async function collectFiles(dir, baseDir = dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const files = [];
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            files.push(...await collectFiles(fullPath, baseDir));
            continue;
        }
        if (!entry.isFile()) continue;
        const relativePath = toZipPath(path.relative(baseDir, fullPath));
        if (shouldInclude(relativePath)) {
            const stat = await fs.stat(fullPath);
            files.push({ relativePath, size: stat.size });
        }
    }
    return files;
}

async function assertDistReady() {
    const indexPath = path.join(DIST_DIR, 'index.html');
    try {
        await fs.access(indexPath);
    } catch {
        throw new Error('dist/index.html is missing. Run npm run build:demo first.');
    }
}

function assertItchLimits(files) {
    const extractedBytes = files.reduce((sum, file) => sum + file.size, 0);
    const overlongPath = files.find(file => file.relativePath.length > ITCH_LIMITS.maxPathLength);
    const oversizedFile = files.find(file => file.size > ITCH_LIMITS.maxSingleFileBytes);
    if (!files.some(file => file.relativePath === 'index.html')) {
        throw new Error('Package would not contain index.html at the ZIP root.');
    }
    if (files.length > ITCH_LIMITS.maxFiles) {
        throw new Error(`Package would contain ${files.length} files, above itch.io's default ${ITCH_LIMITS.maxFiles} file limit.`);
    }
    if (extractedBytes > ITCH_LIMITS.maxExtractedBytes) {
        throw new Error(`Package would extract to ${formatBytes(extractedBytes)}, above itch.io's default ${formatBytes(ITCH_LIMITS.maxExtractedBytes)} limit.`);
    }
    if (overlongPath) {
        throw new Error(`Package path is too long for itch.io defaults: ${overlongPath.relativePath}`);
    }
    if (oversizedFile) {
        throw new Error(`Package file is too large for itch.io defaults: ${oversizedFile.relativePath}`);
    }
    return extractedBytes;
}

function formatBytes(bytes) {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

async function removeExistingZip() {
    await fs.mkdir(path.dirname(OUTPUT_ZIP), { recursive: true });
    await fs.rm(OUTPUT_ZIP, { force: true });
}

function zipFiles(files) {
    return new Promise((resolve, reject) => {
        const zip = spawn('zip', ['-q', OUTPUT_ZIP, '-@'], {
            cwd: DIST_DIR,
            stdio: ['pipe', 'inherit', 'inherit']
        });

        zip.on('error', reject);
        zip.on('close', code => {
            if (code === 0) resolve();
            else reject(new Error(`zip exited with code ${code}`));
        });

        zip.stdin.end(files.map(file => file.relativePath).join('\n'));
    });
}

async function getZipSize() {
    const stat = await fs.stat(OUTPUT_ZIP);
    return stat.size;
}

async function main() {
    await assertDistReady();
    const files = (await collectFiles(DIST_DIR))
        .sort((a, b) => a.relativePath.localeCompare(b.relativePath));
    const extractedBytes = assertItchLimits(files);
    await removeExistingZip();
    await zipFiles(files);
    const zipBytes = await getZipSize();
    console.log(`Created ${path.relative(ROOT, OUTPUT_ZIP)}`);
    console.log(`${files.length} files, ${formatBytes(extractedBytes)} extracted, ${formatBytes(zipBytes)} zipped`);
}

main().catch(error => {
    console.error(error.message || error);
    process.exit(1);
});
