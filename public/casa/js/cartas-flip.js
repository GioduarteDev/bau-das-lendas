import { api } from '../../api.js'
import { collection } from './colecao.js'
import { mountCard } from './card-view.js'
import { exhibitCards, canonicalCardId, cardBack } from '../../card-art.js'

const $ = id => document.getElementById(id)
let legends = [], filter = 'todas', requested = canonicalCardId(new URLSearchParams(location.search).get('carta'))
let opener = null, activeExhibit = false
let catalogFallback = false
let catalogLoadError = ''
const modal = $('revelar')
modal.setAttribute('role', 'dialog'); modal.setAttribute('aria-modal', 'true'); modal.setAttribute('aria-label', 'Carta ilustrada')
$('revelar-fechar').textContent = 'VOLTAR ÀS CARTAS'
$('revelar-fechar').classList.add('mostrar')
function close() {
  activeExhibit = false
  modal.hidden = true; document.body.classList.remove('revelando'); $('revelar-carta').replaceChildren()
  opener?.focus()
}
function open(card, source) {
  opener = source
  activeExhibit = Boolean(card.extra)
  const unlocked = collection.has(card.id)
  const mounted = mountCard(card, { unlocked, extra: card.extra, preview: !card.extra && !unlocked })
  mounted.classList.add('carta-grande')
  $('revelar-carta').replaceChildren(mounted)
  $('revelar-instrucao').textContent = card.extra
    ? 'EXPOSIÇÃO · NÃO CONTA NAS 60 LENDAS'
    : unlocked
      ? 'SALVA NA SUA CONTA · CLIQUE PARA VIRAR'
      : 'PRÉVIA PÚBLICA · VIRAR NÃO DESBLOQUEIA A CARTA'
  modal.hidden = false; document.body.classList.add('revelando'); mounted.focus()
}
function render() {
  if (!modal.hidden && !activeExhibit) close() // exposições públicas não dependem da conta
  const cards = [...legends, ...exhibitCards]
  const search = $('busca-cartas').value.trim().toLocaleLowerCase('pt-BR')
  const content = cards.map(card => {
    const wrapper = document.createElement('div'); wrapper.className = 'mesa-registro'
    const matchesSearch = `${card.nome} ${card.origem || ''}`.toLocaleLowerCase('pt-BR').includes(search)
    wrapper.hidden = (!matchesSearch || filter !== 'todas' && cardBack(card.id) !== filter)
    const unlocked = collection.has(card.id)
    const mounted = mountCard(card, { unlocked, extra: card.extra, preview: !card.extra && !unlocked })
    wrapper.append(mounted)
    const details = document.createElement('button'); details.className = 'filtro'; details.textContent = `AMPLIAR ${card.nome}`
    details.addEventListener('click', () => open(card, details)); wrapper.append(details)
    if (!card.extra) {
      const dossier = document.createElement('details'), summary = document.createElement('summary')
      summary.textContent = 'FICHA DA LENDA'; dossier.append(summary)
      for (const text of [card.origem, `Ameaça: ${card.ameaca ?? '—'}/100 · Encontro: ${card.encontro ?? '—'}/10`, ...card.historia.split(/\n\n+/)]) {
        const p = document.createElement('p'); p.textContent = text; dossier.append(p)
      }
      wrapper.append(dossier)
    }
    return wrapper
  })
  $('mesa').replaceChildren(...content)
  $('contagem').textContent = String(collection.cards.size)
  const illustrated = legends.filter(legend => legend.imagem).length
  const collectionStatus = collection.error || (collection.user
    ? `Coleção de ${collection.user.username}. ${illustrated} artes oficiais; 60 registros públicos. Saci em exposição, fora das 60 lendas.`
    : `Entre para consultar sua coleção. ${illustrated} artes oficiais; 60 registros públicos.`)
  $('collection-status').textContent = catalogFallback
    ? `${collectionStatus} O catálogo foi carregado do arquivo oficial porque a API pública está indisponível.`
    : collectionStatus
  if (requested) {
    const card = cards.find(card => card.id === requested)
    if (card && (card.extra || collection.has(card.id))) { open(card); requested = null }
  }
}
try {
  legends = await api('/legends')
} catch {
  catalogFallback = true
  try {
    const response = await fetch('/lendas-ra.json')
    if (!response.ok) throw Error(`Catálogo indisponível (${response.status}).`)
    legends = await response.json()
  } catch (error) {
    catalogLoadError = `Não foi possível carregar o catálogo pela API nem pelo arquivo oficial: ${error.message}`
    $('collection-status').textContent = catalogLoadError
  }
}
if (!Array.isArray(legends) || legends.length !== 60 || new Set(legends.map(legend => legend.id)).size !== 60 ||
    legends.map(legend => legend.numero).sort((a, b) => a - b).some((number, index) => number !== index + 1)) {
  if (!catalogLoadError) $('collection-status').textContent = 'Catálogo oficial inválido: são necessárias 60 posições numeradas e IDs únicos.'
} else {
  collection.addEventListener('change', render)
  render()
}
document.querySelectorAll('[data-filtro]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filtro
  document.querySelectorAll('[data-filtro]').forEach(other => { other.classList.toggle('ativo', other === button); other.setAttribute('aria-pressed', String(other === button)) })
  render()
}))
$('busca-cartas').addEventListener('input', render)
$('virar-todas').addEventListener('click', () => $('mesa').querySelectorAll('.mesa-registro:not([hidden]) .carta-x').forEach((card, index) => card.virar(index > 0)))
$('refresh-collection').addEventListener('click', () => collection.refresh())
$('revelar-fechar').addEventListener('click', close)
modal.addEventListener('keydown', event => {
  if (event.key === 'Escape') { close(); return }
  if (event.key === 'Tab') {
    const nodes = [...modal.querySelectorAll('[tabindex="0"],button')]
    const first = nodes[0], last = nodes.at(-1)
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
  }
})
