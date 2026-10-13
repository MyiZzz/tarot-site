import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// Decimal bytes, approximately 10% headroom over the optimized build.
const ENTRY_GZIP_BUDGET = 27_400
const STARTUP_GZIP_BUDGET = 93_600
const dist = resolve(process.argv[2] ?? 'dist')

try {
  const manifest = JSON.parse(await readFile(resolve(dist, '.vite/manifest.json'), 'utf8'))
  const entries = Object.entries(manifest).filter(([, chunk]) => chunk.isEntry)
  if (entries.length === 0) throw new Error('No entry chunks found; run npm run build first.')
  const startup = new Set()
  const visit = (key) => {
    if (startup.has(key)) return
    if (!manifest[key]) throw new Error(`Missing manifest chunk: ${key}`)
    startup.add(key)
    for (const dependency of manifest[key].imports ?? []) visit(dependency)
  }
  for (const [key] of entries) visit(key)
  let startupGzip = 0
  for (const key of startup) {
    const chunk = manifest[key]
    if (!chunk.file.endsWith('.js')) continue
    const bytes = await readFile(resolve(dist, chunk.file))
    const gzip = gzipSync(bytes).length
    startupGzip += gzip
    console.log(`${chunk.file}: ${bytes.length} bytes raw / ${gzip} bytes gzip`)
    if (chunk.isEntry && gzip > ENTRY_GZIP_BUDGET) {
      throw new Error(`Entry gzip ${gzip} exceeds budget ${ENTRY_GZIP_BUDGET}.`)
    }
  }
  console.log(`Startup JS gzip: ${startupGzip} / ${STARTUP_GZIP_BUDGET} bytes`)
  if (startupGzip > STARTUP_GZIP_BUDGET) {
    throw new Error('Startup JS gzip exceeds budget (including static imports).')
  }
} catch (error) {
  console.error(`Bundle size check failed: ${error.message}`)
  process.exitCode = 1
}
