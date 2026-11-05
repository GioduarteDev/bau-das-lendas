import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

import World3D, { type FaseMundo } from './experience/World3D'
import { lendas } from './data/lendas'
import Portais, { URL_RA } from './Portais'
import Conta from './Conta'
import LegendImage from './LegendImage'

const Album = lazy(() => import('./Album'))

const Laboratorio =
  import.meta.env.DEV &&
  new URLSearchParams(window.location.search).get('assombracoes') === '1'
    ? lazy(() => import('./experience/hauntings/HauntingPanel'))
    : null

type Painel = 'lendas' | 'portais' | 'conta' | null
type Cena = 'entrada' | 'cruzando' | 'travessia'

const numero = (valor: number) => String(valor).padStart(2, '0')

const CHAVE_MOVIMENTO = 'bau-das-lendas-movimento-reduzido'

class Contencao extends Component<
  { children: ReactNode; aoFalhar: () => void },
  { falhou: boolean }
> {
  state = { falhou: false }

  static getDerivedStateFromError() {
    return { falhou: true }
  }

  componentDidCatch() {
    this.props.aoFalhar()
  }

  render() {
    return this.state.falhou ? null : this.props.children
  }
}

function movimentoInicial() {
  try {
    const salvo = localStorage.getItem(CHAVE_MOVIMENTO)

    if (salvo !== null) {
      return salvo === 'true'
    }
  } catch {
    // Armazenamento indisponível.
  }

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function App() {
  const [cena, setCena] = useState<Cena>('entrada')
  const [indice, setIndice] = useState(0)
  const [dossieAberto, setDossieAberto] = useState(false)

  const [painel, setPainel] = useState<Painel>(() => {
    const query = new URLSearchParams(window.location.search)

    return query.has('conta')
      ? 'conta'
      : query.has('portais')
        ? 'portais'
        : query.has('lendas')
          ? 'lendas'
          : null
  })

  const [grimorio, setGrimorio] = useState(
    () => new URLSearchParams(window.location.search).has('album'),
  )

  const [menuAberto, setMenuAberto] = useState(false)
  const [reduzir, setReduzir] = useState(movimentoInicial)
  const [buscaLendas, setBuscaLendas] = useState('')

  const toqueInicial = useRef<number | null>(null)
  const toqueAnterior = useRef<number | null>(null)
  const deslocamentoRef = useRef(0)
  const indiceRef = useRef(0)

  const [deslocamento, setDeslocamento] = useState(0)

  const temporizador = useRef<number>(0)
  const menuRef = useRef<HTMLButtonElement>(null)

  const lenda = lendas[indice]

  const demonstracao =
    new URLSearchParams(window.location.search).get('demonstracao') === '1' &&
    new URLSearchParams(window.location.search).get('apresentacao') === '1'

  const travessia = cena === 'travessia'

  const sobreposto =
    dossieAberto || painel !== null || grimorio || menuAberto

  useEffect(() => {
    document.documentElement.dataset.reduzir = String(reduzir)

    try {
      localStorage.setItem(CHAVE_MOVIMENTO, String(reduzir))
    } catch {
      // Armazenamento indisponível.
    }
  }, [reduzir])

  useEffect(() => {
    return () => window.clearTimeout(temporizador.current)
  }, [])

  const definirDeslocamento = useCallback((valor: number) => {
    const proximo = Math.max(
      0,
      Math.min(lendas.length - 1, valor),
    )

    deslocamentoRef.current = proximo
    indiceRef.current = Math.round(proximo)

    setDeslocamento(proximo)
    setIndice(indiceRef.current)
  }, [])

  const moverTravessia = useCallback(
    (delta: number) => {
      definirDeslocamento(deslocamentoRef.current + delta)
    },
    [definirDeslocamento],
  )

  const mudarLenda = useCallback(
    (direcao: number) => {
      definirDeslocamento(indiceRef.current + direcao)
    },
    [definirDeslocamento],
  )

  const abrirDossieDoRegistro = useCallback(
    (destino: number) => {
      definirDeslocamento(destino)
      setDossieAberto(true)
      setPainel(null)
      setMenuAberto(false)
      setGrimorio(false)
    },
    [definirDeslocamento],
  )

  // NOVA CASA OFICIAL
  const atravessar = useCallback(
    (_destino?: number) => {
      window.location.assign('/casa/index.html')
    },
    [],
  )

  const retornar = () => {
    window.clearTimeout(temporizador.current)

    setCena('entrada')
    definirDeslocamento(0)
    setDossieAberto(false)
    setPainel(null)
    setMenuAberto(false)
  }

  useEffect(() => {
    if (sobreposto || menuAberto) return

    const aoRolar = (evento: WheelEvent) => {
      if (Math.abs(evento.deltaY) < 1) return

      const pixels =
        evento.deltaMode === WheelEvent.DOM_DELTA_LINE
          ? evento.deltaY * 16
          : evento.deltaMode === WheelEvent.DOM_DELTA_PAGE
            ? evento.deltaY * window.innerHeight
            : evento.deltaY

      evento.preventDefault()

      if (cena === 'entrada') {
        if (pixels > 0) atravessar()
        return
      }

      if (cena === 'cruzando') return

      moverTravessia(
        Math.sign(pixels) *
          Math.min(0.42, Math.abs(pixels) / 760),
      )
    }

    const aoTeclar = (evento: KeyboardEvent) => {
      if (
        ['ArrowDown', 'PageDown', 'ArrowUp', 'PageUp'].includes(evento.key)
      ) {
        evento.preventDefault()

        if (cena === 'entrada') {
          if (['ArrowDown', 'PageDown'].includes(evento.key)) {
            atravessar()
          }
          return
        }

        if (cena === 'cruzando') return

        mudarLenda(
          ['ArrowDown', 'PageDown'].includes(evento.key) ? 1 : -1,
        )
      }
    }

    window.addEventListener('wheel', aoRolar, { passive: false })
    window.addEventListener('keydown', aoTeclar)

    return () => {
      window.removeEventListener('wheel', aoRolar)
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [
    cena,
    sobreposto,
    menuAberto,
    atravessar,
    moverTravessia,
    mudarLenda,
  ])

  useEffect(() => {
    const aoEscapar = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape' || grimorio) return
      if (painel) return

      setDossieAberto(false)

      if (menuAberto) {
        menuRef.current?.focus()
      }

      setMenuAberto(false)
    }

    window.addEventListener('keydown', aoEscapar)

    return () => {
      window.removeEventListener('keydown', aoEscapar)
    }
  }, [grimorio, painel, menuAberto])

  const fecharPainel = useCallback(() => setPainel(null), [])
  const fecharGrimorio = useCallback(() => setGrimorio(false), [])

  const abrirGrimorio = useCallback(() => {
    setPainel(null)
    setDossieAberto(false)
    setMenuAberto(false)
    setGrimorio(true)
  }, [])

  const abrirPainel = (alvo: Exclude<Painel, null>) => {
    setPainel(alvo)
    setDossieAberto(false)
    setMenuAberto(false)
  }

  const fase: FaseMundo =
    cena === 'entrada' ? 'entrada' : 'travessia'
  const termoLendas = buscaLendas.trim().toLocaleLowerCase('pt-BR')
  const lendasVisiveis = lendas
    .map((item, i) => ({ item, i }))
    .filter(({ item }) =>
      `${item.nome} ${item.origem}`.toLocaleLowerCase('pt-BR').includes(termoLendas),
    )

  return (
    <main
      className={`site cena-${cena}${
        demonstracao ? ' demonstracao-assombrada' : ''
      }`}
      onTouchStart={(evento) => {
        toqueInicial.current = evento.touches[0]?.clientY ?? null
        toqueAnterior.current = toqueInicial.current
      }}
      onTouchMove={(evento) => {
        if (
          sobreposto ||
          menuAberto ||
          toqueAnterior.current === null
        ) {
          return
        }

        const atual = evento.touches[0]?.clientY

        if (atual === undefined) return

        const diferenca = toqueAnterior.current - atual
        toqueAnterior.current = atual

        if (Math.abs(diferenca) < 1) return

        if (cena === 'entrada' && diferenca < 0) return

        if (cena === 'entrada') {
          atravessar()
          return
        }

        if (cena === 'cruzando') return

        moverTravessia(diferenca / 400)
      }}
      onTouchEnd={() => {
        toqueInicial.current = null
        toqueAnterior.current = null
      }}
    >
      {Laboratorio && (
        <Suspense fallback={null}>
          <Laboratorio />
        </Suspense>
      )}

      <div className="world-layer">
        <World3D
          indiceAtivo={indice}
          deslocamento={deslocamento}
          fase={fase}
          reduzirMovimento={reduzir}
          pausado={sobreposto}
          aoNavegar={definirDeslocamento}
          aoAbrirDossie={abrirDossieDoRegistro}
        />
      </div>

      <div className="veu-escuro" aria-hidden="true" />
      <div className="veu-nevoa" aria-hidden="true" />
      <div className="film-grain" aria-hidden="true" />
      <div className="travessia-veu" aria-hidden="true" />

      <header className="menu">
        <button
          type="button"
          className="marca"
          onClick={retornar}
          aria-label="Baú das Lendas — voltar ao limiar"
        >
          Baú das Lendas
        </button>

        <button
          type="button"
          ref={menuRef}
          className="menu-alternar"
          aria-expanded={menuAberto}
          aria-controls="menu-principal"
          onClick={() => setMenuAberto((valor) => !valor)}
        >
          {menuAberto ? 'Fechar' : 'Menu'}

          <span className="menu-tracos" aria-hidden="true">
            <i />
            <i />
          </span>
        </button>

        <nav
          id="menu-principal"
          className={menuAberto ? 'aberto' : ''}
          aria-label="Principal"
        >
          <button
            type="button"
            aria-current={
              travessia && !painel && !grimorio
                ? 'page'
                : undefined
            }
            onClick={() => atravessar()}
          >
            Explorar
          </button>

          <button
            type="button"
            aria-current={painel === 'lendas' ? 'page' : undefined}
            onClick={() => abrirPainel('lendas')}
          >
            Lendas
          </button>

          <button
            type="button"
            aria-current={grimorio ? 'page' : undefined}
            onClick={abrirGrimorio}
          >
            Grimório
          </button>

          <a href="/casa/cartas.html">
            Cartas
          </a>

          <button
            type="button"
            aria-current={painel === 'portais' ? 'page' : undefined}
            onClick={() => abrirPainel('portais')}
          >
            Portais
          </button>

          <button
            type="button"
            aria-current={painel === 'conta' ? 'page' : undefined}
            onClick={() => abrirPainel('conta')}
          >
            Minha conta
          </button>

          <a className="menu-ra" href={URL_RA}>
            Invocar em RA <span aria-hidden="true">↗</span>
          </a>

          <button
            type="button"
            className="menu-movimento"
            aria-pressed={reduzir}
            title={`Movimento reduzido: ${reduzir ? 'sim' : 'não'}`}
            onClick={() => setReduzir((valor) => !valor)}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M3 9c3-5 6 5 9 0s6 5 9 0M3 15c3-5 6 5 9 0s6 5 9 0" />
              {reduzir && <path d="m5 21 14-18" />}
            </svg>

            <span className="sr-only">
              Movimento reduzido: {reduzir ? 'sim' : 'não'}
            </span>
          </button>
        </nav>
      </header>

      {cena !== 'travessia' && (
        <section
          className="limiar"
          aria-hidden={cena === 'cruzando'}
        >
          <p className="rotulo">
            A casa das lendas · sessenta registros
          </p>

          <h1>
            Esta casa guarda histórias que não querem ser encontradas.
          </h1>

          <p className="limiar-texto">
            Entre devagar. A casa se lembra de quem passa.
          </p>

          <a className="botao-ritual botao-ra" href={URL_RA}>
            Invocar o baú em RA <span aria-hidden="true">↗</span>
          </a>

          <p className="sussurro" aria-hidden="true">
            Alguns nunca saíram.
          </p>

          <p className="entrada-scroll">
            <span aria-hidden="true">↓</span>
            Role para abrir a porta
          </p>

          <button
            type="button"
            className="botao-explorar"
            onClick={() => atravessar()}
            disabled={cena === 'cruzando'}
          >
            Entrar na casa
          </button>
        </section>
      )}

      {travessia && (
        <>
          <button
            type="button"
            className="voltar"
            onClick={retornar}
          >
            ← Retornar ao limiar
          </button>

          <section className="presenca" aria-live="polite">
            <p className="presenca-id">
              Registro {numero(indice + 1)}
              <span> / {numero(lendas.length)}</span>
            </p>

            <h2 key={lenda.id}>{lenda.nome}</h2>

            <p className="presenca-sub">
              {lenda.subtitulo || lenda.origem}
            </p>

            <button
              type="button"
              className="botao-ritual"
              onClick={() => setDossieAberto(true)}
            >
              Investigar este registro
              <span aria-hidden="true">↗</span>
            </button>
          </section>

          <nav
            className="passos"
            aria-label="Navegação entre lendas"
            style={
              {
                '--percurso': `${
                  (indice / (lendas.length - 1)) * 100
                }%`,
              } as CSSProperties
            }
          >
            <button
              type="button"
              aria-label="Lenda anterior"
              onClick={() => mudarLenda(-1)}
              disabled={indice === 0}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m7 14 5-5 5 5" />
              </svg>
            </button>

            <span className="passos-contagem" aria-hidden="true">
              <strong key={indice}>
                {numero(indice + 1)}
              </strong>
              <span>/ {numero(lendas.length)}</span>
            </span>

            <span
              className="passos-eixo"
              role="progressbar"
              aria-label="Percurso pelas lendas"
              aria-valuemin={1}
              aria-valuemax={lendas.length}
              aria-valuenow={indice + 1}
            >
              <i className="passos-rastro" />
              <i className="passos-cursor" />
            </span>

            <button
              type="button"
              aria-label="Próxima lenda"
              onClick={() => mudarLenda(1)}
              disabled={indice === lendas.length - 1}
            >
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="m7 10 5 5 5-5" />
              </svg>
            </button>
          </nav>

          <p className="instrucao">
            <span
              className="instrucao-linha"
              aria-hidden="true"
            />
            Role ou deslize para avançar pelas lendas
          </p>
        </>
      )}

      <button
        type="button"
        className="grimorio-botao"
        onClick={abrirGrimorio}
      >
        <span aria-hidden="true">✦</span> Meu Grimório
      </button>
            {dossieAberto && (
        <div
          className="dossie-veu"
          onClick={() => setDossieAberto(false)}
        >
          <article
            className="dossie"
            role="dialog"
            aria-modal="true"
            aria-label={`Dossiê de ${lenda.nome}`}
            onClick={(evento) => evento.stopPropagation()}
          >
            <div className="dossie-topo">
              <span>
                Arquivo das Sombras · {numero(indice + 1)}
              </span>

              <button
                type="button"
                className="botao-discreto"
                onClick={() => setDossieAberto(false)}
                autoFocus
              >
                Fechar <span aria-hidden="true">×</span>
              </button>
            </div>

            <p className="rotulo">Documento recuperado</p>

            <h2>{lenda.nome}</h2>

            <p className="dossie-origem">
              {lenda.origem}
            </p>

            {lenda.imagem && (
              <LegendImage
                id={lenda.id}
                className="dossie-imagem"
                src={lenda.imagem}
                alt={`Ilustração de ${lenda.nome}`}
              />
            )}

            <dl className="dossie-atributos">
              {lenda.ameaca !== null && (
                <div>
                  <dt>Ameaça</dt>
                  <dd>
                    {lenda.ameaca}
                    <small>/100</small>
                  </dd>
                </div>
              )}

              {lenda.encontro !== null && (
                <div>
                  <dt>Encontro</dt>
                  <dd>
                    {lenda.encontro}
                    <small>/10</small>
                  </dd>
                </div>
              )}

              {lenda.categoria && (
                <div>
                  <dt>Categoria</dt>
                  <dd className="texto">
                    {lenda.categoria}
                  </dd>
                </div>
              )}
            </dl>

            <div className="dossie-historia">
              {lenda.historia
                .split(/\n\n+/)
                .map((paragrafo, i) => (
                  <p key={i}>{paragrafo}</p>
                ))}
            </div>

            {lenda.notaEncontro && (
              <p className="dossie-nota">
                <span>
                  Como o encontro costuma acontecer
                </span>
                {lenda.notaEncontro}
              </p>
            )}

            <div className="dossie-fim">
              <span>Fim do registro</span>

              <button
                type="button"
                className="botao-ritual"
                onClick={() => setDossieAberto(false)}
              >
                Continuar a travessia →
              </button>
            </div>
          </article>
        </div>
      )}

      {painel === 'lendas' && (
        <section
          className="painel"
          role="dialog"
          aria-modal="true"
          aria-label="Lendas"
        >
          <PainelTeclado aoFechar={fecharPainel} />

          <div className="painel-interno">
            <header className="painel-topo">
              <div>
                <p className="painel-sobre">
                  O arquivo completo
                </p>
                <h2>Lendas</h2>
              </div>

              <button
                type="button"
                className="botao-discreto"
                onClick={fecharPainel}
                autoFocus
              >
                Fechar <span aria-hidden="true">×</span>
              </button>
            </header>

            <label className="indice-busca">
              <span>Pesquisar por lenda ou origem</span>
              <input
                type="search"
                value={buscaLendas}
                onChange={(evento) => setBuscaLendas(evento.target.value)}
                placeholder="Ex.: Loira do Banheiro, Japão"
              />
            </label>

            <p className="indice-resultado" aria-live="polite">
              {lendasVisiveis.length} de {lendas.length} registros
            </p>

            <ol className="indice-lendas">
              {lendasVisiveis.map(({ item, i }) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => abrirDossieDoRegistro(i)}
                    aria-label={`Abrir dossiê de ${item.nome}, ${item.origem}`}
                  >
                    <span>{numero(i + 1)}</span>
                    {item.imagem ? (
                      <LegendImage
                        id={item.id}
                        src={item.imagem}
                        alt={`Ilustração de ${item.nome}`}
                        sizes="40px"
                        style={{ width: 32, height: 40, objectFit: 'contain' }}
                      />
                    ) : (
                      <span className="indice-sem-imagem" aria-hidden="true">◈</span>
                    )}
                    <span className="indice-lenda-detalhe">
                      <strong>{item.nome}</strong>
                      <small>{item.origem}</small>
                    </span>
                  </button>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {painel === 'portais' && (
        <Portais aoFechar={fecharPainel} />
      )}

      {painel === 'conta' && (
        <section
          className="painel"
          role="dialog"
          aria-modal="true"
          aria-label="Conta"
        >
          <PainelTeclado aoFechar={fecharPainel} />

          <div className="painel-interno painel-estreito">
            <header className="painel-topo">
              <div>
                <p className="painel-sobre">
                  Identidade
                </p>
                <h2>Conta</h2>
              </div>

              <button
                type="button"
                className="botao-discreto"
                onClick={fecharPainel}
                autoFocus
              >
                Fechar <span aria-hidden="true">×</span>
              </button>
            </header>

            <Conta
              aoExplorar={() => atravessar()}
              aoAbrirAlbum={abrirGrimorio}
            />
          </div>
        </section>
      )}

      {grimorio && (
        <Contencao aoFalhar={fecharGrimorio}>
          <Suspense fallback={null}>
            <Album aoFechar={fecharGrimorio} />
          </Suspense>
        </Contencao>
      )}
    </main>
  )
}

function PainelTeclado({
  aoFechar,
}: {
  aoFechar: () => void
}) {
  useEffect(() => {
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') {
        aoFechar()
      }
    }

    window.addEventListener('keydown', aoTeclar)

    return () => {
      window.removeEventListener('keydown', aoTeclar)
    }
  }, [aoFechar])

  return null
}
