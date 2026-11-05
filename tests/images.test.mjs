import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile, access } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { legendImages } from '../public/legend-images.js'
import { officialArtFiles, exhibitCards } from '../public/card-art.js'

test('artes inteiras mantêm IDs, correspondências e hashes das fontes locais', async () => {
  const catalog = JSON.parse(await readFile('public/lendas-ra.json', 'utf8'))
  const manifest = JSON.parse(await readFile('public/lendas/manifest.json', 'utf8'))
  assert.deepEqual(legendImages, manifest)
  assert.equal(catalog.length, 60)
  assert.equal(new Set(catalog.map(l => l.id)).size, 60)
  assert.deepEqual(manifest.map(l => l.id), catalog.map(l => l.id))
  assert.equal(manifest.filter(l => l.src).length, 8)
  assert.deepEqual(manifest.filter(l => l.src).map(l => l.id).sort(), Object.keys(officialArtFiles).sort())
  assert.ok(!manifest.some(l => l.id === 'saci-perere'))
  assert.equal(exhibitCards.length, 1)
  assert.equal(exhibitCards[0].id, 'saci-perere')
  for (const art of manifest) {
    const legend = catalog.find(l => l.id === art.id)
    assert.equal(art.nome, legend.nome)
    if (!art.src) { assert.equal(legend.imagem, ''); continue }
    assert.ok(legend.imagem)
    assert.equal(art.src, `/casa/img/cartas/${officialArtFiles[art.id]}`)
    assert.equal(art.crop, null)
    assert.equal(createHash('sha256').update(await readFile(art.source)).digest('hex'), art.sourceSha256)
    await access(`public${art.src}`)
    for (const variant of art.srcSet ? art.srcSet.split(', ') : []) {
      const [path, width] = variant.split(' ')
      assert.ok(path.startsWith(`/lendas/${art.id}-`))
      assert.ok(Number.parseInt(width) > 0)
      await access(`public${path}`)
    }
  }
})
