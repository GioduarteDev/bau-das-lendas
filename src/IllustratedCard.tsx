import { useEffect, useRef } from 'react'
import type { Lenda } from './data/lendas'
// @ts-expect-error módulo compartilhado com as páginas estáticas
import { mountCard } from '../public/casa/js/card-view.js'
import '../public/casa/css/card-view.css'

export default function IllustratedCard({ legend }: { legend: Lenda }) {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const card = mountCard(legend, { unlocked: true })
    root.current?.replaceChildren(card)
    return () => card.remove()
  }, [legend])
  return <div className="illustrated-card-container" ref={root} />
}
