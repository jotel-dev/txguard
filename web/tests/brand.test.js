import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { inflateSync } from 'node:zlib'
test('approved logo exports are self-contained vectors and have transparent PNG backgrounds', async () => {
  for (const color of ['blue', 'black', 'white'])
    for (const kind of ['horizontal', 'symbol']) {
      const name = `public/brand/txguard-${kind}-${color}`
      const svg = await readFile(`${name}.svg`, 'utf8')
      assert.match(svg, /<path /)
      assert.doesNotMatch(svg, /<text|<script|<image|https?:\/\/(?!www.w3.org)|gradient|filter=/)
      const png = await readFile(`${name}.png`)
      assert.equal(png.subarray(1, 4).toString(), 'PNG')
      assert.equal(png[25], 6, 'RGBA export required')
      const data = []
      for (let i = 8; i < png.length;) {
        const size = png.readUInt32BE(i)
        if (png.toString('ascii', i + 4, i + 8) === 'IDAT')
          data.push(png.subarray(i + 8, i + 8 + size))
        i += 12 + size
      }
      assert.equal(
        inflateSync(Buffer.concat(data))[4],
        0,
        'Top-left logo pixel must be transparent',
      )
    }
})
test('touch, social and browser icons have the required sizes without bloating the favicon', async () => {
  for (const [file, width, height] of [
    ['public/apple-touch-icon.png', 180, 180],
    ['public/brand/txguard-profile.png', 1024, 1024],
    ['public/brand/txguard-open-graph.png', 1200, 630],
  ]) {
    const png = await readFile(file)
    assert.equal(png.readUInt32BE(16), width)
    assert.equal(png.readUInt32BE(20), height)
  }
  const ico = await readFile('public/favicon.ico')
  assert.equal(ico.readUInt16LE(2), 1)
  assert.equal(ico.readUInt16LE(4), 3)
  assert.ok((await readFile('public/favicon.svg')).length < 500)
})
