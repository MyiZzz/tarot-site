// @vitest-environment node
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
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
    }))
    for (const name of ['entry', 'daily', 'engine']) await writeFile(join(dir, `${name}.js`), name)
    await writeFile(join(dir, 'poster.js'), randomBytes(150_000))
    const run = () => execFileSync(process.execPath, ['scripts/check-bundle-size.mjs', dir], { encoding: 'utf8', stdio: 'pipe' })
    expect(run()).toContain('engine.js:')
    await writeFile(join(dir, 'engine.js'), randomBytes(125_000))
    expect(run).toThrow(/Startup JS gzip exceeds budget/)
    await rm(join(dir, 'engine.js'))
    expect(run).toThrow()
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
})
