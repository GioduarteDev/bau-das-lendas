import { canonicalCardId } from '../../card-art.js'

export function houseCatalog(catalog, decorations) {
  if (catalog.length !== 60 || new Set(catalog.map(l => l.id)).size !== 60 ||
      catalog.map(l => l.numero).sort((a,b) => a-b).some((n,i) => n !== i+1)) throw Error('Catálogo oficial inválido.')
  const known = new Map(decorations.map(l => [canonicalCardId(l.id), l]))
  return [...catalog].sort((a,b) => a.numero-b.numero).map(l => {
    const decor = known.get(l.id) || {}
    const zona = decor.zona || (/Japão/.test(l.origem) ? 'japao' : /China/.test(l.origem) ? 'china' : /Índia/.test(l.origem) ? 'india' : /Filipinas/.test(l.origem) ? 'filipinas' : 'brasil')
    return { ...decor, ...l, num: String(l.numero).padStart(2,'0'), local: l.origem,
      zona, ala: decor.ala || 'ARQUIVO DAS LENDAS', original: decor.original || '', periodo: decor.periodo || '—',
      tipo: l.categoria || decor.tipo || 'LENDA', intensidade: decor.intensidade || 0,
      frase: l.subtitulo || decor.frase || '', relato: l.historia.split(/\n\n+/), fonte: decor.fonte || 'CATÁLOGO OFICIAL', gravura: decor.gravura || '' }
  })
}
