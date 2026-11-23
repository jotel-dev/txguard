import assert from 'node:assert/strict'
import { readFile, readdir } from 'node:fs/promises'
const html = await readFile('dist/index.html', 'utf8')
assert.ok(
  html.includes('<style data-critical-css>'),
  'Critical public-page CSS must load before the async application',
)
assert.ok(html.includes('data-prerendered="true"'), 'Public HTML must be rendered at build time')
assert.ok(
  html.includes('Know Before') && html.includes('id="wallet"'),
  'Public content/form is missing',
)
assert.ok(
  /<fieldset[^>]+disabled/.test(html),
  'Pre-hydration controls must not accept and lose user input',
)
const names = [
  'GROQ_API_KEY',
  'ETHERSCAN_API_KEY',
  'UPSTASH_REDIS_REST_TOKEN',
  'KV_REST_API_TOKEN',
  'RATE_LIMIT_HMAC_SECRET',
]
const assets = (await readdir('dist/assets')).filter((name) => name.endsWith('.js'))
for (const [name, text] of [
  ['index.html', html],
  ...(await Promise.all(
    assets.map(async (file) => [file, await readFile(`dist/assets/${file}`, 'utf8')]),
  )),
]) {
  for (const variable of names) {
    assert.ok(!text.includes(variable), `Server credential reference found in client asset ${name}`)
    const value = process.env[variable]
    if (value && value.length >= 8)
      assert.ok(!text.includes(value), `Private configuration found in client asset ${name}`)
  }
}
console.log(
  `Public HTML + ${assets.length} client bundles verified; server credential references absent.`,
)
