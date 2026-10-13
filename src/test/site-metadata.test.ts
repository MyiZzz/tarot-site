import { describe, expect, it } from 'vitest'
import { siteMetadata } from '../../scripts/siteMetadata'

function generate(url: string) {
  const files: { fileName: string; source: string }[] = []
  const plugin = siteMetadata(url)
  const hook = plugin.generateBundle as (...args: unknown[]) => void
  hook.call({ emitFile: (file: typeof files[number]) => files.push(file) })
  return Object.fromEntries(files.map((file) => [file.fileName, file.source]))
}

describe('crawler metadata', () => {
  it('uses the configured origin and subpath for the only indexable page', () => {
    const files = generate('https://tarot.example/archive')
    expect(files['sitemap.xml']).toContain('<loc>https://tarot.example/archive/</loc>')
    expect(files['robots.txt']).toContain('Sitemap: https://tarot.example/archive/sitemap.xml')
  })
  it('does not publish an invented production URL', () => {
    const files = generate('')
    expect(files['sitemap.xml']).not.toContain('<loc>')
    expect(files['robots.txt']).toBe('User-agent: *\nAllow: /\n')
  })
  it('rejects invalid origins', () => {
    expect(() => siteMetadata('not-a-url')).toThrow()
    expect(() => siteMetadata('https://example.com/#hash')).toThrow()
    expect(() => siteMetadata('file:///tmp')).toThrow()
  })
})
