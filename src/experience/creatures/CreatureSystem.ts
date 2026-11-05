import * as THREE from 'three'
import { criarCriatura } from './CreatureModels'
import type { Criatura, PoseCriatura, TipoCriatura } from './CreatureModels'

export function criarSistemaCriaturas(scene: THREE.Scene, mobile: boolean) {
  const grupos = new Map<TipoCriatura, THREE.Group>()
  const modelos = new Map<TipoCriatura, { modelo:Criatura; usado:number }>()
  // Uma área de luz quente no percurso revela anatomia durante a travessia.
  const luz=new THREE.PointLight(0xffc48b,0,12,2);scene.add(luz)
  let tempo=0
  const grupo=(tipo:TipoCriatura)=>{
    if(!grupos.has(tipo)) {const g=new THREE.Group();g.name=`evento-${tipo}`;g.visible=false;scene.add(g);grupos.set(tipo,g)}
    return grupos.get(tipo)!
  }
  const preparar=(tipo:TipoCriatura)=>{
    if(!modelos.has(tipo)) {
      // No máximo três modelos residentes; descarte primeiro os inativos mais antigos.
      if(modelos.size>=3) {
        const candidato=[...modelos.entries()].filter(([t])=>!grupo(t).visible).sort((a,b)=>a[1].usado-b[1].usado)[0]
        if(candidato){candidato[1].modelo.dispose();modelos.delete(candidato[0])}
      }
      const modelo=criarCriatura(tipo,mobile);grupo(tipo).add(modelo.root);modelos.set(tipo,{modelo,usado:tempo})
    }
    return modelos.get(tipo)!
  }
  return {
    grupo, preparar,
    atualizar(tipo:TipoCriatura,pose:PoseCriatura,distanciaCamera:number,mediaMs:number) {
      tempo=pose.tempo
      const item=preparar(tipo);item.usado=tempo
      grupo(tipo).visible=pose.opacidade>.001
      pose.altura=grupo(tipo).position.y
      luz.position.set(0,3.7,grupo(tipo).position.z+2.2);luz.intensity=18*pose.opacidade
      item.modelo.atualizar(pose);item.modelo.qualidade(distanciaCamera,mediaMs)
    },
    ocultar() {grupos.forEach(g=>{g.visible=false});luz.intensity=0},
    inspecionar() {return [...modelos.entries()].map(([tipo,{modelo}])=>({tipo,visivel:grupo(tipo).visible,posicao:grupo(tipo).position.toArray(),...modelo.diagnostico}))},
    dispose() {modelos.forEach(({modelo})=>modelo.dispose());grupos.forEach(g=>g.removeFromParent());luz.removeFromParent();luz.dispose();modelos.clear();grupos.clear()},
  }
}
