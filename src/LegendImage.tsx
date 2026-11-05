import { useState, type ComponentProps } from 'react'
// @ts-expect-error módulo público compartilhado com a RA
import { legendImages } from '../public/legend-images.js'

type Art = { id: string; src: string; srcSet: string; width?: number; height?: number }
const arts = new Map<string, Art>((legendImages as Art[]).map(art => [art.id, art]))

export default function LegendImage({ id, src, alt, ...props }: ComponentProps<'img'> & { id: string }) {
  const [failed, setFailed] = useState<string | null>(null)
  const art = arts.get(id)
  const source = art?.src || src
  if (!source || failed === source) return <span role="img" aria-label={`Imagem indisponível: ${alt}`}>✧</span>
  return <img {...props} src={source} alt={alt} srcSet={art?.srcSet || undefined}
    style={{ ...props.style, objectFit: 'contain' }}
    sizes={props.sizes || '(max-width: 600px) 80vw, 480px'} loading="lazy" decoding="async"
    onError={() => setFailed(source)} />
}
