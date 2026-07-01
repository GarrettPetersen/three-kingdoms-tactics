import { defineConfig } from 'vite';
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';

const BUILD_PUBLIC_EXCLUDES = [
  'assets/all_sound_effects',
  'assets/all_songs',
  'assets/voice_samples',
];

function toPosixPath(path) {
  return path.split(sep).join('/');
}

function shouldSkipPublicPath(path) {
  const normalized = toPosixPath(path);
  return BUILD_PUBLIC_EXCLUDES.some((excluded) => normalized === excluded || normalized.startsWith(`${excluded}/`));
}

async function copyFilteredPublicDir(sourceDir, targetDir, rootDir = sourceDir) {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  await mkdir(targetDir, { recursive: true });

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry.name);
    const relativePath = relative(rootDir, sourcePath);
    if (shouldSkipPublicPath(relativePath)) continue;

    const targetPath = join(targetDir, relativePath);
    if (entry.isDirectory()) {
      await copyFilteredPublicDir(sourcePath, targetDir, rootDir);
    } else if (entry.isFile()) {
      await mkdir(dirname(targetPath), { recursive: true });
      await copyFile(sourcePath, targetPath);
    }
  }
}

function filteredPublicAssetsPlugin() {
  let config;

  return {
    name: 'filtered-public-assets',
    apply: 'build',
    configResolved(resolvedConfig) {
      config = resolvedConfig;
    },
    async writeBundle() {
      const publicDir = resolve(config.root, 'public');
      const outDir = resolve(config.root, config.build.outDir);
      try {
        await stat(publicDir);
      } catch {
        return;
      }
      await copyFilteredPublicDir(publicDir, outDir);
    },
  };
}

export default defineConfig(({ command }) => ({
  base: './', // Crucial for Electron to find assets using relative paths
  publicDir: command === 'build' ? false : 'public',
  plugins: command === 'build' ? [filteredPublicAssetsPlugin()] : [],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  }
}));

