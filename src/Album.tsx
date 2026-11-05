import { memo, useCallback, useEffect, type ComponentProps, type Ref, useMemo, useRef, useState } from 'react'
import HTMLFlipBook, { type BookSnapshot } from '@gullabs/react-flipbook'
import { lendas, type Lenda } from './data/lendas'
import './album.css'
import { api, type AlbumResult } from './api'
import LegendImage from './LegendImage'
import IllustratedCard from './IllustratedCard'

const POR_FOLHA = 6
const FOLHAS = Math.ceil(lendas.length / POR_FOLHA)

const tres = (n: number) => String(n).padStart(3, '0')

type FolhaProps = {
  indice: number
  grupo: Lenda[]
  coletadas: Set<string>
  aoAbrir: (lenda: Lenda) => void
}

// O motor do livro controla a raiz de cada folha; todo o conteúdo fica nos wrappers internos.
const Folha = memo(function Folha({ indice, grupo, coletadas, aoAbrir, ref }: FolhaProps & { ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref}>
      <div className="folha">
        <div className="folha-moldura">
          <div className="folha-cabecalho">
            <span>Registros esquecidos</span>
            <span>{String(indice + 1).padStart(2, '0')}</span>
          </div>

          <div className="folha-posicoes">
            {grupo.map(lenda => {
              const encontrada = coletadas.has(lenda.id)
              return (
                <Posicao
                  type="button"
                  key={lenda.id}
                  className={`posicao ${encontrada ? 'revelada' : 'selada'}`}
                  data-posicao={lenda.numero}
                  encontrada={encontrada}
                  onClick={() => aoAbrir(lenda)}
                  aria-label={encontrada ? `Abrir carta ${lenda.nome}` : `Posição ${lenda.numero} ainda selada`}
                >
                  {encontrada ? (
                    <>
                      {lenda.imagem ? (
                        <LegendImage id={lenda.id} src={lenda.imagem} alt={`Ilustração de ${lenda.nome}`} sizes="(max-width: 600px) 30vw, 180px" draggable={false} />
                      ) : (
                        <span className="posicao-sigilo">✧</span>
                      )}
                      <strong>{lenda.nome}</strong>
                    </>
                  ) : (
                    <>
                      <span className="posicao-sigilo">◈</span>
                      <small>{tres(lenda.numero)}</small>
                    </>
                  )}
                </Posicao>
              )
            })}
          </div>

          <div className="folha-rodape">Baú das Lendas · MMXXVI</div>
        </div>
      </div>
    </div>
  )
})

function Posicao({ encontrada, children, ...props }: ComponentProps<'button'> & { encontrada: boolean; 'data-posicao': number }) {
  // Posições seladas são papel: o gesto pode começar nelas sem ser bloqueado como botão.
  return encontrada ? <button {...props}>{children}</button>
    : <div className={props.className} data-posicao={props['data-posicao']} aria-label={props['aria-label']} aria-disabled="true">{children}</div>
}

type AlbumProps = { aoFechar: () => void }

