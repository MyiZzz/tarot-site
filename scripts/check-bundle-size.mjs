import { readFile, readdir, stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { gzipSync } from 'node:zlib'

// Decimal bytes. Measured under Node 22 (the CI runtime): zlib output differs between
// Node versions, so the same entry file gzips ~420 bytes larger on Node 22 than Node 20.
// Budget leaves ~3% headroom over the Node 22 measurement (27,661 bytes).
const ENTRY_GZIP_BUDGET = 28_500
const STARTUP_GZIP_BUDGET = 122_000
// useDailyReadingState imports this on mount, before any user interaction.
const EAGER_DYNAMIC_ENTRIES = ['src/lib/daily.ts']
const dist = resolve(process.argv[2] ?? 'dist')

try {
  const files = await readdir(dist, { recursive: true })
  let distBytes = 0
  for (const file of files) {
    const info = await stat(resolve(dist, file))
    if (info.isFile()) distBytes += info.size
  }
  console.log(`Total dist: ${distBytes} / 10000000 bytes`)
  if (distBytes >= 10_000_000) throw new Error('dist must remain below 10MB.')
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
  for (const key of EAGER_DYNAMIC_ENTRIES) visit(key)
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
  const deferred = Object.entries(manifest).filter(([key, chunk]) =>
    !startup.has(key) && chunk.file.endsWith('.js'),
  )
  let deferredGzip = 0
  for (const [, chunk] of deferred) {
    deferredGzip += gzipSync(await readFile(resolve(dist, chunk.file))).length
  }
  console.log(`Deferred JS gzip (excluded from startup): ${deferredGzip} bytes`)
  // Read the emitted worker so this follows the actual Workbox configuration.
  // Installation overlaps startup downloads; these totals must not be added together.
  const worker = await readFile(resolve(dist, 'sw.js'), 'utf8')
  const precache = worker.match(/\bprecacheAndRoute\(\s*(\[[\s\S]*?\])/)
  if (!precache) throw new Error('No service-worker precache manifest found.')
  const precacheFiles = new Set([...precache[1].matchAll(/(?:\burl|"url")\s*:\s*"([^"]+)"/g)].map((match) => match[1]))
  if (!precacheFiles.size) throw new Error('Service-worker precache manifest is empty.')
  const workerFiles = new Set(['sw.js', ...[...worker.matchAll(/"(?:\.\/)?(workbox-[\w-]+)(?:\.js)?"/g)].map((match) => `${match[1]}.js`)])
  const measure = async (paths) => {
    let raw = 0
    let gzip = 0
    for (const path of paths) {
      const bytes = await readFile(resolve(dist, path))
      raw += bytes.length
      gzip += gzipSync(bytes).length
    }
    return { raw, gzip }
  }
  const payload = await measure(precacheFiles)
  const workers = await measure(workerFiles)
  const optional = await measure(deferred.map(([, chunk]) => chunk.file).filter((file) => precacheFiles.has(file)))
  console.log(`SW precache payload (${precacheFiles.size} files): ${payload.raw} bytes raw / ${payload.gzip} bytes gzip`)
  console.log(`SW worker scripts: ${workers.raw} bytes raw / ${workers.gzip} bytes gzip`)
  console.log(`SW installation total (cold cache; overlaps startup): ${payload.raw + workers.raw} bytes raw / ${payload.gzip + workers.gzip} bytes gzip`)
  console.log(`Deferred JS included in precache: ${optional.gzip} bytes gzip`)
  console.log('Gzip estimates assume per-file compression; actual transfer depends on hosting and HTTP cache reuse.')
  console.log(`Startup JS gzip: ${startupGzip} / ${STARTUP_GZIP_BUDGET} bytes`)
  if (startupGzip > STARTUP_GZIP_BUDGET) {
    throw new Error('Startup JS gzip exceeds budget (including eager dynamic imports).')
  }
} catch (error) {
  console.error(`Bundle size check failed: ${error.message}`)
  process.exitCode = 1
}
