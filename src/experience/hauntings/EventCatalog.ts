import type { Evento, Entidade, Categoria } from './EventDirector.ts'

export const SEQUENCIA_APRESENTACAO=['espelho-loira','lobo-stumpp','saci-redemoinho','alta-colunas','boitata-cinzas']

export function criarCatalogo(lendas:{id:string}[],demonstracao=false):Evento[] {
  const indice=(id:string,fallback:number)=>Math.max(0,lendas.findIndex(l=>l.id===id)===-1?fallback:lendas.findIndex(l=>l.id===id))
  const criar=(id:string,nome:string,entidade:Entidade,i:number,categoria:Categoria,lenda:string|null=null,extra:Partial<Evento>={}):Evento=>({
    id,nome,entidade,lenda,indice:i,posicao:[0,1.8,-8-i*7+1.6],regiao:[i,i],
    gatilho:'entrada',permanencia:.3,condicoes:{distancia:5.5,velocidadeMax:18},
    duracao:4,cooldown:65,probabilidade:1,prioridade:categoria==='marcante'?80:categoria==='intermediario'?50:20,
    intensidade:.8,categoria,reset:'sessao',...extra,
  })
  const catalogo=[
    criar('olhos-limiar','À espreita','olhos',2,'intermediario',null,{gatilho:'permanencia',permanencia:.8,duracao:3.8,posicao:[2.8,2.4,-8-2*7]}),
    criar('espelho-loira','O reflexo atrás de você','espelho',indice('loira-do-banheiro',0),'intermediario','loira-do-banheiro',{gatilho:'olhar',permanencia:1.1,duracao:5.8,posicao:[2.25,1.85,-6.2]}),
    criar('espelho-atraso','O reflexo ficou para trás','espelho',indice('loira-do-banheiro',0),'intermediario','loira-do-banheiro',{gatilho:'revisita',reset:'revisita',cooldown:45,permanencia:1,duracao:3.8,posicao:[2.25,1.85,-6.2]}),
    criar('lobo-stumpp','A travessia de Stumpp','lobo',indice('peter-stumpp',11),'marcante','peter-stumpp',{duracao:4.4}),
    criar('saci-redemoinho','O dono da corrente de ar','saci',31,'marcante',null,{duracao:5.1}),
    criar('alta-colunas','Entre duas colunas','alta',indice('hachishakusama',5),'marcante','hachishakusama',{duracao:4.5}),
    criar('kisaragi-zero','Plataforma zero','estacao',indice('kisaragi-station',4),'intermediario','kisaragi-station',{gatilho:'permanencia',permanencia:.9,duracao:5.5}),
    criar('boneca-ilha','Ela olhou de volta','boneca',indice('a-ilha-das-bonecas',18),'intermediario','a-ilha-das-bonecas',{gatilho:'olhar',duracao:4.2,reset:'revisita',cooldown:25}),
    criar('boitata-cinzas','O fogo que se move','boitata',indice('boitata',54),'marcante','boitata',{duracao:5.4}),
    criar('olhos-retorno','A mesma janela','olhos',36,'intermediario',null,{gatilho:'revisita',reset:'revisita',probabilidade:.8,duracao:3.6,posicao:[3.1,2.8,-8-36*7-1]}),
    criar('olhos-fundo','Um último observador','olhos',55,'intermediario',null,{gatilho:'olhar',probabilidade:.85,duracao:3.2,posicao:[-2.4,2.1,-8-55*7-3]}),
    criar('porta-respira','Madeira inquieta','porta',7,'ambiental',null,{duracao:3.4,probabilidade:.8}),
    criar('porta-banheiro','A porta do banheiro está entreaberta','porta',20,'ambiental',null,{gatilho:'permanencia',permanencia:1,duracao:3.6,probabilidade:.8,cooldown:100}),
    criar('lampada-falha','A luz vacila','lampada',9,'ambiental',null,{duracao:3,probabilidade:.8,reset:'cooldown'}),
    criar('sombra-janela','Uma passagem do outro lado','sombra',15,'ambiental',null,{duracao:3.5,probabilidade:.75}),
    criar('retrato-inquieto','A pessoa no retrato mudou','retrato',26,'ambiental',null,{gatilho:'permanencia',permanencia:1.2,duracao:4.2,probabilidade:.8,cooldown:90}),
    criar('cortina-corrente','Ar sem origem','cortina',24,'ambiental',null,{duracao:4,probabilidade:.85}),
    criar('pegada-umida','Alguém passou','pegada',40,'ambiental',null,{gatilho:'revisita',reset:'revisita',duracao:5,probabilidade:1}),
    criar('objeto-inspecao','A marca sob os dedos','pegada',22,'ambiental',null,{gatilho:'inspecao',duracao:5,reset:'cooldown',cooldown:25}),
    criar('corvo-janela','Uma ave desperta','corvo',42,'intermediario',null,{duracao:3.6,probabilidade:.85}),
    criar('luz-distante','A última lanterna','lampada',48,'ambiental',null,{duracao:4,probabilidade:.7}),
  ]
  // Removemos as aparições de olhos isolados: não comunicam uma lenda reconhecível
  // e interrompem a imersão. Mantemos eventos narrativos e ambientais.
  const eventosNarrativos = catalogo.filter(e => e.entidade !== 'olhos')
  // Uma rota compacta de cinco baias; a exploração normal mantém as 60 posições.
  if(demonstracao)return SEQUENCIA_APRESENTACAO.map((id,i)=>{
    const e=eventosNarrativos.find(e=>e.id===id)!
    return {...e,indice:i,regiao:[i,i],posicao:[e.entidade==='espelho'?.75:e.entidade==='olhos'?1.1:0,e.entidade==='olhos'?2.1:e.posicao[1],-8-i*7+1.6],probabilidade:1,gatilho:'entrada',permanencia:.5,reset:'sessao'} as Evento
  })
  return eventosNarrativos
}