export default function Album({ aoFechar }: AlbumProps) {
  const [coletadas, setColetadas] = useState<Set<string>>(() => new Set())
  const [descobertas, setDescobertas] = useState<Map<string, Lenda>>(() => new Map())
  const [mensagem, setMensagem] = useState('Consultando sua coleção…')
  const [progresso, setProgresso] = useState<AlbumResult['progress'] | null>(null)
  const [selecionada, setSelecionada] = useState<Lenda | null>(null)
  const [face, setFace] = useState(0)
  const [visiveis, setVisiveis] = useState<number[]>([0])
  const fecharRef = useRef<HTMLButtonElement>(null)
  const mesaRef = useRef<HTMLDivElement>(null)
  const [larguraMinima, setLarguraMinima] = useState(230)
  const selecionadaRef = useRef<Lenda | null>(null)
  selecionadaRef.current = selecionada

  useEffect(() => {
    const mesa = mesaRef.current
    if (!mesa) return
    const medir = () => setLarguraMinima(Math.min(230, Math.max(100, Math.floor((mesa.clientHeight - 64) * 360 / 520))))
    medir()
    const observer = new ResizeObserver(medir)
    observer.observe(mesa)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let active = true
    let version = 0
    const atualizar = async () => {
      const current = ++version
      setSelecionada(null); setColetadas(new Set()); setDescobertas(new Map()); setProgresso(null)
      setMensagem('Consultando sua coleção…')
      try {
        const album = await api<AlbumResult>('/album')
        if (!active || current !== version) return
        const cards = album.positions.flatMap(p => p.unlocked && p.legend ? [p.legend] : [])
        setColetadas(new Set(cards.map(c => c.id)))
        setDescobertas(new Map(cards.map(c => [c.id, c])))
        setProgresso(album.progress)
        setMensagem('')
      } catch (error) {
        if (!active || current !== version) return
        setColetadas(new Set()); setDescobertas(new Map()); setSelecionada(null)
        setProgresso(null)
        setMensagem((error as Error).message)
      }
    }
    void atualizar()
    window.addEventListener('focus', atualizar)
    window.addEventListener('bau-auth-change', atualizar)
    const aoVisivel = () => { if (document.visibilityState === 'visible') void atualizar() }
    document.addEventListener('visibilitychange', aoVisivel)
    return () => {
      active = false
      window.removeEventListener('focus', atualizar)
      window.removeEventListener('bau-auth-change', atualizar)
      document.removeEventListener('visibilitychange', aoVisivel)
    }
  }, [])

  useEffect(() => {
    fecharRef.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopPropagation()
      if (selecionadaRef.current) setSelecionada(null)
      else aoFechar()
    }
    window.addEventListener('keydown', aoTeclar, true)
    return () => window.removeEventListener('keydown', aoTeclar, true)
  }, [aoFechar])

  const abrirCarta = useMemo(
    () => (lenda: Lenda) => {
      setSelecionada(descobertas.get(lenda.id) ?? null)
      setFace(0)
    },
    [descobertas],
  )

  // Elementos estáveis: reconstruí-los durante o giro desmontaria o livro.
  const folhas = useMemo(
    () =>
      Array.from({ length: FOLHAS }, (_, i) => (
        <Folha
          key={i}
          indice={i}
          grupo={lendas.slice(i * POR_FOLHA, (i + 1) * POR_FOLHA).map(l => descobertas.get(l.id) ?? l)}
          coletadas={coletadas}
          aoAbrir={abrirCarta}
        />
      )),
    [coletadas, descobertas, abrirCarta],
  )

  // Inclua AS CAPAS no memo: onLoaded causa render; recriar children aqui
  // recarregaria as folhas durante a dobra e poderia disparar outro onLoaded.
  const paginas = useMemo(() => [
    <div key="capa"><div className="capa">
      <span className="lombada" aria-hidden="true" />
      <div className="capa-corpo">
        <span className="capa-ornamento" aria-hidden="true">✦</span>
        <small>Archivum Umbrarum</small>
        <h3>Grimório<br />dos<br />Esquecidos</h3>
        <span className="capa-selo" aria-hidden="true">◈</span><p>Baú das Lendas</p>
      </div>
    </div></div>,
    ...folhas,
    <div key="contracapa"><div className="capa contracapa">
      <span className="lombada lombada-direita" aria-hidden="true" />
      <div className="capa-corpo"><span className="capa-selo" aria-hidden="true">◈</span>
        <p>O esquecimento é a última morte</p></div>
    </div></div>,
  ], [folhas])
  const sincronizar = useCallback((s: BookSnapshot) => setVisiveis(s.visiblePages), [])
  const ultima = FOLHAS + 1
  const onde = visiveis.includes(0)
    ? 'Capa'
    : visiveis.includes(ultima)
      ? 'Contracapa'
      : `Folhas ${visiveis.join(' e ')} de ${FOLHAS}`

  const total = progresso?.obtained ?? 0
  const tamanho = progresso?.total ?? lendas.length

  return (
    <section className="grimorio" role="dialog" aria-modal="true" aria-label="Grimório dos Esquecidos">
      <div className="grimorio-vinheta" aria-hidden="true" />

      <header className="grimorio-topo">
        <div>
          <p className="grimorio-sobretitulo">Coleção particular</p>
          <h2>Grimório dos Esquecidos</h2>
        </div>
        <button ref={fecharRef} type="button" className="grimorio-fechar" onClick={aoFechar}>
          Fechar <span aria-hidden="true">×</span>
        </button>
      </header>

      <div className="grimorio-progresso" aria-live="polite">
        <strong>
          {progresso ? `${total}/${tamanho}` : '—/60'}
        </strong>
        <span className="grimorio-trilho" aria-hidden="true">
          <i style={{ width: `${(total / tamanho) * 100}%` }} />
        </span>
        <span>{total === 0 ? 'Nenhum registro descoberto' : `${total === 1 ? 'registro descoberto' : 'registros descobertos'}`}</span>
      </div>
      {mensagem && <p className="grimorio-aviso" role="status">{mensagem} <a href="/?conta=1&retorno=album">Conta</a></p>}

      <div className="grimorio-mesa" ref={mesaRef}>
        <div className="grimorio-livro">
          <HTMLFlipBook
            width={360}
            height={520}
            sizing="responsive"
            minWidth={larguraMinima}
            maxWidth={420}
            minHeight={Math.round(larguraMinima * 520 / 360)}
            maxHeight={600}
            hardCovers
            drawShadow
            maxShadowOpacity={0.6}
            flippingTime={1000}
            pageBackground="#b9a888"
            flipOnClick="corners"
            foldCornerOnHover
            respectInteractiveContent
            allowTouchScroll={false}
            controls="visible"
            controlLabels={{ previous: 'Folha anterior', next: 'Próxima folha' }}
            aria-label="Grimório dos Esquecidos"
            roleDescription="livro"
            onLoaded={sincronizar}
            onPageChange={sincronizar}
          >
            {paginas}
          </HTMLFlipBook>
        </div>
      </div>

      <p className="grimorio-indicacao">
        {onde} · Arraste o canto da folha ou use as setas
        {' · '}<a href="/casa/cartas.html?carta=saci-perere">Saci Pererê em exposição</a>
      </p>

      {selecionada && (
        <div className="inspecao" onClick={() => setSelecionada(null)}>
          <div
            className="inspecao-carta"
            role="dialog"
            aria-modal="true"
            aria-label={`Carta ${selecionada.nome}`}
            onClick={e => e.stopPropagation()}
          >
            <div className="inspecao-topo">
              <small>
                Registro {tres(selecionada.numero)} · Face {face + 1} de 3
              </small>
              <button type="button" className="inspecao-fechar" onClick={() => setSelecionada(null)} autoFocus>
                Fechar <span aria-hidden="true">×</span>
              </button>
            </div>

            <div className="inspecao-face" key={`${selecionada.id}-${face}`}>
              {face === 0 && (
                <>
                  <h3>{selecionada.nome}</h3>
                  <div className="inspecao-arte">
                    {selecionada.imagem ? (
                      <IllustratedCard legend={selecionada} />
                    ) : (
                      <span aria-hidden="true">✧</span>
                    )}
                  </div>
                  <p className="inspecao-origem">{selecionada.origem}</p>
                  <dl className="inspecao-atributos">
                    <div>
                      <dt>Ameaça</dt>
                      <dd>{selecionada.ameaca ?? '—'}{selecionada.ameaca !== null && <small>/100</small>}</dd>
                    </div>
                    <div>
                      <dt>Encontro</dt>
                      <dd>{selecionada.encontro ?? '—'}{selecionada.encontro !== null && <small>/10</small>}</dd>
                    </div>
                  </dl>
                </>
              )}

              {face === 1 && (
                <>
                  <h3>O relato</h3>
                  <div className="inspecao-historia">
                    {selecionada.historia.split(/\n\n+/).map((p, i) => (
                      <p key={i}>{p}</p>
                    ))}
                  </div>
                </>
              )}

              {face === 2 && (
                <div className="inspecao-verso">
                  <span aria-hidden="true">◈</span>
                  <h3>
                    Baú
                    <br />
                    das Lendas
                  </h3>
                  <p>O esquecimento é a última morte.</p>
                </div>
              )}
            </div>

            <div className="inspecao-controles">
              <div className="inspecao-pontos" role="group" aria-label="Faces da carta">
                {[0, 1, 2].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={n === face ? 'ativo' : ''}
                    aria-label={`Face ${n + 1}`}
                    aria-pressed={n === face}
                    onClick={() => setFace(n)}
                  />
                ))}
              </div>
              <button type="button" className="inspecao-virar" onClick={() => setFace(f => (f + 1) % 3)}>
                Virar carta ↻
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
