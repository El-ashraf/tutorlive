import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const ffmpegPackagePath = join(projectRoot, 'node_modules', '@ffmpeg', 'core', 'package.json')
const ffmpegPackage = JSON.parse(await readFile(ffmpegPackagePath, 'utf8'))
const ffmpegSource = join(projectRoot, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd')
const ffmpegDestination = join(projectRoot, 'public', 'ffmpeg', ffmpegPackage.version)

await mkdir(ffmpegDestination, { recursive: true })
await Promise.all(
  ['ffmpeg-core.js', 'ffmpeg-core.wasm'].map((filename) =>
    copyFile(join(ffmpegSource, filename), join(ffmpegDestination, filename)),
  ),
)

const pdfjsPackagePath = join(projectRoot, 'node_modules', 'pdfjs-dist', 'package.json')
const pdfjsPackage = JSON.parse(await readFile(pdfjsPackagePath, 'utf8'))
const pdfjsDestination = join(projectRoot, 'public', 'pdfjs', pdfjsPackage.version)

await mkdir(pdfjsDestination, { recursive: true })
await copyFile(
  join(projectRoot, 'node_modules', 'pdfjs-dist', 'build', 'pdf.worker.min.mjs'),
  join(pdfjsDestination, 'pdf.worker.min.mjs'),
)

console.log(`Prepared FFmpeg ${ffmpegPackage.version} and PDF.js ${pdfjsPackage.version} browser assets`)
