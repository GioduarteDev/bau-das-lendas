import * as THREE from 'three'

export type Volume = [number, number, number, number, number, number]

/** União suave de elipsoides, extraída como uma superfície contínua por tetraedros. */
export function superficieOrganica(volumes: Volume[], passo = 0.09) {
  const campo = (x: number, y: number, z: number) => {
    let distancia = 100
    for (const [cx, cy, cz, rx, ry, rz] of volumes) {
      const d = (Math.hypot((x - cx) / rx, (y - cy) / ry, (z - cz) / rz) - 1) * Math.min(rx, ry, rz)
      const h = Math.max(0, 0.14 - Math.abs(distancia - d)) / 0.14
      distancia = Math.min(distancia, d) - h * h * 0.035
    }
    return distancia
  }
  const min = [-2, 0.5, -0.9], max = [2.7, 3.1, 0.9]
  const [nx, ny, nz] = max.map((v, i) => Math.ceil((v - min[i]) / passo) + 1)
  const grid = new Float32Array(nx * ny * nz)
  const index = (x: number, y: number, z: number) => (x * ny + y) * nz + z
  for (let x = 0; x < nx; x++) for (let y = 0; y < ny; y++) for (let z = 0; z < nz; z++) {
    grid[index(x, y, z)] = campo(min[0] + x * passo, min[1] + y * passo, min[2] + z * passo)
  }
  const corners = [[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]]
  const tets = [[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]]
  const edges = [[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]]
  const positions: number[] = [], normals: number[] = [], uvs: number[] = []
  const gradiente = (p: THREE.Vector3) => new THREE.Vector3(
    campo(p.x + 0.002, p.y, p.z) - campo(p.x - 0.002, p.y, p.z),
    campo(p.x, p.y + 0.002, p.z) - campo(p.x, p.y - 0.002, p.z),
    campo(p.x, p.y, p.z + 0.002) - campo(p.x, p.y, p.z - 0.002),
  ).normalize()
  for (let x = 0; x < nx - 1; x++) for (let y = 0; y < ny - 1; y++) for (let z = 0; z < nz - 1; z++) {
    const valores = corners.map(c => grid[index(x+c[0], y+c[1], z+c[2])])
    if (valores.every(v => v >= 0) || valores.every(v => v < 0)) continue
    const pontos = corners.map(c => new THREE.Vector3(min[0]+(x+c[0])*passo, min[1]+(y+c[1])*passo, min[2]+(z+c[2])*passo))
    for (const tet of tets) {
      const intersecoes: THREE.Vector3[] = []
      for (const [a, b] of edges) {
        const ia = tet[a], ib = tet[b], va = valores[ia], vb = valores[ib]
        if ((va < 0) !== (vb < 0)) intersecoes.push(pontos[ia].clone().lerp(pontos[ib], va / (va - vb)))
      }
      if (intersecoes.length < 3) continue
      const centro = intersecoes.reduce((a, p) => a.add(p), new THREE.Vector3()).divideScalar(intersecoes.length)
      const normal = gradiente(centro), eixo = intersecoes[0].clone().sub(centro).normalize()
      const lateral = new THREE.Vector3().crossVectors(normal, eixo)
      intersecoes.sort((a, b) => {
        const da = a.clone().sub(centro), db = b.clone().sub(centro)
        return Math.atan2(da.dot(lateral), da.dot(eixo)) - Math.atan2(db.dot(lateral), db.dot(eixo))
      })
      for (let j = 1; j < intersecoes.length - 1; j++) {
        for (const p of [intersecoes[0], intersecoes[j], intersecoes[j+1]]) {
          positions.push(p.x, p.y, p.z)
          const n = gradiente(p)
          normals.push(n.x, n.y, n.z)
          uvs.push(p.x * 0.7, p.y * 0.7 + p.z * 0.15)
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  return geo
}

/** Dois segmentos no plano sagital; o pé fornece o alvo de contato com o piso. */
export function joelhoIK(anca: THREE.Vector3, pe: THREE.Vector3, superior: number, inferior: number, sentido: number, destino: THREE.Vector3) {
  const dx = pe.x - anca.x, dy = pe.y - anca.y
  const d = THREE.MathUtils.clamp(Math.hypot(dx, dy), 0.001, superior + inferior - 0.001)
  const a = (superior * superior - inferior * inferior + d * d) / (2 * d)
  const h = Math.sqrt(Math.max(0, superior * superior - a * a)) * sentido
  destino.set(anca.x + dx / d * a - dy / d * h, anca.y + dy / d * a + dx / d * h, anca.z)
  return destino
}

export function fasePata(distancia: number, offset: number) {
  const fase = THREE.MathUtils.euclideanModulo(distancia / 1.55 + offset, 1)
  const contato = fase < 0.48
  const t = contato ? fase / 0.48 : (fase - 0.48) / 0.52
  return { x: contato ? 0.372 - t * 0.744 : -0.372 + t * 0.744,
    y: contato ? 0.12 : 0.12 + Math.sin(t * Math.PI) * 0.36, contato }
}
