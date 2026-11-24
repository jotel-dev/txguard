import { readFile, writeFile } from 'node:fs/promises'
import { renderPublicPage } from '../.cache/prerender/prerender.js'

const path = new URL('../dist/index.html', import.meta.url)
const shell = await readFile(path, 'utf8')
// Keep CSS external so it can download alongside fonts and scripts and be cached
// independently. Inlining the full stylesheet triples the initial HTML response.
if (!shell.includes('rel="stylesheet"')) throw new Error('Missing stylesheet')
const marker = '<div id="root"></div>'
if (!shell.includes(marker)) throw new Error('Missing public render outlet')
const html = renderPublicPage()
if (!html.includes('Know Before') || !html.includes('id="wallet"'))
  throw new Error('Incomplete public render')
await writeFile(path, shell.replace(marker, `<div id="root" data-prerendered="true">${html}</div>`))
console.log('Rendered public homepage at build time; no user data or provider requests.')
