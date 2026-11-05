import { readFileSync, writeFileSync } from 'node:fs'

const catalogo = JSON.parse(
  readFileSync('public/lendas-ra.json', 'utf8')
)

const ids = new Set(catalogo.map(item => item.id))

if (catalogo.length !== 60 || ids.size !== 60) {
  throw new Error('O catálogo precisa ter 60 lendas com IDs diferentes.')
}

const codigo = `// Gerado automaticamente. Edite public/lendas-ra.json.
export type Lenda = {
  id: string
  numero: number
  nome: string
  subtitulo: string
  origem: string
  historia: string
  ameaca: number | null
  encontro: number | null
  notaEncontro: string
  categoria: string
  imagem: string
  provisoria?: boolean
}

export const lendas: Lenda[] = ${JSON.stringify(catalogo, null, 2)}
`

writeFileSync('src/data/lendas.ts', codigo, 'utf8')

console.log(`Catálogo sincronizado: ${catalogo.length} lendas.`)
