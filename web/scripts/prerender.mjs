import { readFile, writeFile } from 'node:fs/promises'
import { renderPublicPage } from '../.cache/prerender/prerender.js'

const path = new URL('../dist/index.html', import.meta.url)
let shell = await readFile(path, 'utf8')
// Ship the small stylesheet with prerendered HTML, eliminating a blocking round trip.
// Keep Vite's emitted file for dynamic-import dependency bookkeeping and caching.
const stylesheet = shell.match(/<link rel="stylesheet"[^>]*href="(\/assets\/[^"<>]+\.css)"[^>]*>/)
if (!stylesheet) throw new Error('Missing stylesheet')
const css = await readFile(new URL(`../dist${stylesheet[1]}`, import.meta.url), 'utf8')
if (css.includes('</style')) throw new Error('Unsafe stylesheet content')
shell = shell.replace(stylesheet[0], `<style data-critical-css>${css}</style>`)
const marker = '<div id="root"></div>'
if (!shell.includes(marker)) throw new Error('Missing public render outlet')
const html = renderPublicPage()
if (!html.includes('Know Before') || !html.includes('id="wallet"'))
  throw new Error('Incomplete public render')
await writeFile(path, shell.replace(marker, `<div id="root" data-prerendered="true">${html}</div>`))
console.log('Rendered public homepage at build time; no user data or provider requests.')
