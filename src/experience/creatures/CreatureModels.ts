import * as THREE from 'three'
import { fasePata, joelhoIK, superficieOrganica } from './OrganicGeometry'
import type { Volume } from './OrganicGeometry'

export type TipoCriatura = 'lobo' | 'saci' | 'corvo' | 'alta'
export type PoseCriatura = { tempo: number; distancia: number; progresso: number; opacidade: number; reduzir: boolean; parado?: boolean; altura?:number }
export type Criatura = ReturnType<typeof criarCriatura>

function random(seed: number) {
  let n = seed
  return () => { n = (Math.imul(n, 1664525) + 1013904223) >>> 0; return n / 4294967296 }
}

function texturasPelo() {
  const rnd = random(47), size = 256
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#4c4238'; ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 9500; i++) {
    const x = rnd() * size, y = rnd() * size, claro = rnd()
    ctx.strokeStyle = claro < 0.48 ? `rgba(14,12,10,${0.15+rnd()*0.45})` : `rgba(158,143,121,${0.15+rnd()*0.4})`
    ctx.lineWidth = 0.45 + rnd() * 0.7
    ctx.beginPath(); ctx.moveTo(x,y); ctx.quadraticCurveTo(x+3,y+4,x+2+rnd()*5,y+7+rnd()*12); ctx.stroke()
  }
  const cor = new THREE.CanvasTexture(canvas); cor.colorSpace = THREE.SRGBColorSpace
  cor.wrapS = cor.wrapT = THREE.RepeatWrapping
  const pixels = ctx.getImageData(0,0,size,size).data
  const normal = new Uint8Array(size*size*4)
  const altura = (x: number, y: number) => pixels[((y+size)%size*size+(x+size)%size)*4] / 255
  for (let y=0;y<size;y++) for(let x=0;x<size;x++) {
    const n = new THREE.Vector3((altura(x-1,y)-altura(x+1,y))*1.6,(altura(x,y-1)-altura(x,y+1))*1.6,1).normalize()
    const i=(y*size+x)*4
    normal[i]=(n.x*.5+.5)*255; normal[i+1]=(n.y*.5+.5)*255; normal[i+2]=(n.z*.5+.5)*255; normal[i+3]=255
  }
  const relevo = new THREE.DataTexture(normal,size,size); relevo.needsUpdate=true
  relevo.wrapS=relevo.wrapT=THREE.RepeatWrapping
  const card = document.createElement('canvas'); card.width=64; card.height=128
  const c = card.getContext('2d')!
  c.fillStyle='#000'; c.fillRect(0,0,64,128)
  for(let i=0;i<25;i++) {
    const x=5+rnd()*54
    c.strokeStyle=`rgba(255,255,255,${0.5+rnd()*.5})`; c.lineWidth=0.8+rnd()*1.5
    c.beginPath(); c.moveTo(x,128); c.quadraticCurveTo(x+4,64,32+(x-32)*.25,rnd()*30); c.stroke()
  }
  const alpha = new THREE.CanvasTexture(card)
  return { cor, relevo, alpha }
}

