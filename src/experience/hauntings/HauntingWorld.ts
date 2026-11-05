import * as THREE from 'three'
import { Reflector } from 'three/addons/objects/Reflector.js'
import { criarSistemaCriaturas } from '../creatures/CreatureSystem'
import type { TipoCriatura } from '../creatures/CreatureModels'
import type { criarAtmosfera } from '../Atmosfera'
import type { Evento, Execucao, Entidade } from './EventDirector.ts'

type Instalacao={root:THREE.Group; entidade:Entidade; mover?:THREE.Object3D; cortina?:THREE.Mesh; olhos?:THREE.Group[]; material?:THREE.MeshStandardMaterial; textura?:THREE.CanvasTexture; relogio?:THREE.Group; tubo?:THREE.Mesh; visitas?:number; marcada?:boolean; base:THREE.Vector3}

export function criarMundoAssombrado(scene:THREE.Scene,camera:THREE.PerspectiveCamera,atmosfera:ReturnType<typeof criarAtmosfera>,mobile:boolean,apresentacao:boolean) {
  const recursos=new Set<{dispose():void}>(),instalacoes=new Map<string,Instalacao>()
  const guardar=<T extends {dispose():void}>(r:T)=>{recursos.add(r);return r}
  const criaturas=guardar(criarSistemaCriaturas(scene,mobile))
  const esfera=guardar(new THREE.SphereGeometry(1,12,10)),caixa=guardar(new THREE.BoxGeometry(1,1,1))
  const madeira=guardar(new THREE.MeshStandardMaterial({color:0x302017,roughness:.92,metalness:.07}))
  const breu=guardar(new THREE.MeshStandardMaterial({color:0x050505,roughness:1}))
  const bronze=guardar(new THREE.MeshStandardMaterial({color:0x665039,roughness:.78,metalness:.55}))
  const palido=guardar(new THREE.MeshStandardMaterial({color:0xbcb49c,roughness:.9,transparent:true}))
  const efeitoLuz=new THREE.PointLight(0xffbe7a,0,15,2);scene.add(efeitoLuz)
  const vetor=new THREE.Vector3(),frente=new THREE.Vector3(),mundo=new THREE.Vector3()
  let ativo:Execucao|null=null,ultimaPerturbacao=-99,tempo=0,reflexos=0,ultimaReflexao=-99,forcarReflexao=false,ultimoClique:string|null=null
  let mirror:Reflector|null=null,ghost:THREE.Group|null=null,ghostMat:THREE.MeshStandardMaterial|null=null
  const stats={reflexos:0,ghostNaCameraPrincipal:false,espelhoPixels:mobile?256:512,efeitosAtivos:0}
  const mesh=(pai:THREE.Object3D,geo:THREE.BufferGeometry,mat:THREE.Material,p:number[],s:number[])=>{const m=new THREE.Mesh(geo,mat);m.position.fromArray(p);m.scale.fromArray(s);pai.add(m);return m}
  const label=(texto:string)=>{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=192
    const ctx=canvas.getContext('2d')!
    ctx.fillStyle='#1c211e';ctx.fillRect(0,0,512,192);ctx.strokeStyle='#867759';ctx.lineWidth=5;ctx.strokeRect(9,9,494,174)
    ctx.fillStyle='#d8c49b';ctx.font='26px Georgia';ctx.textAlign='center';ctx.fillText(texto,256,75)
    ctx.font='17px Georgia';ctx.fillText('きさらぎ　·　PLATAFORMA',256,120)
    const textura=guardar(new THREE.CanvasTexture(canvas));textura.colorSpace=THREE.SRGBColorSpace
    return textura
  }
  const desenharRetrato=(canvas:HTMLCanvasElement,alterado:boolean)=>{
    const ctx=canvas.getContext('2d')!,w=canvas.width,h=canvas.height
    ctx.fillStyle='#594a38';ctx.fillRect(0,0,w,h)
    const fundo=ctx.createRadialGradient(w*.5,h*.4,5,w*.5,h*.45,w*.72)
    fundo.addColorStop(0,'#a69575');fundo.addColorStop(1,'#282522');ctx.fillStyle=fundo;ctx.fillRect(8,8,w-16,h-16)
    ctx.fillStyle='#292622';ctx.beginPath();ctx.ellipse(w*.5,h*.95,w*.34,h*.42,0,Math.PI,Math.PI*2);ctx.fill()
    ctx.fillStyle='#b9a585';ctx.beginPath();ctx.ellipse(w*.5,h*.43,w*.17,h*.25,0,0,Math.PI*2);ctx.fill()
    ctx.fillStyle='#41362a';ctx.beginPath();ctx.ellipse(w*.5,h*.31,w*.18,h*.16,0,Math.PI,Math.PI*2);ctx.fill()
    ctx.fillRect(w*.32,h*.3,w*.04,h*.18);ctx.fillRect(w*.64,h*.3,w*.04,h*.18)
    ctx.strokeStyle='#211c17';ctx.lineWidth=5
    for(const x of [w*.43,w*.57]){
      ctx.beginPath();ctx.moveTo(x-9,h*.43);ctx.lineTo(x+9,h*.43);ctx.stroke()
      if(alterado){ctx.fillStyle='#17120e';ctx.fillRect(x+(x<w*.5?11:-11),h*.415,7,18)}
    }
    if(alterado){
      ctx.strokeStyle='rgba(55,20,20,.75)';ctx.lineWidth=3
      ctx.beginPath();ctx.moveTo(w*.37,h*.59);ctx.lineTo(w*.64,h*.56);ctx.stroke()
      ctx.fillStyle='rgba(25,18,14,.72)';ctx.fillRect(w*.44,h*.39,w*.12,h*.08)
    }else{
      ctx.beginPath();ctx.moveTo(w*.46,h*.59);ctx.quadraticCurveTo(w*.5,h*.62,w*.54,h*.59);ctx.stroke()
    }
    ctx.strokeStyle='rgba(20,16,12,.3)';ctx.lineWidth=1
    for(let i=0;i<90;i++){const x=(i*67)%w,y=(i*113)%h;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(i%9)-4,y+7+i%13);ctx.stroke()}
  }
  const instalar=(e:Evento,forcado=false)=>{
    const key=e.entidade==='espelho'?'espelho':e.id
    let item=instalacoes.get(key)
    if(item)return item
    const root=new THREE.Group();root.name=e.id
    root.position.fromArray(e.posicao)
    if(forcado){root.position.z=camera.position.z-(e.entidade==='boitata'?13:e.entidade==='alta'?12:6);root.position.x=e.entidade==='espelho'?.65:e.entidade==='olhos'?1.1:0}
    else if(mobile)root.position.x*=e.entidade==='espelho'?.28:.35
    scene.add(root)
    item={root,entidade:e.entidade,base:root.position.clone()};instalacoes.set(key,item)
    if(e.entidade==='espelho') {
      root.rotation.y=-.12
      const g=guardar(new THREE.PlaneGeometry(1.45,2.4))
      mirror=new Reflector(g,{textureWidth:mobile?256:512,textureHeight:mobile?384:768,color:0x9d9c92,clipBias:.003,multisample:0})
      guardar(mirror);mirror.camera.layers.enable(1);root.add(mirror)
      mesh(root,caixa,madeira,[0,0,-.09],[1.68,2.68,.15])
      for(const x of [-.79,.79])mesh(root,caixa,bronze,[x,0,.04],[.12,2.68,.16])
      for(const y of [-1.29,1.29])mesh(root,caixa,bronze,[0,y,.04],[1.68,.10,.16])
      mesh(root,caixa,madeira,[0,-1.63,0],[1.35,.62,.38])
      const grime=document.createElement('canvas');grime.width=grime.height=128;const c=grime.getContext('2d')!
      const grad=c.createRadialGradient(64,64,20,64,64,88);grad.addColorStop(0,'rgba(33,24,14,0)');grad.addColorStop(1,'rgba(33,24,14,.8)');c.fillStyle=grad;c.fillRect(0,0,128,128)
      for(let i=0;i<110;i++){c.fillStyle=`rgba(60,43,23,${.02+(i%7)*.01})`;c.fillRect((i*43)%128,(i*71)%128,2,6)}
      const tex=guardar(new THREE.CanvasTexture(grime));const mat=guardar(new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,opacity:.48}))
      mesh(root,g,mat,[0,0,.008],[1,1,1])
      ghost=new THREE.Group();ghost.name='presenca-somente-reflexo';ghostMat=guardar(new THREE.MeshStandardMaterial({color:0xd9d3bd,emissive:0x393329,emissiveIntensity:.35,transparent:true,opacity:0,roughness:1}))
      const gown=guardar(new THREE.LatheGeometry([new THREE.Vector2(.36,0),new THREE.Vector2(.3,.5),new THREE.Vector2(.17,1.1),new THREE.Vector2(.22,1.35)],20))
      mesh(ghost,gown,ghostMat,[0,0,0],[1,1,1]);mesh(ghost,esfera,ghostMat,[0,1.57,0],[.14,.23,.13])
      mesh(ghost,esfera,breu,[0,1.58,-.055],[.18,.27,.13]);mesh(ghost,esfera,ghostMat,[0,1.58,.11],[.105,.18,.065]);mesh(ghost,esfera,breu,[-.15,1.32,0],[.065,.42,.07]);mesh(ghost,esfera,breu,[.15,1.32,0],[.065,.42,.07])
      for(const x of [-.22,.22])mesh(ghost,esfera,ghostMat,[x,.95,0],[.05,.37,.055])
      ghost.traverse(o=>o.layers.set(1));ghost.visible=false;scene.add(ghost)
      const original=mirror.onBeforeRender.bind(mirror)
      mirror.onBeforeRender=(...args)=>{
        if(Math.abs(camera.position.z-root.position.z)>15)return
        const atraso=ativo?.evento.id==='espelho-atraso'?.28:mobile?1/12:1/18
        if(!forcarReflexao&&tempo-ultimaReflexao<atraso)return
        forcarReflexao=false;ultimaReflexao=tempo
        original(...args);reflexos++;stats.reflexos=reflexos
      }
    } else if(e.entidade==='olhos') {
      root.position.y=0
      root.scale.setScalar(e.id==='olhos-retorno'?.85:e.id==='olhos-fundo'?1.15:1)
      mesh(root,caixa,breu,[0,e.posicao[1],-.11],[.95,1.25,.15])
      for(const x of [-.49,.49])mesh(root,caixa,madeira,[x,1.55,0],[.09,3.1,.13])
      mesh(root,caixa,madeira,[0,3.08,0],[1.1,.12,.18]);mesh(root,caixa,madeira,[0,.15,0],[1.15,.3,.48])
      mesh(root,caixa,madeira,[0,.85,-.06],[.94,1.4,.12])
      const mat=guardar(new THREE.MeshStandardMaterial({color:0x776242,emissive:0xbf7a37,emissiveIntensity:apresentacao?1.8:.9,transparent:true,opacity:0,roughness:.2}))
      item.material=mat;item.olhos=[]
      const head=new THREE.Group();head.position.y=e.posicao[1];root.add(head);item.mover=head
      for(const x of [-.115,.115]){
        const eye=new THREE.Group();eye.position.x=x;head.add(eye);item.olhos.push(eye)
        mesh(eye,esfera,mat,[0,0,0],[.073,.035,.028]);mesh(eye,esfera,breu,[0,0,.026],[.014,.027,.009])
      }
    } else if(e.entidade==='boneca') {
      root.position.x=mobile?.85:2.35;root.position.y=1.15
      mesh(root,caixa,madeira,[0,-.7,0],[.75,.75,.65])
      mesh(root,esfera,madeira,[0,-.22,0],[.17,.25,.12])
      const head=new THREE.Group();head.position.y=.13;root.add(head);item.mover=head
      mesh(head,esfera,palido,[0,0,0],[.18,.21,.15]);mesh(head,esfera,breu,[0,.08,-.04],[.2,.19,.12])
      for(const x of [-.065,.065])mesh(head,esfera,breu,[x,.02,.14],[.032,.027,.015])
      for(const x of [-.22,.22])mesh(root,esfera,palido,[x,-.19,0],[.045,.23,.045])
      for(const x of [-.09,.09])mesh(root,esfera,palido,[x,-.57,.08],[.05,.17,.05])
    } else if(e.entidade==='estacao') {
      root.position.set(mobile?0:1.8,3.45,root.position.z-.8)
      item.textura=label('KISARAGI　·　01')
      item.material=guardar(new THREE.MeshStandardMaterial({map:item.textura,roughness:.9,emissive:0x554229,emissiveIntensity:.3}))
      mesh(root,guardar(new THREE.PlaneGeometry(2.7,1)),item.material,[0,0,0],[1,1,1])
      const clock=new THREE.Group();clock.position.set(-1.65,-.1,0);root.add(clock);item.relogio=clock
      mesh(clock,esfera,bronze,[0,0,0],[.35,.35,.06])
      mesh(clock,caixa,breu,[0,.10,.07],[.025,.23,.025]);mesh(clock,caixa,breu,[.09,0,.07],[.2,.025,.025])
    } else if(e.entidade==='retrato') {
      root.position.set(-3.85,2.35,root.position.z)
      root.rotation.y=Math.PI/2
      const moldura=guardar(new THREE.BoxGeometry(1.3,1.72,.16))
      mesh(root,moldura,madeira,[0,0,-.08],[1,1,1])
      const canvas=document.createElement('canvas');canvas.width=256;canvas.height=384;desenharRetrato(canvas,false)
      item.textura=guardar(new THREE.CanvasTexture(canvas));item.textura.colorSpace=THREE.SRGBColorSpace
      item.material=guardar(new THREE.MeshStandardMaterial({map:item.textura,roughness:.96,emissive:0x21180e,emissiveIntensity:.05}))
      mesh(root,guardar(new THREE.PlaneGeometry(1.06,1.48)),item.material,[0,0,.012],[1,1,1])
      for(const x of [-.61,.61])mesh(root,caixa,bronze,[x,0,.035],[.045,1.66,.08])
      for(const y of [-.82,.82])mesh(root,caixa,bronze,[0,y,.035],[1.25,.045,.08])
    } else if(e.entidade==='boitata') {
      root.position.set(0,.7,forcado?camera.position.z-13:e.posicao[2]-7)
      const n=mobile?70:130,geo=guardar(new THREE.BufferGeometry())
      geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(n*3),3).setUsage(THREE.DynamicDrawUsage))
      const mat=guardar(new THREE.PointsMaterial({color:0xe3a251,size:.11,transparent:true,opacity:0,depthWrite:false,blending:THREE.AdditiveBlending}))
      const serpent=new THREE.Points(geo,mat);serpent.frustumCulled=false;root.add(serpent);item.mover=serpent
      const tube=guardar(new THREE.BufferGeometry()),positions=new Float32Array(n*6*3),normals=new Float32Array(n*6*3),indices:number[]=[]
      for(let i=0;i<n;i++)for(let j=0;j<6;j++){const a=j/6*Math.PI*2,k=(i*6+j)*3;normals[k+1]=Math.cos(a);normals[k+2]=Math.sin(a);if(i<n-1){const k0=i*6+j,k1=i*6+(j+1)%6;indices.push(k0,k1,k0+6,k1,k1+6,k0+6)}}
      tube.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));tube.setAttribute('normal',new THREE.BufferAttribute(normals,3));tube.setIndex(indices)
      const bodyMat=guardar(new THREE.MeshStandardMaterial({color:0x684020,emissive:0xc57c2a,emissiveIntensity:.8,transparent:true,opacity:0,roughness:.8}))
      item.tubo=new THREE.Mesh(tube,bodyMat);item.tubo.frustumCulled=false;root.add(item.tubo)
    } else if(e.entidade==='sombra') {
      root.position.x=mobile?1.15:3.2;root.position.y=2.1
      const pane=guardar(new THREE.MeshStandardMaterial({color:0x50616a,emissive:0x293943,emissiveIntensity:.4,roughness:.8}))
      mesh(root,caixa,pane,[0,0,-.1],[1.35,2,.05])
      for(const x of [-.7,.7])mesh(root,caixa,madeira,[x,-.5,0],[.08,3.1,.12])
      const silhouette=new THREE.Group();root.add(silhouette);item.mover=silhouette
      mesh(silhouette,esfera,breu,[0,.35,0],[.13,.17,.04]);mesh(silhouette,esfera,breu,[0,-.15,0],[.22,.43,.04]);silhouette.visible=false
    } else if(['cortina','sombra','lampada'].includes(e.entidade)) {
      root.position.x=mobile?1.1:3.2;root.position.y=1.6
      mesh(root,caixa,breu,[0,0,-.08],[1.05,2.8,.12])
      const pivot=new THREE.Group();pivot.position.x=-.48;root.add(pivot);item.mover=pivot
      const mat=e.entidade==='cortina'?guardar(new THREE.MeshStandardMaterial({color:0x5b3930,roughness:1,side:THREE.DoubleSide})):madeira
      if(e.entidade==='cortina'){
        const cloth=guardar(new THREE.PlaneGeometry(.95,2.6,16,24)),p=cloth.attributes.position as THREE.BufferAttribute
        for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*Math.PI*12)*.045)
        cloth.computeVertexNormals();item.cortina=mesh(pivot,cloth,mat,[.48,0,.03],[1,1,1])
      } else mesh(pivot,caixa,mat,[.48,0,.02],[.95,2.6,.075])
      mesh(root,caixa,madeira,[0,-1.45,.04],[1.15,.3,.4])
      if(e.entidade==='lampada'){const m=guardar(new THREE.MeshStandardMaterial({color:0xbb9862,emissive:0xe4ab55,emissiveIntensity:.4}));item.material=m;mesh(root,esfera,m,[0,1.55,.15],[.16,.22,.16])}
    } else if(e.entidade==='pegada') {
      root.position.set(.5,.025,root.position.z+1)
      const mat=guardar(new THREE.MeshStandardMaterial({color:0x141519,roughness:.08,metalness:.45,transparent:true,opacity:0}));item.material=mat
      for(let i=0;i<5;i++){const foot=mesh(root,esfera,mat,[i%2?.18:-.18,0,-i*.65],[.085,.006,.21]);foot.rotation.y=i%2?-.12:.1}
      // Pequeno objeto de inspeção sempre visível; o clique revela a marca no piso.
      if(e.gatilho==='inspecao')mesh(root,caixa,bronze,[0,.3,-.4],[.26,.45,.16])
    }
    item.base.copy(root.position)
    return item
  }
  const posicaoEvento=(e:Evento,forcado:boolean)=>{
    const indiceCamera=Math.max(0,Math.round((-2.5-camera.position.z)/7))
    const z=forcado?Math.max(camera.position.z-8,-8-indiceCamera*7+1.6):e.posicao[2]
    return z
  }
  const limpar=(_exec?:Execucao)=>{
    criaturas.ocultar();efeitoLuz.intensity=0;efeitoLuz.color.setHex(0xffbe7a)
    if(ghost){ghost.visible=false;forcarReflexao=true}
    for(const item of instalacoes.values()) {
      if(item.material){if(item.material.transparent)item.material.opacity=0;if(item.material.emissive)item.material.emissiveIntensity=item.material.map?.3:0}
      if(item.entidade==='retrato'&&item.textura){desenharRetrato(item.textura.image as HTMLCanvasElement,false);item.textura.needsUpdate=true;if(item.material)item.material.emissiveIntensity=.05;item.marcada=false}
      if(item.mover){item.mover.rotation.set(0,0,0);if(item.mover instanceof THREE.Points)(item.mover.material as THREE.PointsMaterial).opacity=0}
      if(item.tubo)(item.tubo.material as THREE.MeshStandardMaterial).opacity=0
      if(item.entidade==='sombra'&&item.mover){item.mover.visible=false;item.mover.scale.setScalar(1)}
      if(item.textura&&item.marcada){const c=item.textura.image.getContext('2d') as CanvasRenderingContext2D;c.fillStyle='#1c211e';c.fillRect(12,16,488,70);c.fillStyle='#d8c49b';c.font='26px Georgia';c.textAlign='center';c.fillText('KISARAGI　·　01',256,65);item.textura.needsUpdate=true;item.marcada=false}
    }
    ativo=null;stats.efeitosAtivos=0
  }
  return {
    instalar,
    iniciar(exec:Execucao) {
      limpar();ativo=exec;ultimaPerturbacao=-99;stats.efeitosAtivos=1
      const e=exec.evento
      // Ocultação temporária da aparição preta de olhos luminosos.
      if(e.entidade==='olhos')return
      if(['lobo','saci','alta','corvo'].includes(e.entidade)){
        const tipo=e.entidade as TipoCriatura,g=criaturas.grupo(tipo);criaturas.preparar(tipo)
        g.position.set(tipo==='alta'?(mobile?.7:1.6):0,tipo==='corvo'?3.3:0,tipo==='alta'?posicaoEvento(e,exec.forçado)-9:tipo==='corvo'?posicaoEvento(e,exec.forçado)-3:posicaoEvento(e,exec.forçado))
        if(tipo==='saci') {
          const papel=instalar(e,exec.forçado);papel.root.position.set(.6,.12,g.position.z)
          if(!papel.mover)papel.mover=mesh(papel.root,guardar(new THREE.PlaneGeometry(.18,.25)),palido,[0,0,0],[1,1,1])
        }
      } else {
        const item=instalar(e,exec.forçado)
        if(exec.forçado){item.root.position.z=camera.position.z-(e.entidade==='boitata'?13:6);item.base.copy(item.root.position)}
        if(e.entidade==='boneca'){item.visitas=(item.visitas??0)+1;item.root.position.x=item.base.x+(item.visitas%2?.12:-.12)}
      }
      if(e.entidade==='saci')atmosfera.perturbar({posicao:new THREE.Vector3(1,.4,posicaoEvento(e,exec.forçado)),intensidade:.8,giro:2,duracao:1.5})
    },
    atualizar(exec:Execucao) {
      ativo=exec
      const e=exec.evento,t=exec.decorrido,p=Math.min(1,t/exec.duracao),reduzir=document.documentElement.dataset.reduzir==='true'
      if(e.entidade==='olhos')return
      const a=Math.min(1,p*8,(1-p)*8)*e.intensidade
      const ante=e.entidade==='lobo'? .18:e.entidade==='saci'?.16:0
      const q=THREE.MathUtils.clamp((p-ante)/(1-ante),0,1),m=q*q*(3-2*q)
      if(['lobo','saci','alta','corvo'].includes(e.entidade)) {
        const tipo=e.entidade as TipoCriatura,g=criaturas.grupo(tipo)
        if(tipo==='lobo')g.position.x=reduzir?0:-5.8+m*11.6
        if(tipo==='saci'){const r=q<.4?q:q<.58?.4:.4+(q-.58)/.42*.6;g.position.x=reduzir?1:2.6-r*5.2;g.rotation.y=q>.65?-.7:.12}
        if(tipo==='alta'){g.rotation.z=reduzir?-.025:-.025+Math.sin(t*.3)*.008;g.rotation.y=.08}
        if(tipo==='corvo'){g.position.x=-3.6+m*8;g.position.y=3.3+Math.sin(m*Math.PI)*.8;g.rotation.y=.3}
        if(tipo==='saci') {const papel=instalacoes.get(e.id);if(papel?.mover){papel.mover.position.set(Math.sin(t*2)*.25,.07+Math.sin(p*Math.PI)*.18,0);papel.mover.rotation.set(-Math.PI/2,0,reduzir?0:t*.7)}}
        criaturas.atualizar(tipo,{tempo:t,distancia:m*11.6,progresso:q,opacidade:p<ante?0:a,reduzir},camera.position.distanceTo(g.position),atmosfera.stats.mediaMs)
        if(t-ultimaPerturbacao>.3&&!reduzir){ultimaPerturbacao=t;atmosfera.perturbar({posicao:g.position,raio:3,intensidade:tipo==='saci'?.7:.3,giro:tipo==='saci'?1.6:.2})}
        if(tipo==='lobo'&&p<ante){efeitoLuz.position.set(0,3.5,g.position.z);efeitoLuz.intensity=Math.sin(p/ante*Math.PI)*9}
      } else {
        const item=instalar(e,exec.forçado)
        if(e.entidade==='espelho'&&ghost&&ghostMat) {
          ghost.visible=p>.26&&p<.79
          ghostMat.opacity=Math.min(1,Math.max(0,(p-.26)*9),Math.max(0,(.79-p)*10))*.85
          item.root.getWorldPosition(mundo)
          ghost.position.copy(mundo).sub(mirror!.camera.position).normalize().multiplyScalar(mundo.distanceTo(camera.position)+1.3).add(mundo)
          ghost.position.y=.10
          ghost.rotation.y=Math.PI;ghost.position.x+=reduzir?0:Math.sin(t*.5)*.12
          forcarReflexao=p>.25&&p<.29||p>.78&&p<.82
          if(t-ultimaPerturbacao>1.5){ultimaPerturbacao=t;atmosfera.perturbar({posicao:item.root.position,intensidade:.2,raio:2})}
        } else if(e.entidade==='estacao'&&item.textura) {
          if(p>.3&&!item.marcada){
          const c=item.textura.image.getContext('2d') as CanvasRenderingContext2D
          c.fillStyle='#1c211e';c.fillRect(12,16,488,70);c.fillStyle=p>.3?'#dbc29b':'#938468';c.font='26px Georgia';c.textAlign='center';c.fillText(p>.3?'KISARAGI　·　00 / ∞':'KISARAGI　·　01',256,65);item.textura.needsUpdate=true
          item.marcada=true}
          efeitoLuz.position.set(0,2,item.root.position.z-7);efeitoLuz.intensity=a*10
          if(item.relogio)item.relogio.rotation.z=reduzir?0:Math.sin(t*.4)*.008
        } else if(e.entidade==='retrato'&&item.textura&&item.material) {
          if(p>.24&&!item.marcada){desenharRetrato(item.textura.image as HTMLCanvasElement,true);item.textura.needsUpdate=true;item.marcada=true}
          item.material.emissiveIntensity=.05+a*.14
        } else if(e.entidade==='boneca'&&item.mover) {
          item.mover.rotation.z=reduzir?-.10:-.22*THREE.MathUtils.smoothstep(p,.2,.65)
          item.mover.rotation.y=THREE.MathUtils.clamp((camera.position.x-item.root.position.x)*.13,-.4,.4)
          efeitoLuz.position.copy(item.root.position).add(new THREE.Vector3(-.3,.5,1));efeitoLuz.intensity=a*4
        } else if(e.entidade==='boitata'&&item.mover instanceof THREE.Points) {
          const attr=item.mover.geometry.attributes.position as THREE.BufferAttribute
          const tt=reduzir?0:t,avanco=reduzir?.5:m
          for(let i=0;i<attr.count;i++){const u=i/(attr.count-1);attr.setXYZ(i,-3.9+avanco*7.8-u*3.3,.45+Math.sin(u*8-tt*1.8)*.22,-u*2+Math.cos(u*7-tt)*.22)}
          attr.needsUpdate=true;(item.mover.material as THREE.PointsMaterial).opacity=a*.7
          if(item.tubo){const tubeAttr=item.tubo.geometry.attributes.position as THREE.BufferAttribute;for(let i=0;i<attr.count;i++)for(let j=0;j<6;j++){const angle=j/6*Math.PI*2,r=.045*(1-i/attr.count*.75);tubeAttr.setXYZ(i*6+j,attr.getX(i),attr.getY(i)+Math.cos(angle)*r,attr.getZ(i)+Math.sin(angle)*r)}tubeAttr.needsUpdate=true;(item.tubo.material as THREE.MeshStandardMaterial).opacity=a*.7}
          efeitoLuz.color.setHex(0xe4973f);efeitoLuz.position.set(-3.9+m*7.8,1,item.root.position.z);efeitoLuz.intensity=a*14
        } else if(e.entidade==='pegada'&&item.material)item.material.opacity=a*.68
        else if(e.entidade==='porta'&&item.mover)item.mover.rotation.y=reduzir?.09:Math.sin(p*Math.PI)*.17
        else if(e.entidade==='cortina'&&item.mover){item.mover.rotation.x=reduzir?0:Math.sin(t*1.6)*.07;item.mover.rotation.z=reduzir?0:Math.sin(t*1.3)*.03;if(item.cortina&&!reduzir){const a=item.cortina.geometry.attributes.position as THREE.BufferAttribute;for(let i=0;i<a.count;i++)a.setZ(i,Math.sin(a.getX(i)*Math.PI*12)*.045+Math.sin(a.getY(i)*2+t)*.025);a.needsUpdate=true}}
        else if(e.entidade==='sombra'&&item.mover){item.mover.visible=true;item.mover.position.x=-.55+m*1.1;item.mover.scale.setScalar(Math.sin(p*Math.PI))}
        else if(e.entidade==='lampada'&&item.material){const pulse=reduzir?.6:.35+.25*Math.sin(t*3.1)*Math.sin(t*1.3);item.material.emissiveIntensity=pulse;efeitoLuz.position.copy(item.root.position);efeitoLuz.intensity=a*pulse*12}
      }
    },
    limpar,
    quadro(delta:number,eventos:Evento[]) {
      tempo+=delta
      for(const e of eventos)if(['espelho','boneca','estacao','lampada','cortina','sombra','pegada','retrato'].includes(e.entidade)&&Math.abs(camera.position.z-e.posicao[2])<24){const i=instalar(e);i.root.visible=true}
      for(const i of instalacoes.values())i.root.visible=Math.abs(camera.position.z-i.root.position.z)<30
      stats.ghostNaCameraPrincipal=!!ghost&&camera.layers.test(ghost.layers)
    },
    observar(e:Evento) {
      const item=instalar(e);item.root.getWorldPosition(mundo);camera.getWorldDirection(frente);vetor.copy(mundo).sub(camera.position).normalize()
      return frente.dot(vetor)>(mobile?.82:.87)
    },
    inspecionar(){return {criaturas:criaturas.inspecionar(),...stats,instalacoes:[...instalacoes.entries()].map(([id,i])=>({id,posicao:i.root.position.toArray(),visivel:i.root.visible,retratoAlterado:i.entidade==='retrato'&&!!i.marcada})),espelho:mirror?{camadaReflexo:mirror.camera.layers.mask,camadaEntidade:ghost?.layers.mask,entidadeVisivel:ghost?.visible,posicaoEntidade:ghost?.position.toArray(),pixels:mirror.getRenderTarget().width}:null}},
    clicar(ray:THREE.Raycaster) {
      ultimoClique=null
      const hits=ray.intersectObjects([...instalacoes.values()].map(i=>i.root),true)
      if(hits[0])for(const [id,i] of instalacoes)if(i.root.getObjectById(hits[0].object.id))ultimoClique=id
      return ultimoClique
    },
    dispose(){limpar();instalacoes.forEach(i=>i.root.removeFromParent());ghost?.removeFromParent();efeitoLuz.removeFromParent();efeitoLuz.dispose();recursos.forEach(r=>r.dispose());recursos.clear()},
  }
}
