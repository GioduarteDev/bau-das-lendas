import type { Lenda } from './data/lendas'
// O arquivo público é compartilhado com a RA, sem import.meta.env em scripts estáticos.
// @ts-expect-error módulo JavaScript público, tipado na interface abaixo
import { api as request } from '../public/api.js'

export type User = { id: string; username: string; email: string }
export type AlbumResult = {
  positions: { numero: number; unlocked: boolean; legend: Lenda | null; collected_at: string | null }[]
  progress: { total: number; obtained: number; remaining: number; complete: boolean }
}
export const api: <T>(path: string, options?: RequestInit) => Promise<T> = request

export function notifyAuth() { window.dispatchEvent(new Event('bau-auth-change')) }
