import { useEffect,useState } from 'react'
import type { Evento } from './EventDirector'
import './panel.css'

type Snapshot={fase:string;catalogo:Evento[];cameraZ:number;mediaMs:number;chamadas:number;diretor:{ativo:{id:string;decorrido:number;duracao:number}|null;estados:{id:string;estado:string;execucoes:number;erro:string|null}[];erros:{id:string;mensagem:string}[]}}
type API={inspecionar:()=>Snapshot;disparar:(id:string,duracao?:number)=>boolean;localizar:(id:string)=>void;resetar:()=>void;pausar:(valor:boolean)=>void}
const api=()=> (window as Window&{__bauAssombracoes?:API}).__bauAssombracoes

export default function HauntingPanel(){
  const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[id,setId]=useState('olhos-limiar'),[duracao,setDuracao]=useState(4),[pausa,setPausa]=useState(false),[aberto,setAberto]=useState(true)
  useEffect(()=>{const timer=window.setInterval(()=>{const a=api();if(a)setSnapshot(a.inspecionar())},350);return()=>window.clearInterval(timer)},[])
  const evento=snapshot?.catalogo.find(e=>e.id===id),estado=snapshot?.diretor.estados.find(e=>e.id===id)
  return <aside className="assombracoes-painel" aria-label="Laboratório de assombrações" onPointerUp={e=>e.stopPropagation()} onKeyDown={e=>e.stopPropagation()}>
    <button onClick={()=>setAberto(!aberto)} aria-expanded={aberto}>{aberto?'Recolher laboratório':'Abrir laboratório'}</button>
    {aberto&&<>
      <strong>Laboratório de assombrações · DEV</strong>
      <label>Evento<select aria-label="Evento sobrenatural" value={id} onChange={e=>{setId(e.target.value);setDuracao(snapshot?.catalogo.find(v=>v.id===e.target.value)?.duracao??4)}}>{snapshot?.catalogo.map(e=><option key={e.id} value={e.id}>{e.nome}</option>)}</select></label>
      <label>Duração (s)<input aria-label="Duração do evento" type="number" min=".5" max="30" step=".5" value={duracao} onChange={e=>setDuracao(Number(e.target.value))}/></label>
      <div><button disabled={snapshot?.fase!=='travessia'} onClick={()=>api()?.disparar(id,duracao)}>Disparar aqui</button> <button onClick={()=>api()?.localizar(id)}>Ir ao local</button></div>
      <div><button onClick={()=>{api()?.pausar(!pausa);setPausa(!pausa)}}>{pausa?'Continuar cena':'Pausar cena'}</button> <button onClick={()=>api()?.resetar()}>Resetar eventos</button></div>
      <p>{evento?`Registro ${evento.indice+1} · ${evento.gatilho} · ${evento.posicao.map(v=>v.toFixed(1)).join(', ')}`:'Preparando cena…'}</p>
      <output>{estado?.estado} · {estado?.execucoes??0} execução(ões)<br/>{snapshot?.diretor.ativo?`${snapshot.diretor.ativo.id} · ${snapshot.diretor.ativo.decorrido.toFixed(1)} / ${snapshot.diretor.ativo.duracao.toFixed(1)} s`:'Atmosfera em repouso'}<br/>{snapshot?.mediaMs.toFixed(1)} ms · {snapshot?.chamadas} draw calls · câmera Z {snapshot?.cameraZ.toFixed(1)}</output>
      {!!snapshot?.diretor.erros.length&&<pre role="alert">{JSON.stringify(snapshot.diretor.erros)}</pre>}
      {snapshot?.fase==='entrada'&&<p>Entre pelo botão Explorar para disparar.</p>}
    </>}
  </aside>
}
