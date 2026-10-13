import type { Plugin } from 'vite'

// No production origin is assumed. An empty sitemap is safer than indexing a placeholder.
export function siteMetadata(siteUrl = process.env.SITE_URL): Plugin {
  const url = siteUrl ? new URL(siteUrl) : undefined
  if (url && (!['http:', 'https:'].includes(url.protocol) || url.search || url.hash || url.username || url.password)) {
    throw new Error('SITE_URL must be an absolute HTTP(S) URL without credentials, query or fragment.')
  }
  if (url && !url.pathname.endsWith('/')) url.pathname += '/'
  const escapeXml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  return {
    name: 'site-metadata',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n${url ? `Sitemap: ${new URL('sitemap.xml', url).href}\n` : ''}` })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${url ? `\n  <url><loc>${escapeXml(url.href)}</loc></url>\n` : '\n  <!-- Set SITE_URL at build time to include the production homepage. -->\n'}</urlset>\n` })
    },
  }
}