/** Recursos autorais, gerados apenas na primeira aparição de cada espécie. */
export function criarCriatura(tipo: TipoCriatura, mobile = false) {
  const root = new THREE.Group(); root.name = `criatura-${tipo}`
  const recursos = new Set<{ dispose(): void }>()
  const guardar = <T extends { dispose(): void }>(r: T) => { recursos.add(r); return r }
  const materiais: THREE.MeshStandardMaterial[] = []
  const mat = (cor: number, extra: THREE.MeshStandardMaterialParameters = {}) => {
    const m = guardar(new THREE.MeshStandardMaterial({ color: cor, roughness: .92, metalness: 0, transparent: true, ...extra }))
    materiais.push(m); return m
  }
  const esfera = guardar(new THREE.SphereGeometry(1, mobile ? 12 : 20, mobile ? 9 : 14))
  const elipsoide = (parent: THREE.Object3D, material: THREE.Material, xyz: number[], escala: number[]) => {
    const m = new THREE.Mesh(esfera, material); m.position.fromArray(xyz); m.scale.fromArray(escala); parent.add(m); return m
  }
  const osso = (parent: THREE.Object3D, material: THREE.Material, comprimento: number, raioA: number, raioB: number) => {
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(0,-comprimento*.45,0.03),new THREE.Vector3(0,-comprimento,0)])
    const geo = guardar(new THREE.TubeGeometry(curva, 8, 1, mobile ? 7 : 10, false))
    const p=geo.attributes.position as THREE.BufferAttribute
    for(let i=0;i<p.count;i++) {
      const t=Math.max(0,Math.min(1,-p.getY(i)/comprimento))
      const r=THREE.MathUtils.lerp(raioA,raioB,t)*(1+Math.sin(t*Math.PI)*.18)
      p.setXYZ(i,p.getX(i)*r,p.getY(i),p.getZ(i)*r)
    }
    geo.computeVertexNormals()
    const mesh=new THREE.Mesh(geo,material); parent.add(mesh); return mesh
  }
  const ligar = (mesh: THREE.Mesh, inicio: THREE.Vector3, fim: THREE.Vector3) => {
    mesh.position.copy(inicio)
    direcao.copy(fim).sub(inicio).normalize()
    mesh.quaternion.setFromUnitVectors(baixo,direcao)
  }
  const instanciar=(parent:THREE.Object3D,geo:THREE.BufferGeometry,material:THREE.Material,poses:{pos:number[];escala?:number[];rz?:number;ry?:number}[])=>{
    const mesh=guardar(new THREE.InstancedMesh(geo,material,poses.length)),dummy=new THREE.Object3D()
    poses.forEach((pose,i)=>{dummy.position.fromArray(pose.pos);dummy.scale.fromArray(pose.escala??[1,1,1]);dummy.rotation.set(0,pose.ry??0,pose.rz??0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix)})
    mesh.instanceMatrix.needsUpdate=true;parent.add(mesh);return mesh
  }
  const baixo=new THREE.Vector3(0,-1,0), direcao=new THREE.Vector3()
  const textura = tipo === 'lobo' ? texturasPelo() : null
  if(textura) Object.values(textura).forEach(guardar)
  const sombraMat = guardar(new THREE.ShaderMaterial({
    transparent:true, depthWrite:false,
    uniforms:{ uAlpha:{value:.44} },
    vertexShader:'varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader:'varying vec2 vUv; uniform float uAlpha; void main(){float d=length((vUv-.5)*2.0); gl_FragColor=vec4(.008,.004,.003,exp(-d*d*4.0)*(1.0-smoothstep(.55,1.0,d))*uAlpha);}',
  }))
  const sombra=new THREE.Mesh(guardar(new THREE.PlaneGeometry(1,1)),sombraMat)
  sombra.rotation.x=-Math.PI/2; sombra.position.y=.018
  sombra.scale.set(tipo==='lobo'?4.3:tipo==='alta'?1.5:1.1,tipo==='lobo'?1.8:.8,1); root.add(sombra)
  const detalhes=new THREE.Group(); root.add(detalhes)
  let animar = (_pose: PoseCriatura) => {}
  let ajustarLOD = (_distancia: number, _mediaMs: number) => {}
  let opacidadeAnterior = -1
  const diagnostico: { patas: { x:number;y:number;z:number;contato:boolean }[]; pelagem:number; superficieContinua:boolean; sombraY:number } = { patas:[], pelagem:0, superficieContinua:false, sombraY:.018 }
  const posicaoSombra=new THREE.Vector3()

  if(tipo==='lobo') {
    const pelo=mat(0xb8ab97,{map:textura!.cor,normalMap:textura!.relevo,normalScale:new THREE.Vector2(.65,.65)})
    const escuro=mat(0x171512,{roughness:.58}), boca=mat(0x231011), dente=mat(0xc7b895,{roughness:.52})
    const olho=mat(0xb78b4e,{emissive:0x5e300e,emissiveIntensity:.45,roughness:.3})
    const volumes: Volume[] = [
      [-.42,1.58,0,1.12,.55,.47],[-1.13,1.50,0,.52,.49,.39],
      [.50,1.83,0,.63,.72,.58],[.76,1.35,0,.42,.51,.40],
      [.99,2.08,0,.49,.53,.41],[1.34,2.30,0,.43,.37,.32],
      [1.72,2.17,0,.48,.20,.23],[1.96,2.15,0,.27,.15,.19],
      [-.3,1.98,0,.94,.24,.32],
    ]
    const geo=guardar(superficieOrganica(volumes,mobile?.12:.085))
    diagnostico.superficieContinua=true
    const base=new THREE.Bone(), lombar=new THREE.Bone(), peito=new THREE.Bone(), cabeca=new THREE.Bone()
    lombar.position.set(-.65,1.55,0); peito.position.set(1.1,.23,0); cabeca.position.set(.82,.42,0)
    base.add(lombar); lombar.add(peito); peito.add(cabeca); root.add(base)
    const skeleton=guardar(new THREE.Skeleton([base,lombar,peito,cabeca]))
    root.updateMatrixWorld(true)
    const atribuirPele = (g: THREE.BufferGeometry) => {
      const p=g.attributes.position, indices:number[]=[], weights:number[]=[]
      for(let i=0;i<p.count;i++) {
        const x=p.getX(i)
        const t=THREE.MathUtils.smoothstep(x,-.7,.6), h=THREE.MathUtils.smoothstep(x,.95,1.5)
        indices.push(1,2,3,0); weights.push((1-t)*(1-h),t*(1-h),h,0)
      }
      g.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4)); g.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4))
    }
    atribuirPele(geo)
    const corpo=new THREE.SkinnedMesh(geo,pelo); root.add(corpo); corpo.bind(skeleton); corpo.frustumCulled=false
    // Tufos de geometria com alpha recortado: mais longos na crina e no peito.
    const rnd=random(83), pos=geo.attributes.position, normal=geo.attributes.normal
    const hairPos:number[]=[], hairUv:number[]=[], hairNormal:number[]=[]
    const p=new THREE.Vector3(), n=new THREE.Vector3(), tangent=new THREE.Vector3(), tip=new THREE.Vector3(), side=new THREE.Vector3()
    const tufos=mobile?1500:4200
    for(let i=0;i<tufos;i++) {
      const idx=Math.floor(rnd()*pos.count)
      p.fromBufferAttribute(pos,idx); n.fromBufferAttribute(normal,idx)
      const crina=p.x>-.7&&p.x<1.25&&p.y>1.75
      const comprimento=(crina?.13:.05)+rnd()*(crina?.12:.075)
      tangent.set(-.8,-.5,0).addScaledVector(n,-new THREE.Vector3(-.8,-.5,0).dot(n)).normalize()
      side.crossVectors(n,tangent).normalize().multiplyScalar(.008+rnd()*.012)
      tip.copy(p).addScaledVector(n,comprimento*.55).addScaledVector(tangent,comprimento)
      const a=p.clone().sub(side), b=p.clone().add(side), meio=p.clone().lerp(tip,.65).addScaledVector(n,.02)
      const vertices=[a,b,meio,b,tip,meio,tip,a,meio]
      const uv=[[0,1],[1,1],[.5,.35],[1,1],[.5,0],[.5,.35],[.5,0],[0,1],[.5,.35]]
      vertices.forEach((v,j)=>{hairPos.push(v.x,v.y,v.z);hairNormal.push(n.x,n.y,n.z);hairUv.push(...uv[j])})
    }
    const hairGeo=guardar(new THREE.BufferGeometry())
    hairGeo.setAttribute('position',new THREE.Float32BufferAttribute(hairPos,3)); hairGeo.setAttribute('normal',new THREE.Float32BufferAttribute(hairNormal,3)); hairGeo.setAttribute('uv',new THREE.Float32BufferAttribute(hairUv,2))
    atribuirPele(hairGeo)
    const hairMat=mat(0x493c30,{map:textura!.cor,alphaMap:textura!.alpha,alphaTest:.26,side:THREE.DoubleSide,transparent:false})
    const hair=new THREE.SkinnedMesh(hairGeo,hairMat); root.add(hair); hair.bind(skeleton); hair.frustumCulled=false
    diagnostico.pelagem=tufos
    ajustarLOD=(distancia,mediaMs)=>{
      const fator=distancia>24?.30:mediaMs>36?.6:1
      hairGeo.setDrawRange(0,Math.floor(tufos*fator)*9)
    }
    // Os detalhes faciais acompanham o osso do crânio.
    const face=new THREE.Group(); face.position.set(-1.27,-2.20,0); cabeca.add(face)
    elipsoide(face,escuro,[2.10,2.15,0],[.16,.12,.19])
    const mandibula=new THREE.Group(); mandibula.position.set(1.43,2.05,0); face.add(mandibula)
    elipsoide(mandibula,boca,[.28,-.01,0],[.45,.10,.18])
    elipsoide(mandibula,pelo,[.26,-.11,0],[.44,.11,.20])
    const toothGeo=guardar(new THREE.ConeGeometry(.037,.14,7))
    const dentes:{pos:number[];rz:number}[]=[]
    for(const lado of [-1,1]) {
      for(let i=0;i<5;i++) {
        dentes.push({pos:[1.55+i*.10,2.04,lado*.15],rz:Math.PI})
      }
      const earGeo=guardar(new THREE.ConeGeometry(.19,.56,9)); earGeo.scale(1,1,.52)
      const ear=new THREE.Mesh(earGeo,pelo); ear.position.set(1.20,2.72,lado*.27); ear.rotation.x=lado*.18; ear.rotation.z=.13; face.add(ear)
      const inner=new THREE.Mesh(guardar(new THREE.ConeGeometry(.10,.34,7)),escuro); inner.scale.z=.2; inner.position.set(1.23,2.74,lado*.32); face.add(inner)
      elipsoide(face,olho,[1.58,2.37,lado*.283],[.069,.041,.028])
      elipsoide(face,escuro,[1.56,2.43,lado*.29],[.11,.035,.04]).rotation.z=-.15
    }
    instanciar(face,toothGeo,dente,dentes)
    const pernas: { anca: THREE.Vector3; joelho: THREE.Vector3; pe: THREE.Vector3; alto:THREE.Mesh; baixo:THREE.Mesh; pata:THREE.Group; offset:number; traseira:boolean }[]=[]
    for(const traseira of [false,true]) for(const lado of [-1,1]) {
      const anca=new THREE.Vector3(traseira?-1.02:.63,traseira?1.43:1.72,lado*(traseira?.39:.47))
      const alto=osso(root,pelo,traseira?.72:.85,traseira?.28:.22,.13)
      const baixoMesh=osso(root,pelo,traseira?.77:.86,.13,.075)
      const pata=new THREE.Group(); root.add(pata)
      elipsoide(pata,pelo,[.08,0,0],[.24,.13,.16])
      instanciar(pata,esfera,escuro,Array.from({length:3},(_,j)=>({pos:[.27,-.015,(j-1)*.095],escala:[.10,.045,.036]})))
      pernas.push({anca,joelho:new THREE.Vector3(),pe:new THREE.Vector3(),alto,baixo:baixoMesh,pata,offset:(traseira?.53:0)+(lado>0?.09:0),traseira})
    }
    const cauda=new THREE.Group(); cauda.position.set(-1.35,1.58,0); root.add(cauda)
    const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(),new THREE.Vector3(-.35,-.22,0),new THREE.Vector3(-.8,-.45,.06),new THREE.Vector3(-1.10,-.33,.08)])
    const tailGeo=guardar(new THREE.TubeGeometry(tailCurve,16,.16,10,false))
    const tailPos=tailGeo.attributes.position as THREE.BufferAttribute
    for(let i=0;i<tailPos.count;i++){const t=Math.min(1,Math.abs(tailPos.getX(i))/1.2);tailPos.setZ(i,tailPos.getZ(i)*(1-t*.65))}
    cauda.add(new THREE.Mesh(tailGeo,pelo))
    // Tufos secundários nas patas/cauda são volumes afilados foscos.
    const tufoGeo=guardar(new THREE.ConeGeometry(.085,.33,5))
    for(const perna of pernas) instanciar(perna.alto,tufoGeo,pelo,Array.from({length:mobile?3:6},(_,i)=>({pos:[(i%2?1:-1)*.07,-.15-i*.08,.03],rz:.5})))
    animar=pose=>{
      const ritmo=pose.parado||pose.reduzir?0:pose.distancia/1.55*Math.PI*2
      const bounce=pose.parado||pose.reduzir?0:Math.sin(ritmo*2)*.045
      lombar.rotation.z=Math.sin(ritmo)*.045; peito.rotation.z=-Math.sin(ritmo+.5)*.045; cabeca.rotation.z=Math.sin(ritmo+.8)*.035
      lombar.position.y=1.55+bounce
      mandibula.rotation.z=-.06-Math.sin(ritmo*.5)*.025
      cauda.rotation.y=Math.sin(ritmo*.55)*.17; cauda.rotation.z=Math.sin(ritmo+.6)*.10
      diagnostico.patas.length=0
      for(const p of pernas) {
        const fase=pose.parado||pose.reduzir?{x:0,y:.12,contato:true}:fasePata(pose.distancia,p.offset)
        p.pe.set(p.anca.x+fase.x,fase.y,p.anca.z)
        const hip=p.anca.clone(); hip.y+=bounce
        joelhoIK(hip,p.pe,p.traseira?.72:.85,p.traseira?.77:.86,p.traseira?1:-1,p.joelho)
        ligar(p.alto,hip,p.joelho); ligar(p.baixo,p.joelho,p.pe); p.pata.position.copy(p.pe)
        p.pata.rotation.z=fase.contato?0:Math.sin(ritmo+p.offset*Math.PI*2)*.18
        diagnostico.patas.push({x:p.pe.x,y:p.pe.y,z:p.pe.z,contato:fase.contato})
      }
      detalhes.visible=!mobile&&pose.opacidade>.05
    }
  } else if(tipo==='saci') {
    const pele=mat(0x5a3020,{roughness:.83}), roupa=mat(0x382a28), gorro=mat(0x9e292c,{roughness:1}), preto=mat(0x15110f), olhos=mat(0xc9ae81)
    const quadril=new THREE.Group(); quadril.position.y=.74; root.add(quadril)
    elipsoide(quadril,roupa,[0,.02,0],[.20,.18,.14])
    const torso=new THREE.Group(); torso.position.y=.12; quadril.add(torso)
    // Perfil contínuo do tronco, com cintura e caixa torácica distintas.
    const perfil=[new THREE.Vector2(.13,0),new THREE.Vector2(.15,.08),new THREE.Vector2(.185,.26),new THREE.Vector2(.20,.36),new THREE.Vector2(.13,.43),new THREE.Vector2(.075,.48)]
    torso.add(new THREE.Mesh(guardar(new THREE.LatheGeometry(perfil,20)),pele))
    const head=new THREE.Group(); head.position.y=.56; torso.add(head)
    elipsoide(head,pele,[0,.06,0],[.16,.205,.15])
    for(const side of [-1,1]) {
      elipsoide(head,pele,[side*.16,.06,0],[.043,.07,.045])
      elipsoide(head,preto,[side*.064,.085,.132],[.043,.027,.02])
      elipsoide(head,olhos,[side*.062,.085,.148],[.018,.014,.008])
      elipsoide(head,preto,[side*.063,.13,.12],[.055,.016,.018]).rotation.z=side*-.14
    }
    elipsoide(head,pele,[0,.035,.159],[.037,.045,.047])
    elipsoide(head,preto,[0,-.025,.135],[.058,.009,.013])
    const capCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,.22,0),new THREE.Vector3(0,.36,0),new THREE.Vector3(.07,.52,0),new THREE.Vector3(.18,.49,.01)])
    const capGeo=guardar(new THREE.TubeGeometry(capCurve,20,1,16,false))
    const cp=capGeo.attributes.position as THREE.BufferAttribute, centers=capCurve.getPoints(20)
    for(let i=0;i<cp.count;i++) {const row=Math.floor(i/17),c=centers[Math.min(20,row)],r=.16*(1-row/21)+.008;cp.setXYZ(i,c.x+(cp.getX(i)-c.x)*r,c.y+(cp.getY(i)-c.y)*r,c.z+(cp.getZ(i)-c.z)*r)}
    capGeo.computeVertexNormals(); head.add(new THREE.Mesh(capGeo,gorro))
    const brim=new THREE.Mesh(guardar(new THREE.TorusGeometry(.15,.026,8,24)),gorro); brim.rotation.x=Math.PI/2; brim.position.y=.22; head.add(brim)
    const arms:THREE.Group[]=[]
    for(const side of [-1,1]) {
      const arm=new THREE.Group(); arm.position.set(side*.18,.34,0);torso.add(arm)
      osso(arm,pele,.23,.058,.045)
      const forearm=new THREE.Group(); forearm.position.y=-.22;forearm.rotation.x=-.5;arm.add(forearm)
      osso(forearm,pele,.23,.045,.031);elipsoide(forearm,pele,[0,-.25,.02],[.045,.065,.026]);arms.push(arm)
    }
    const pernaAlto=osso(root,pele,.34,.085,.06), pernaBaixo=osso(root,pele,.36,.058,.035)
    const pe=new THREE.Group();root.add(pe);elipsoide(pe,pele,[0,0,.07],[.067,.052,.16])
    const anca=new THREE.Vector3(), foot=new THREE.Vector3(), knee=new THREE.Vector3()
    const vorticePos=new Float32Array((mobile?55:110)*3)
    const vorticeGeo=guardar(new THREE.BufferGeometry());vorticeGeo.setAttribute('position',new THREE.BufferAttribute(vorticePos,3).setUsage(THREE.DynamicDrawUsage))
    const vorticeMat=guardar(new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uAlpha:{value:0}},
      vertexShader:'void main(){vec4 p=modelViewMatrix*vec4(position,1.0);gl_Position=projectionMatrix*p;gl_PointSize=clamp(20.0/max(.2,-p.z),1.0,7.0);}',
      fragmentShader:'uniform float uAlpha;void main(){float a=1.0-smoothstep(.1,.5,length(gl_PointCoord-.5));gl_FragColor=vec4(.52,.32,.20,a*uAlpha);}' }))
    const vortice=new THREE.Points(vorticeGeo,vorticeMat);vortice.frustumCulled=false;root.add(vortice)
    animar=pose=>{
      const p=pose.progresso
      const pausa=p>.39&&p<.59
      const ciclo=pose.reduzir?0:pose.tempo*3.2
      const salto=pose.parado||pausa||pose.reduzir?0:Math.sin(THREE.MathUtils.euclideanModulo(ciclo,1)*Math.PI)*.34
      root.position.y=salto
      quadril.rotation.z=pose.reduzir?0:Math.sin(ciclo*Math.PI*2)*.045
      torso.rotation.x=pausa?-.06:.12
      head.rotation.y=pausa?Math.sin((p-.39)/.2*Math.PI)*-.48:Math.sin(ciclo)*.15
      arms.forEach((a,i)=>{a.rotation.z=(i?1:-1)*(.24+salto*.8);a.rotation.x=Math.sin(ciclo*Math.PI*2+i)*.45})
      anca.set(0,.74,0); foot.set(Math.sin(ciclo*Math.PI*2)*.045,.055+salto*.22,0)
      joelhoIK(anca,foot,.34,.36,-1,knee);ligar(pernaAlto,anca,knee);ligar(pernaBaixo,knee,foot);pe.position.copy(foot)
      sombra.position.y=.018-salto;sombraMat.uniforms.uAlpha.value=pose.opacidade*(.36-salto*.5)
      diagnostico.patas=[{x:foot.x,y:foot.y+salto,z:0,contato:salto<.025}]
      const fuga=pose.reduzir?0:THREE.MathUtils.smoothstep(p,.64,.88)*(1-THREE.MathUtils.smoothstep(p,.94,1))
      vortice.visible=fuga>.01;vorticeMat.uniforms.uAlpha.value=fuga*pose.opacidade*.7
      if(vortice.visible) {
        for(let i=0;i<vorticePos.length/3;i++) {
          const h=THREE.MathUtils.euclideanModulo(i*.017+pose.tempo*.25,1),a=i*2.4+pose.tempo*7,r=.16+h*.38
          vorticePos[i*3]=Math.cos(a)*r;vorticePos[i*3+1]=h*1.8-salto;vorticePos[i*3+2]=Math.sin(a)*r
        }
        vorticeGeo.attributes.position.needsUpdate=true
      }
    }
  } else if(tipo==='corvo') {
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128
    const ctx=canvas.getContext('2d')!;ctx.fillStyle='#737d86';ctx.fillRect(0,0,128,128)
    for(let y=0;y<128;y+=2) {
      ctx.strokeStyle=y%6===0?'#a1a6a8':'#57606a';ctx.lineWidth=.6
      for(let x=0;x<128;x+=16){ctx.beginPath();ctx.moveTo(x,y+5);ctx.lineTo(x+8,y);ctx.lineTo(x+16,y+5);ctx.stroke()}
    }
    const plumas=guardar(new THREE.CanvasTexture(canvas));plumas.colorSpace=THREE.SRGBColorSpace;plumas.wrapS=plumas.wrapT=THREE.RepeatWrapping
    const penas=mat(0x292b30,{map:plumas,bumpMap:plumas,bumpScale:.018,roughness:.72,metalness:.08}), pontas=mat(0x16171a,{map:plumas,roughness:.9}), bico=mat(0x25211d,{roughness:.5}), olhos=mat(0x12100d,{roughness:.22})
    elipsoide(root,penas,[-.04,0,0],[.38,.22,.18]).rotation.z=.10
    elipsoide(root,penas,[.25,.17,0],[.16,.21,.14])
    elipsoide(root,penas,[.39,.27,0],[.19,.16,.14])
    const beak=new THREE.Mesh(guardar(new THREE.ConeGeometry(.075,.31,10)),bico);beak.rotation.z=-Math.PI/2;beak.position.set(.63,.245,0);beak.scale.z=.7;root.add(beak)
    for(const side of [-1,1])elipsoide(root,olhos,[.44,.30,side*.128],[.026,.026,.014])
    const wings:THREE.Group[]=[], tips:THREE.Group[]=[]
    for(const side of [-1,1]) {
      const wing=new THREE.Group();wing.position.set(.05,.08,side*.13);root.add(wing);wings.push(wing)
      elipsoide(wing,penas,[-.05,0,side*.24],[.27,.065,.36]).rotation.y=side*-.30
      const tip=new THREE.Group();tip.position.set(-.12,0,side*.47);wing.add(tip);tips.push(tip)
      instanciar(tip,esfera,penas,Array.from({length:8},(_,i)=>({pos:[-.06-i*.04,0,side*(.11+i*.065)],escala:[.11,.015,.28+(7-i)*.018],ry:side*(.25+i*.07)})))
    }
    const tail=new THREE.Group();tail.position.set(-.33,-.02,0);root.add(tail)
    instanciar(tail,esfera,pontas,Array.from({length:5},(_,i)=>({pos:[-.2,0,(i-2)*.045],escala:[.30,.018,.055],ry:(i-2)*.09})))
    for(const side of [-1,1]) {
      const leg=osso(root,bico,.18,.017,.012);leg.position.set(-.03,-.12,side*.09)
      instanciar(leg,esfera,bico,Array.from({length:3},(_,i)=>({pos:[.04,-.18,(i-1)*.025],escala:[.07,.012,.012]})))
    }
    animar=pose=>{
      const t=pose.reduzir?0:pose.tempo
      const pousado=pose.parado||pose.progresso<.18
      const batida=Math.sin(t*10.5)
      wings.forEach((wing,i)=>{const side=i?1:-1;wing.rotation.x=side*(pousado?1.25:batida*.72);tips[i].rotation.x=side*(pousado?.7:Math.sin(t*10.5-.5)*.3)})
      tail.rotation.y=Math.sin(t*1.7)*.08;tail.rotation.z=pousado?-.12:Math.sin(t*3)*.06
      sombra.position.y=.018-root.position.y-(pose.altura??0)
      sombra.scale.set(1.2+(pose.altura??0)*.2,.7+(pose.altura??0)*.1,1)
      sombraMat.uniforms.uAlpha.value=pose.opacidade*.2
    }
  } else {
    const tecido=mat(0xb9b5a3,{roughness:1}), pele=mat(0xb7a993,{roughness:.95}), cabelo=mat(0x141211)
    const dress:THREE.Vector2[]=[]
    for(let i=0;i<=25;i++){const y=i/25*2.75;dress.push(new THREE.Vector2(.6-y*.10+Math.sin(i*.8)*.018,y))}
    const vestido=new THREE.Mesh(guardar(new THREE.LatheGeometry(dress,mobile?20:36)),tecido);root.add(vestido)
    elipsoide(root,tecido,[0,2.72,0],[.37,.25,.23])
    const head=new THREE.Group();head.position.y=3.19;root.add(head)
    elipsoide(head,cabelo,[0,.02,-.02],[.20,.34,.19]);elipsoide(head,pele,[0,.08,.11],[.13,.23,.10])
    for(const side of [-1,1]) {
      const arm=osso(root,tecido,1.13,.13,.07);arm.position.set(side*.34,2.76,0);arm.rotation.z=side*.10
      elipsoide(arm,pele,[0,-1.15,0],[.055,.13,.04])
      elipsoide(head,cabelo,[side*.14,-.16,.08],[.07,.39,.07])
      elipsoide(head,cabelo,[side*.048,.10,.205],[.025,.013,.012])
    }
    const hat=new THREE.Mesh(guardar(new THREE.CylinderGeometry(.31,.34,.33,28)),tecido);hat.position.y=3.62;root.add(hat)
    const brim=new THREE.Mesh(guardar(new THREE.CylinderGeometry(.55,.55,.035,32)),tecido);brim.position.y=3.46;root.add(brim)
    animar=pose=>{const t=pose.reduzir?0:pose.tempo;vestido.rotation.z=Math.sin(t*.45)*.012;head.rotation.y=Math.sin(t*.3)*.08}
  }
  root.visible=false
  return {
    root, tipo, diagnostico,
    atualizar(pose: PoseCriatura) {
      root.visible=pose.opacidade>.001
      if(!root.visible)return
      animar(pose)
      diagnostico.sombraY=sombra.getWorldPosition(posicaoSombra).y
      if(opacidadeAnterior!==pose.opacidade){materiais.forEach(m=>{m.opacity=pose.opacidade});opacidadeAnterior=pose.opacidade}
      if(tipo!=='saci'&&tipo!=='corvo')sombraMat.uniforms.uAlpha.value=pose.opacidade*.46
    },
    qualidade(distancia:number,mediaMs=16) { ajustarLOD(distancia,mediaMs) },
    dispose() { root.removeFromParent();recursos.forEach(r=>r.dispose());recursos.clear() },
  }
}
