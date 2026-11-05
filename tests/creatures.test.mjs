import test from 'node:test'
import assert from 'node:assert/strict'
import * as THREE from 'three'
import { fasePata, joelhoIK, superficieOrganica } from '../src/experience/creatures/OrganicGeometry.ts'

test('IK mantém comprimentos ósseos e distingue flexão anterior/traseira',()=>{
  const hip=new THREE.Vector3(.6,1.72,.47),foot=new THREE.Vector3(.9,.12,.47)
  const anterior=joelhoIK(hip,foot,.85,.86,-1,new THREE.Vector3())
  const posterior=joelhoIK(hip,foot,.85,.86,1,new THREE.Vector3())
  for(const knee of [anterior,posterior]) {
    assert.ok(Math.abs(knee.distanceTo(hip)-.85)<1e-6)
    assert.ok(Math.abs(knee.distanceTo(foot)-.86)<1e-6)
  }
  assert.ok(anterior.x<posterior.x)
})

test('pata plantada não desliza no mundo quando a raiz avança',()=>{
  for(const offset of [0,.09,.53,.62]) {
    const inicio=THREE.MathUtils.euclideanModulo(-offset,1)*1.55+.03
    const posicoes=[]
    for(let i=0;i<8;i++) {
      const distancia=inicio+i*.035,pose=fasePata(distancia,offset)
      assert.ok(pose.contato)
      assert.equal(pose.y,.12)
      posicoes.push(distancia+pose.x)
    }
    assert.ok(Math.max(...posicoes)-Math.min(...posicoes)<1e-8)
  }
})

test('retorno da pata levanta o pé e mantém a transição contínua',()=>{
  const aterrissagem=fasePata(1.55-1e-6,0),apoio=fasePata(0,0)
  assert.ok(Math.abs(aterrissagem.x-apoio.x)<1e-5)
  assert.ok(Math.abs(aterrissagem.y-apoio.y)<1e-5)
  assert.ok(fasePata(.75*1.55,0).y>.4)
})

test('malha orgânica produz normais finitas, winding exterior e orçamento limitado',()=>{
  const geo=superficieOrganica([[0,1.5,0,1,.6,.4],[.8,1.8,0,.6,.5,.35]],.13)
  try {
    const p=geo.attributes.position,n=geo.attributes.normal
    assert.ok(p.count>1000&&p.count<60000)
    const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),normal=new THREE.Vector3(),face=new THREE.Vector3()
    for(let i=0;i<p.count;i+=3) {
      a.fromBufferAttribute(p,i);b.fromBufferAttribute(p,i+1);c.fromBufferAttribute(p,i+2)
      normal.fromBufferAttribute(n,i)
      face.crossVectors(b.sub(a),c.sub(a))
      assert.ok(Number.isFinite(normal.x+normal.y+normal.z))
      assert.ok(Math.abs(normal.length()-1)<1e-5)
      assert.ok(face.dot(normal)>-1e-5)
    }
  } finally {geo.dispose()}
})
