import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { criarSistemaCriaturas } from './CreatureSystem'
import type { TipoCriatura } from './CreatureModels'
import './inspector.css'

export default function CreatureInspector() {
  const tipos:TipoCriatura[]=['lobo','saci','corvo','alta']
  const query=new URLSearchParams(window.location.search)
  const inicial=tipos.includes(query.get('criatura') as TipoCriatura)?query.get('criatura') as TipoCriatura:'lobo'
  const [tipo,setTipo]=useState<TipoCriatura>(inicial)
  const [acao,setAcao]=useState(query.get('acao')||'movimento')
  const [velocidade,setVelocidade]=useState(1)
  const [pausado,setPausado]=useState(false)
  const [projecao,setProjecao]=useState(query.get('apresentacao')==='1')
  const host=useRef<HTMLDivElement>(null)
  const estado=useRef({tipo,acao,velocidade,pausado,projecao})
  const seek=useRef<number|null>(null)
  const tempoRef=useRef(0)
  const vistaRef=useRef('tres-quartos')
  estado.current={tipo,acao,velocidade,pausado,projecao}
  useEffect(()=>{
    const container=host.current!
    const mobile=window.matchMedia('(max-width:760px)').matches
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x151311);scene.fog=new THREE.Fog(0x151311,17,36)
    const camera=new THREE.PerspectiveCamera(48,1,.05,70)
    camera.position.set(5,2.9,7.8)
    const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'})
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,mobile?1.2:1.6));renderer.outputColorSpace=THREE.SRGBColorSpace
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.5
    container.appendChild(renderer.domElement)
    scene.add(new THREE.HemisphereLight(0xc9d0d4,0x342014,2.1))
    const key=new THREE.PointLight(0xffc68d,65,20,1.5);key.position.set(3,5,4);scene.add(key)
    const rim=new THREE.PointLight(0x9ab7d0,55,18,1.5);rim.position.set(-3,4,-3);scene.add(rim)
    const fill=new THREE.PointLight(0xd1a891,20,15,1.5);fill.position.set(-3,2,5);scene.add(fill)
    const pisoGeo=new THREE.PlaneGeometry(40,40), pisoMat=new THREE.MeshStandardMaterial({color:0x28221c,roughness:.8})
    const piso=new THREE.Mesh(pisoGeo,pisoMat);piso.rotation.x=-Math.PI/2;scene.add(piso)
    const grid=new THREE.GridHelper(30,30,0x45392d,0x302922);grid.position.y=.006;scene.add(grid)
    const referencia=new THREE.Group();referencia.position.set(-3,0,-2.5)
    const refGeo=new THREE.BoxGeometry(.08,2.1,.08),refMat=new THREE.MeshStandardMaterial({color:0x80694c})
    for(const x of [-.5,.5]){const m=new THREE.Mesh(refGeo,refMat);m.position.set(x,1.05,0);referencia.add(m)}
    const lintel=new THREE.Mesh(refGeo,refMat);lintel.scale.set(1,1/2.1,1);lintel.rotation.z=Math.PI/2;lintel.position.y=2.1;referencia.add(lintel);scene.add(referencia)
    const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,1.45,0);controls.enableDamping=true;controls.minDistance=2.5;controls.maxDistance=18;controls.maxPolarAngle=Math.PI*.49
    const sistema=criarSistemaCriaturas(scene,mobile)
    const clock=new THREE.Clock()
    let anterior:TipoCriatura|null=null, tempo=0, quadros=0, vistaAnterior=''
    let materialWire=false
    const ajustar=()=>{const w=container.clientWidth,h=container.clientHeight;camera.aspect=w/h;camera.fov=w/h<.8?65:48;camera.updateProjectionMatrix();renderer.setSize(w,h)}
    ajustar();window.addEventListener('resize',ajustar)
    const depuracao=window as Window & {__bauCriaturas?:{inspecionar:()=>unknown;tempo:(t:number)=>void;wireframe:()=>void}}
    const inspecionar=()=>({tipo:estado.current.tipo,tempo,quadros,chamadas:renderer.info.render.calls,triangulos:renderer.info.render.triangles,geometrias:renderer.info.memory.geometries,texturas:renderer.info.memory.textures,modelos:sistema.inspecionar()})
    const wireframe=()=>{materialWire=!materialWire;scene.traverse(obj=>{if(obj instanceof THREE.Mesh&&obj.material instanceof THREE.MeshStandardMaterial)obj.material.wireframe=materialWire})}
    const debug={inspecionar,tempo:(t:number)=>{seek.current=t},wireframe};depuracao.__bauCriaturas=debug
    renderer.setAnimationLoop(()=>{
      const dt=Math.min(clock.getDelta(),.05),s=estado.current
      if(document.hidden)return
      if(anterior!==s.tipo){sistema.ocultar();tempo=0;anterior=s.tipo;controls.target.set(0,s.tipo==='alta'?1.8:s.tipo==='corvo'?1.6:s.tipo==='saci'?1:1.45,0);vistaAnterior=''}
      if(vistaAnterior!==vistaRef.current) {
        vistaAnterior=vistaRef.current
        let d=s.tipo==='lobo'?7.3:s.tipo==='alta'?8:s.tipo==='saci'?4.3:3.6
        if(mobile&&s.tipo==='lobo')d*=1.45
        const y=controls.target.y
        if(vistaAnterior==='perfil')camera.position.set(0,y+.3,d)
        else if(vistaAnterior==='frente')camera.position.set(s.tipo==='lobo'||s.tipo==='corvo'?d:0,y+.25,s.tipo==='lobo'||s.tipo==='corvo'?0:d)
        else camera.position.set(d*.55,y+.8,d*.84)
      }
      if(seek.current!==null){tempo=seek.current;seek.current=null}
      else if(!s.pausado)tempo+=dt*s.velocidade
      tempoRef.current=tempo
      const root=sistema.grupo(s.tipo)
      root.position.set(0,s.tipo==='corvo'?1.55:0,0)
      const progresso=THREE.MathUtils.euclideanModulo(tempo/3.8,1)
      const opacidade=s.acao==='desaparecer'?Math.min(1,(1-progresso)*4):1
      sistema.atualizar(s.tipo,{tempo,distancia:tempo*3.2,progresso,opacidade,reduzir:false,parado:s.acao==='parado'},camera.position.length(),16)
      renderer.toneMappingExposure=s.projecao?1.78:1.5
      controls.update();renderer.render(scene,camera);quadros++
    })
    return()=>{
      renderer.setAnimationLoop(null);window.removeEventListener('resize',ajustar)
      if(depuracao.__bauCriaturas===debug)delete depuracao.__bauCriaturas
      sistema.dispose();controls.dispose();pisoGeo.dispose();pisoMat.dispose();refGeo.dispose();refMat.dispose();grid.geometry.dispose();(grid.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove()
    }
  },[])
  return <main className="criaturas-inspector">
    <div ref={host} className="criaturas-canvas" aria-label="Inspeção tridimensional de criaturas" />
    <div className="criaturas-topo"><strong>Baú das Lendas · Estudo de criaturas</strong><a href="/">Voltar ao corredor</a></div>
    <aside className="criaturas-controles" aria-label="Controles de inspeção">
      <label>Criatura<select aria-label="Criatura" value={tipo} onChange={e=>setTipo(e.target.value as TipoCriatura)}><option value="lobo">Lobisomem</option><option value="saci">Saci</option><option value="corvo">Corvo</option><option value="alta">Figura alta</option></select></label>
      <label>Ação<select aria-label="Ação" value={acao} onChange={e=>setAcao(e.target.value)}><option value="movimento">Movimento em ciclo</option><option value="parado">Parado</option><option value="desaparecer">Desaparecimento</option></select></label>
      <label>Velocidade<select aria-label="Velocidade" value={velocidade} onChange={e=>setVelocidade(Number(e.target.value))}><option value="1">Real · 1×</option><option value="0.25">Câmera lenta · ¼×</option><option value="0.1">Estudo · ¹⁄₁₀×</option></select></label>
      <button onClick={()=>setPausado(!pausado)}>{pausado?'Continuar':'Pausar'}</button>
      <button onClick={()=>{setPausado(true);seek.current=tempoRef.current+1/30}}>Avançar um quadro</button>
      <button onClick={()=>{vistaRef.current='perfil'}}>Perfil</button>
      <button onClick={()=>{vistaRef.current='frente'}}>Frente</button>
      <button onClick={()=>{vistaRef.current='tres-quartos'}}>¾</button>
      <label><input type="checkbox" checked={projecao} onChange={e=>setProjecao(e.target.checked)}/> Projeção</label>
      <p>Arraste para orbitar · Role para aproximar<br/>Referência ao fundo: vão de 2,10 m</p>
    </aside>
  </main>
}
