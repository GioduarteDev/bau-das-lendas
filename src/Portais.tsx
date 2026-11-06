import { useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'

// Em desenvolvimento local, defina VITE_PUBLIC_URL com a URL HTTPS pública (ex.: túnel)
// para que o celular consiga ler os códigos. Em produção, usa a própria origem.
const configurada = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim()
const base = (configurada || window.location.origin).replace(/\/+$/, '')

export const URL_SITE = `${base}/`
export const URL_RA = `${base}/ra.html`

const aviso =
  import.meta.env.DEV && !/^https:\/\//.test(base)
    ? 'Selo provisório: defina VITE_PUBLIC_URL com o endereço HTTPS público antes de ler pelo celular.'
    : ''

type Props = { aoFechar: () => void }

const portais = [
  {
    numero: '01',
    titulo: 'O Arquivo',
    texto: 'Leva ao Baú das Lendas: as sessenta lendas, seus dossiês e o Grimório.',
    url: URL_SITE,
  },
  {
    numero: '02',
    titulo: 'O Ritual',
    texto: 'Abre o ritual em realidade aumentada. Leia com o celular, permita a câmera e aponte para o cartaz da casa.',
    url: URL_RA,
  },
]

export default function Portais({ aoFechar }: Props) {
  const fechar = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    fechar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === 'Escape') aoFechar()
    }
    window.addEventListener('keydown', aoTeclar)
    return () => window.removeEventListener('keydown', aoTeclar)
  }, [aoFechar])

  return (
    <section className="painel portais" role="dialog" aria-modal="true" aria-label="Portais">
      <div className="painel-interno portais-folha">
        <header className="painel-topo">
          <div>
            <p className="painel-sobre">Duas passagens</p>
            <h2>Portais</h2>
          </div>
          <button ref={fechar} type="button" className="botao-discreto" onClick={aoFechar}>
            Fechar <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="portais-selos">
          {portais.map(p => (
            <article className="portal-selo" key={p.numero}>
              <span className="portal-numero">Portal {p.numero}</span>
              <div className="portal-qr">
                <QRCodeSVG
                  value={p.url}
                  size={208}
                  level="M"
                  marginSize={3}
                  fgColor="#000000"
                  bgColor="#FFFFFF"
                  title={`QR Code do Portal ${p.numero}: ${p.titulo}`}
                />
              </div>
              <h3>{p.titulo}</h3>
              <p>{p.texto}</p>
              <a className="botao-ritual" href={p.url}>
                Atravessar este portal <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>

        <p className="portais-nota">
          Para invocar, imprima o cartaz da casa (ou deixe-o aberto em outra tela) e aponte a câmera para o desenho.
        </p>
        <a className="botao-ritual portais-cartaz" href={`/cartaz.html?url=${encodeURIComponent(base)}`} target="_blank" rel="noreferrer">
          Abrir o cartaz para imprimir <span aria-hidden="true">↗</span>
        </a>
        {aviso && <p className="portais-nota portais-dev">{aviso}</p>}

        <button type="button" className="botao-discreto portais-imprimir" onClick={() => window.print()}>
          Imprimir os portais
        </button>
      </div>
    </section>
  )
}
