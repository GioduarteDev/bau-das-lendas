import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { officialArtFiles, exhibitCards } from '../public/card-art.js'

const catalog = JSON.parse(readFileSync('public/lendas-ra.json', 'utf8'))
if (catalog.length !== 60 || new Set(catalog.map(l => l.id)).size !== 60) throw Error('Catálogo oficial inválido.')
for (const id of Object.keys(officialArtFiles)) if (!catalog.some(l => l.id === id)) throw Error(`ID não encontrado: ${id}`)
for (const l of catalog) if (officialArtFiles[l.id]) l.imagem = `/casa/img/cartas/${officialArtFiles[l.id]}`
const manifest = catalog.map(l => {
  const source = l.imagem ? `public${l.imagem}` : ''
  if (source && !existsSync(source)) throw Error(`Imagem ausente: ${source}`)
  return { id: l.id, numero: l.numero, nome: l.nome, alt: `Carta ilustrada de ${l.nome}`, src: l.imagem,
    srcSet: '', ...(source ? { source, sourceSha256: createHash('sha256').update(readFileSync(source)).digest('hex'), crop: null } : {}) }
})
for (const extra of exhibitCards) if (!existsSync(`public${extra.imagem}`)) throw Error('Imagem de exposição ausente.')
writeFileSync('public/lendas-ra.json', JSON.stringify(catalog, null, 2) + '\n')
writeFileSync('public/lendas/manifest.json', JSON.stringify(manifest, null, 2) + '\n')
writeFileSync('public/legend-images.js', '// Gerado por scripts/sincronizar-imagens.mjs.\nexport const legendImages = ' + JSON.stringify(manifest, null, 2) + ';\n')
// Reutiliza os dois versos SVG originais, sem redesenhar seus símbolos.
const html = readFileSync('public/casa/cartas.html', 'utf8')
for (const type of ['boitata', 'vitral']) {
  const match = html.match(new RegExp(`<symbol id="costas-${type}"[^>]*>([\\s\\S]*?)</symbol>`))
  if (!match) throw Error(`Verso original ausente: ${type}`)
  writeFileSync(`public/casa/img/verso-${type}.svg`, `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500">${match[1]}</svg>\n`)
}
const missing = catalog.filter(l => !l.imagem)
writeFileSync('docs/IMAGENS.md', '# Imagens das lendas\n\n8 cartas oficiais e Saci Pererê em exposição, sem integrar os 60 registros oficiais. Os nove JPG originais são usados inteiros, sem recorte ou distorção. Boitatá continua sem arte própria; o desenho do verso não representa seu desbloqueio.\n\n' +
  `Faltam imagens de ${missing.length} lendas oficiais.\n\n| Número | ID | Lenda |\n| --- | --- | --- |\n` + missing.map(l => `| ${l.numero} | \`${l.id}\` | ${l.nome} |`).join('\n') + '\n')
console.log('Imagens vinculadas: 8 oficiais + Saci em exposição. Catálogo: 60 IDs preservados.')
