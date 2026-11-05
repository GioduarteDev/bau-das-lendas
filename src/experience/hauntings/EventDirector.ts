export type Entidade = 'olhos' | 'espelho' | 'lobo' | 'saci' | 'alta' | 'estacao' | 'boneca' | 'boitata' | 'porta' | 'lampada' | 'sombra' | 'cortina' | 'pegada' | 'corvo' | 'retrato'
export type Categoria = 'ambiental' | 'intermediario' | 'marcante'
export type Evento = {
  id:string; nome:string; entidade:Entidade; lenda:string|null
  posicao:[number,number,number]; regiao:[number,number]; indice:number
  gatilho:'entrada'|'permanencia'|'olhar'|'revisita'|'inspecao'
  permanencia:number; condicoes:{ distancia:number; velocidadeMax:number }
  duracao:number; cooldown:number; probabilidade:number; prioridade:number
  intensidade:number; categoria:Categoria; reset:'sessao'|'revisita'|'cooldown'
}
export type ContextoEvento = {
  delta:number; cameraZ:number; indice:number; velocidade:number; habilitado:boolean
  atencao:(evento:Evento)=>boolean; inspecionado?:string|null
}
export type Execucao = { evento:Evento; decorrido:number; duracao:number; forçado:boolean }
type Estado = { estado:'aguardando'|'executando'|'cooldown'|'concluido'|'ignorado'|'erro'; visitas:number; ultimaVisitaExecutada:number; dentro:boolean; permanencia:number; sorteado:boolean; aprovado:boolean; ultimaExecucao:number; execucoes:number; erro:string|null }
export type EfeitosEvento = { iniciar:(execucao:Execucao)=>void; atualizar:(execucao:Execucao)=>void; limpar:(execucao:Execucao)=>void }

/** Relógio de simulação: pausa de painel/aba não consome duração ou cooldown. */
export function criarDiretor(eventos:Evento[], efeitos:EfeitosEvento, random= Math.random) {
  if(new Set(eventos.map(e=>e.id)).size!==eventos.length)throw Error('IDs de eventos duplicados')
  for(const e of eventos)if(!Number.isFinite(e.duracao)||!Number.isFinite(e.cooldown)||!Number.isFinite(e.probabilidade)||e.duracao<=0||e.cooldown<0||e.probabilidade<0||e.probabilidade>1)throw Error(`Configuração inválida: ${e.id}`)
  const estados=new Map<string,Estado>(eventos.map(e=>[e.id,{estado:'aguardando',visitas:0,ultimaVisitaExecutada:0,dentro:false,permanencia:0,sorteado:false,aprovado:false,ultimaExecucao:-Infinity,execucoes:0,erro:null}]))
  let tempo=0, ultimoFim=-20, ativo:Execucao|null=null, descartado=false
  let silencioAte=0
  const erros:{id:string;mensagem:string}[]=[]
  const falhar=(id:string,erro:unknown)=>{const mensagem=erro instanceof Error?erro.message:String(erro);estados.get(id)!.erro=mensagem;estados.get(id)!.estado='erro';erros.push({id,mensagem})}
  const encerrar=()=>{
    if(!ativo)return
    const anterior=ativo;ativo=null
    try{efeitos.limpar(anterior)}catch(e){falhar(anterior.evento.id,e)}
    const s=estados.get(anterior.evento.id)!
    s.ultimaExecucao=tempo
    if(s.estado!=='erro')s.estado=anterior.evento.reset==='sessao'?'concluido':'cooldown'
    ultimoFim=tempo
    silencioAte=tempo+(anterior.evento.categoria==='marcante'?8:anterior.evento.categoria==='intermediario'?4:2)
  }
  const iniciar=(evento:Evento,forcado=false,duracao=evento.duracao)=>{
    if(descartado)return false
    encerrar()
    const s=estados.get(evento.id)!
    ativo={evento,decorrido:0,duracao:Number.isFinite(duracao)?Math.max(.25,Math.min(30,duracao)):evento.duracao,forçado:forcado}
    s.estado='executando';s.execucoes++;s.erro=null;s.ultimaVisitaExecutada=s.visitas
    try{efeitos.iniciar(ativo);return true}catch(e){falhar(evento.id,e);encerrar();return false}
  }
  return {
    atualizar(ctx:ContextoEvento) {
      if(descartado||!ctx.habilitado)return
      const dt=Math.max(0,Math.min(.1,ctx.delta));tempo+=dt
      for(const e of eventos) {
        const s=estados.get(e.id)!
        const dentro=ctx.indice>=e.regiao[0]&&ctx.indice<=e.regiao[1]&&Math.abs(ctx.cameraZ-(-2.5-e.indice*7))<e.condicoes.distancia
        if(dentro&&!s.dentro){s.visitas++;s.sorteado=false;s.permanencia=0;if(e.reset==='revisita'&&s.estado!=='erro')s.estado='aguardando'}
        if(!dentro)s.permanencia=0
        else if(Math.abs(ctx.velocidade)<=e.condicoes.velocidadeMax)s.permanencia+=dt
        s.dentro=dentro
        if(s.estado==='cooldown'&&tempo-s.ultimaExecucao>=e.cooldown)s.estado='aguardando'
      }
      if(ativo) {
        ativo.decorrido+=dt
        try{efeitos.atualizar(ativo)}catch(e){falhar(ativo.evento.id,e);encerrar();return}
        if(ativo&&ativo.decorrido>=ativo.duracao)encerrar()
        return
      }
      if(tempo<silencioAte)return
      const elegiveis=eventos.filter(e=>{
        const s=estados.get(e.id)!
        if(!s.dentro||s.estado!=='aguardando'||s.permanencia<e.permanencia||tempo-s.ultimaExecucao<e.cooldown)return false
        if(e.categoria==='marcante'&&tempo-ultimoFim<5)return false
        if(e.gatilho==='olhar'&&!ctx.atencao(e))return false
        if(e.gatilho==='inspecao'&&ctx.inspecionado!==e.id)return false
        if(e.gatilho==='revisita'&&s.visitas<2)return false
        if(e.reset==='revisita'&&s.visitas<=s.ultimaVisitaExecutada)return false
        if(!s.sorteado){s.sorteado=true;s.aprovado=random()<e.probabilidade;if(!s.aprovado)s.estado='ignorado'}
        return s.aprovado
      }).sort((a,b)=>b.prioridade-a.prioridade)
      if(elegiveis[0])iniciar(elegiveis[0])
    },
    forcar(id:string,duracao?:number) {const e=eventos.find(e=>e.id===id||e.entidade===id);return e?iniciar(e,true,duracao):false},
    cancelar:encerrar,
    resetar() {encerrar();tempo=0;ultimoFim=-20;silencioAte=0;estados.forEach(s=>Object.assign(s,{estado:'aguardando',visitas:0,ultimaVisitaExecutada:0,dentro:false,permanencia:0,sorteado:false,aprovado:false,ultimaExecucao:-Infinity,execucoes:0,erro:null}));erros.length=0},
    get ativo(){return ativo},
    get tempo(){return tempo},
    get silencioAte(){return silencioAte},
    inspecionar(){return {tempo,silencioAte,ativo:ativo?{id:ativo.evento.id,entidade:ativo.evento.entidade,decorrido:ativo.decorrido,duracao:ativo.duracao,forcado:ativo.forçado}:null,estados:eventos.map(e=>({id:e.id,...estados.get(e.id)})),erros:[...erros]}},
    dispose(){encerrar();descartado=true},
  }
}
