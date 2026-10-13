import { createHash } from 'node:crypto'
import { readFile, writeFile, unlink } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

const version = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex').slice(0, 16)

test('existing worker fetches changed artwork by content version and keeps it offline', async ({ page, context }) => {
  // A dedicated fixture simulates replacing a derivative between deployments,
  // without changing artwork used by concurrently running UI tests.
  const file = 'dist/cards/rws/cache-update-fixture.jpg'
  const before = await readFile('public/cards/rws/ace-of-cups.jpg')
  const after = await readFile('public/cards/rws/ace-of-wands.jpg')
  const oldUrl = `/cards/rws/cache-update-fixture.jpg?v=${version(before)}`
  const newUrl = `/cards/rws/cache-update-fixture.jpg?v=${version(after)}`
  const fetchBytes = (url: string) => page.evaluate(async (url) =>
    Array.from(new Uint8Array(await (await fetch(url)).arrayBuffer())), url)
  try {
    await writeFile(file, before)
    await page.goto('/')
    await page.evaluate(async () => { await navigator.serviceWorker.ready })
    await page.reload()
    await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
    expect(Buffer.from(await fetchBytes(oldUrl))).toEqual(before)
    await expect.poll(() => page.evaluate(async (url) =>
      Boolean(await (await caches.open('tarot-artwork')).match(url)), oldUrl)).toBe(true)

    await writeFile(file, after)
    // The old CacheFirst entry really is stale; a new content URL must bypass it.
    expect(Buffer.from(await fetchBytes(oldUrl))).toEqual(before)
    expect(Buffer.from(await fetchBytes(newUrl))).toEqual(after)
    await expect.poll(() => page.evaluate(async (url) =>
      Boolean(await (await caches.open('tarot-artwork')).match(url)), newUrl)).toBe(true)
    await context.setOffline(true)
    expect(Buffer.from(await fetchBytes(newUrl))).toEqual(after)
  } finally {
    await context.setOffline(false)
    await unlink(file).catch(() => undefined)
  }
})
