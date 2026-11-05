import { api } from '../../api.js'

// Estado transitório em memória. Nenhuma carta é lida ou gravada no localStorage.
export class OfficialCollection extends EventTarget {
  constructor(request = api) { super(); this.request = request; this.cards = new Map(); this.user = null; this.error = ''; this.version = 0 }
  has(id) { return this.cards.has(id) }
  async refresh() {
    const version = ++this.version
    this.cards = new Map(); this.user = null; this.error = ''
    this.dispatchEvent(new Event('change'))
    try {
      const user = await this.request('/auth/me')
      const album = await this.request('/album')
      const verified = await this.request('/auth/me')
      if (version !== this.version) return
      if (verified.id !== user.id) throw Error('A conta mudou. Atualize a coleção.')
      this.user = user
      this.cards = new Map(album.positions.filter(p => p.unlocked && p.legend).map(p => [p.legend.id, p.legend]))
    } catch (error) {
      if (version !== this.version) return
      this.error = error.status === 401 ? 'Entre na sua conta para consultar a coleção.' : error.message
    }
    this.dispatchEvent(new Event('change'))
  }
}
export const collection = new OfficialCollection()
if (typeof window !== 'undefined') {
  window.Bau = window.Bau || {}; window.Bau.colecao = collection
  window.addEventListener('focus', () => collection.refresh())
  window.addEventListener('pageshow', () => collection.refresh())
  document.addEventListener('visibilitychange', () => { if (!document.hidden) collection.refresh() })
  window.addEventListener('bau-auth-change', () => collection.refresh())
  collection.refresh()
}
