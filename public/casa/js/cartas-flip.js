import { api } from '../../api.js'
import { collection } from './colecao.js'
import { mountCard } from './card-view.js'
import { exhibitCards, canonicalCardId, cardBack } from '../../card-art.js'

const $ = id => document.getElementById(id)
let legends = [], filter = 'todas', requested = canonicalCardId(new URLSearchParams(location.search).get('carta'))
let opener = null, activeExhibit = false
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
  if (!card.extra && !collection.has(card.id)) return
  opener = source
  activeExhibit = Boolean(card.extra)
  const mounted = mountCard(card, { unlocked: collection.has(card.id), extra: card.extra })
  mounted.classList.add('carta-grande')
  $('revelar-carta').replaceChildren(mounted)
  $('revelar-instrucao').textContent = card.extra ? 'EXPOSIÇÃO · NÃO CONTA NAS 60 LENDAS' : 'SALVA NA SUA CONTA · CLIQUE PARA VIRAR'
  modal.hidden = false; document.body.classList.add('revelando'); mounted.focus()
}
function render() {
  if (!modal.hidden && !activeExhibit) close() // exposições públicas não dependem da conta
  const cards = [...legends.filter(l => l.imagem), ...exhibitCards]
  const content = cards.map(card => {
    const wrapper = document.createElement('div'); wrapper.className = 'mesa-registro'
    wrapper.hidden = filter !== 'todas' && cardBack(card.id) !== filter
    const mounted = mountCard(card, { unlocked: collection.has(card.id), extra: card.extra })
    wrapper.append(mounted)
    if (card.extra || collection.has(card.id)) {
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
    }
    return wrapper
  })
  $('mesa').replaceChildren(...content)
  $('contagem').textContent = String(collection.cards.size)
  $('collection-status').textContent = collection.error || (collection.user ? `Coleção de ${collection.user.username}. ${cards.length} ilustrações; Saci em exposição, fora das 60 lendas.` : 'Consultando sua conta…')
  if (requested) {
    const card = cards.find(card => card.id === requested)
    if (card && (card.extra || collection.has(card.id))) { open(card); requested = null }
  }
}
collection.addEventListener('change', render)
try { legends = await api('/legends'); render() }
catch (error) { $('collection-status').textContent = error.message }
document.querySelectorAll('[data-filtro]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filtro
  document.querySelectorAll('[data-filtro]').forEach(other => { other.classList.toggle('ativo', other === button); other.setAttribute('aria-pressed', String(other === button)) })
  render()
}))
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
