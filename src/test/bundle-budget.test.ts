// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { expect, it } from 'vitest'

it('counts eager dynamic dependencies, deduplicates cycles and excludes deferred chunks', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'tarot-budget-'))
  try {
    await mkdir(join(dir, '.vite'))
    await writeFile(join(dir, '.vite/manifest.json'), JSON.stringify({
      'index.html': { file: 'entry.js', isEntry: true, dynamicImports: ['src/lib/daily.ts', 'poster'] },
      'src/lib/daily.ts': { file: 'daily.js', imports: ['engine'] },
      engine: { file: 'engine.js', imports: ['index.html'] },
      poster: { file: 'poster.js' },
      optional: { file: 'optional.js' },
    }))
    for (const name of ['entry', 'daily', 'engine']) await writeFile(join(dir, `${name}.js`), name)
    const poster = randomBytes(150_000)
    await writeFile(join(dir, 'poster.js'), poster)
    await writeFile(join(dir, 'optional.js'), 'optional')
    const worker = 'define(["./workbox-test"],function(w){w.precacheAndRoute([{url:"entry.js",revision:null},{url:"poster.js",revision:null},{url:"app.css",revision:"1"},{url:"app.css",revision:"1"}],{})})'
    await writeFile(join(dir, 'sw.js'), worker)
    await writeFile(join(dir, 'workbox-test.js'), 'workbox')
    await writeFile(join(dir, 'app.css'), 'body{}')
    const run = () => execFileSync(process.execPath, ['scripts/check-bundle-size.mjs', dir], { encoding: 'utf8', stdio: 'pipe' })
    expect(run()).toContain('engine.js:')
    expect(run()).toContain('SW precache payload (3 files): 150011 bytes raw')
    expect(run()).toContain(`SW worker scripts: ${worker.length + 7} bytes raw / ${gzipSync(worker).length + gzipSync('workbox').length} bytes gzip`)
    expect(run()).toContain(`Deferred JS included in precache: ${gzipSync(poster).length} bytes gzip`)
    expect(run()).toContain(`Deferred JS gzip (excluded from startup): ${gzipSync(poster).length + gzipSync('optional').length} bytes`)
    const installGzip = ['entry', poster, 'body{}', worker, 'workbox'].reduce((total, bytes) => total + gzipSync(bytes).length, 0)
    expect(run()).toContain(`SW installation total (cold cache; overlaps startup): ${150018 + worker.length} bytes raw / ${installGzip} bytes gzip`)
    await writeFile(join(dir, 'sw.js'), 'broken manifest')
    expect(run).toThrow(/No service-worker precache manifest found/)
    await writeFile(join(dir, 'sw.js'), worker)
    await writeFile(join(dir, 'engine.js'), randomBytes(125_000))
    expect(run).toThrow(/Startup JS gzip exceeds budget/)
    await rm(join(dir, 'engine.js'))
    expect(run).toThrow()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
