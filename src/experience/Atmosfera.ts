import * as THREE from 'three'

export type PerfilAtmosfera = 'desktop' | 'mobile' | 'apresentacao'

// Unidades do cenário (metros), segundos e opacidades lineares.
export const ATMOSFERA = {
  largura: 4.1, altura: 5.4, corrente: 0.055, opacidade: 0.64,
  tamanho: 1, densidade: 1, nevoa: 0.14, respostaAr: 0.035,
  perfis: {
    desktop: { contagens: [150, 820, 680], laminas: 18, brilho: 1 },
    mobile: { contagens: [70, 330, 260], laminas: 9, brilho: 1 },
    apresentacao: { contagens: [180, 940, 760], laminas: 18, brilho: 1.38 },
  },
}

export type PerturbacaoAtmosferica = {
  posicao: THREE.Vector3
  raio?: number
  intensidade?: number
  duracao?: number
  giro?: number
}

const luzGLSL = `
  uniform vec4 uLuzes[8];
  uniform vec3 uCores[8];
  vec3 iluminar(vec3 p) {
    vec3 luz = vec3(0.17, 0.135, 0.11);
    for (int i = 0; i < 8; i++) {
      vec3 d = p - uLuzes[i].xyz;
      luz += uCores[i] * uLuzes[i].w / (1.0 + dot(d,d) * 0.42);
    }
    return min(luz, vec3(1.8));
  }
`

const vertParticulas = `
  attribute vec4 aDados;
  attribute vec3 aCor;
  uniform float uEscala, uTempo, uOpacidade, uDensidade, uBrilho;
  varying vec3 vCor;
  varying float vAlpha, vFase, vTipo, vDistancia;
  ${luzGLSL}
  void main() {
    vec4 vista = modelViewMatrix * vec4(position, 1.0);
    float d = -vista.z;
    vec3 luz = iluminar(position);
    float perto = 1.0 - smoothstep(0.3, 3.0, d);
    gl_PointSize = clamp(aDados.x * uEscala / max(d, 0.3), 1.0, 26.0);
    gl_Position = projectionMatrix * vista;
    float borda = smoothstep(0.18, 1.15, d) * (1.0 - smoothstep(48.0, 76.0, d));
    float regiao = mix(0.38, 1.0, (1.0 - smoothstep(-5.0, 6.0, position.z)));
    regiao += 0.28 * exp(-pow((position.z + 1.0) / 3.5, 2.0));
    float selecionada = 1.0 - smoothstep(uDensidade - 0.08, uDensidade, aDados.w);
    vAlpha = aDados.y * uOpacidade * borda * regiao * selecionada;
    vAlpha *= mix(1.0, 0.55, perto) * (0.45 + dot(luz, vec3(0.3,0.5,0.2)));
    vCor = aCor * luz * uBrilho;
    vTipo = aDados.z;
    vFase = aDados.w * 62.83 + uTempo * (0.06 + aDados.w * 0.12);
    vDistancia = perto;
  }
`

const fragParticulas = `
  varying vec3 vCor;
  varying float vAlpha, vFase, vTipo, vDistancia;
  void main() {
    vec2 p = gl_PointCoord - 0.5;
    p = mat2(cos(vFase), -sin(vFase), sin(vFase), cos(vFase)) * p;
    // Esporos macios, cinzas alongadas e fragmentos assimétricos, sem textura externa.
    p.x *= mix(1.0, 2.6, step(0.6, vTipo));
    float forma = length(p) + step(0.85, vTipo) * p.y * 0.3;
    float alpha = (1.0 - smoothstep(mix(0.12, 0.02, vDistancia), 0.49, forma)) * vAlpha;
    if (alpha < 0.003) discard;
    gl_FragColor = vec4(vCor, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

const vertNevoa = `
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vDist;
  void main() {
    vUv = uv;
    vMundo = (modelMatrix * vec4(position, 1.0)).xyz;
    vec4 vista = modelViewMatrix * vec4(position, 1.0);
    vDist = length(vista.xyz);
    gl_Position = projectionMatrix * vista;
  }
`

const fragNevoa = `
  uniform float uTempo, uNevoa, uBrilho, uDetalhe;
  uniform vec4 uEvento;
  varying vec2 vUv;
  varying vec3 vMundo;
  varying float vDist;
  ${luzGLSL}
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
  float ruido(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i+vec2(1,0)), f.x),
               mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y);
  }
  void main() {
    vec2 p = vMundo.xz * 0.38 + vMundo.xy * 0.22;
    p.x -= uTempo * 0.035;
    float n = ruido(p + ruido(p * 0.65 + uTempo * 0.015));
    if (uDetalhe > 0.5) n = n * 0.72 + ruido(p * 2.3 - uTempo * 0.02) * 0.28;
    vec2 borda = smoothstep(vec2(0.0), vec2(0.22), vUv) *
                 (1.0 - smoothstep(vec2(0.78), vec2(1.0), vUv));
    float altura = mix(1.0, 0.35, smoothstep(0.1, 3.8, vMundo.y));
    float perto = smoothstep(0.8, 4.0, vDist) * (1.0 - smoothstep(46.0, 72.0, vDist));
    float portal = 1.0 + 0.38 * exp(-pow(vMundo.z / 4.0, 2.0));
    float evento = exp(-dot(vMundo-uEvento.xyz, vMundo-uEvento.xyz) * 0.3) * uEvento.w;
    float alpha = borda.x * borda.y * smoothstep(0.18,0.85,n) * altura * perto * uNevoa * portal;
    vec3 cor = mix(vec3(0.53,0.43,0.32), vec3(0.4,0.16,0.12), evento * 0.18);
    gl_FragColor = vec4(cor * iluminar(vMundo) * uBrilho, alpha * (1.0 + evento * 0.3));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

function aleatorio(semente: number) {
  let s = semente >>> 0
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) >>> 0
    return s / 4294967296
  }
}

/** Volumes persistem no mundo. Só partículas fora do volume ativo são recicladas. */
export function criarAtmosfera(scene: THREE.Scene, camera: THREE.PerspectiveCamera, perfil: PerfilAtmosfera) {
  const qualidade = ATMOSFERA.perfis[perfil]
  const rnd = aleatorio(731)
  const total = qualidade.contagens.reduce((a, b) => a + b, 0)
  const pos = new Float32Array(total * 3)
  const dados = new Float32Array(total * 4)
  const cores = new Float32Array(total * 3)
  const fases = new Float32Array(total)
  const velocidades = new Float32Array(total)
  const alcances = new Float32Array(total)
  const cor = new THREE.Color()
  let indice = 0
  qualidade.contagens.forEach((quantidade, camada) => {
    for (let j = 0; j < quantidade; j++, indice++) {
      const i = indice, k = i * 3, a = i * 4
      const alcance = [18, 42, 78][camada]
      alcances[i] = alcance
      pos[k] = (rnd() * 2 - 1) * ATMOSFERA.largura
      pos[k + 1] = 0.12 + rnd() * ATMOSFERA.altura
      pos[k + 2] = camera.position.z + 6 - rnd() * alcance
      fases[i] = rnd() * Math.PI * 2
      velocidades[i] = 0.018 + rnd() * 0.047
      dados[a] = (0.016 + rnd() ** 2 * 0.045) * (camada === 0 ? 1.3 : 1)
      dados[a + 1] = 0.3 + rnd() * 0.65
      dados[a + 2] = rnd()
      dados[a + 3] = rnd()
      const tom = rnd()
      cor.setHex(tom < 0.6 ? 0xc8bba0 : tom < 0.85 ? 0x51463e : tom < 0.95 ? 0xe2a35f : 0x8a3d37)
      cor.toArray(cores, k)
    }
  })
  const luzes = scene.children.filter((obj): obj is THREE.PointLight => obj instanceof THREE.PointLight)
  const proximas = [...luzes]
  const uniforms = {
    uTempo: { value: 0 }, uEscala: { value: 600 },
    uOpacidade: { value: ATMOSFERA.opacidade }, uDensidade: { value: 1.08 },
    uBrilho: { value: qualidade.brilho }, uNevoa: { value: ATMOSFERA.nevoa },
    uDetalhe: { value: perfil === 'mobile' ? 0 : 1 },
    uEvento: { value: new THREE.Vector4(0, 0, 0, 0) },
    uLuzes: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    uCores: { value: Array.from({ length: 8 }, () => new THREE.Color(0)) },
  }
  const geometria = new THREE.BufferGeometry()
  const atributo = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)
  geometria.setAttribute('position', atributo)
  geometria.setAttribute('aDados', new THREE.BufferAttribute(dados, 4))
  geometria.setAttribute('aCor', new THREE.BufferAttribute(cores, 3))
  // Ordenação aleatória estável mistura as três camadas no orçamento adaptativo.
  // O draw range reduz trabalho de vértices, além do fade no fragment shader.
  const ordem = Uint16Array.from({ length: total }, (_, i) => i)
  ordem.sort((a, b) => dados[a * 4 + 3] - dados[b * 4 + 3])
  geometria.setIndex(new THREE.BufferAttribute(ordem, 1))
  const material = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertParticulas, fragmentShader: fragParticulas,
    transparent: true, depthWrite: false,
  })
  const particulas = new THREE.Points(geometria, material)
  // O shader faz fade em profundidade; a bounding sphere muda com a reciclagem.
  particulas.frustumCulled = false
  scene.add(particulas)

  const plano = new THREE.PlaneGeometry(1, 1)
  const materialNevoa = new THREE.ShaderMaterial({
    uniforms, vertexShader: vertNevoa, fragmentShader: fragNevoa,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  })
  const laminas = Array.from({ length: qualidade.laminas }, (_, i) => {
    const mesh = new THREE.Mesh(plano, materialNevoa)
    const chao = i % 3 !== 2
    mesh.scale.set(chao ? 8.1 : 8.3, chao ? 12 : 3.4, 1)
    mesh.rotation.x = chao ? -Math.PI / 2 + (i % 2 ? 0.025 : -0.025) : 0
    mesh.position.set((rnd() - 0.5) * 0.35, chao ? 0.16 + (i % 4) * 0.13 : 1.9, camera.position.z + 8 - i * 5)
    scene.add(mesh)
    return mesh
  })
  // Pool limitado: eventos não criam geometrias, materiais ou arrays no loop.
  const eventos = Array.from({ length: 6 }, () => ({
    posicao: new THREE.Vector3(), raio: 1, intensidade: 0, restante: 0, duracao: 1, giro: 0,
  }))
  let proximoEvento = 0, anteriorZ = camera.position.z, velocidade = 0
  let tempo = 0, mediaQuadro = 1 / 60, amostra = 0, densidade = 1.08
  let alturaViewport = 900, pixelRatio = 1, reduzido = false
  const stats = { perfil, total, ativos: total, velocidade: 0, densidade: 1, mediaMs: 0, recicladas: 0, eventos: 0 }

  return {
    stats,
    inspecionar() {
      return { particulas: Array.from(pos.slice(0, 36)), laminas: laminas.map(m => m.position.z) }
    },
    redimensionar(altura: number, ratio: number) { alturaViewport = altura; pixelRatio = ratio },
    perturbar(evento: PerturbacaoAtmosferica) {
      if (reduzido) return
      const e = eventos[proximoEvento++ % eventos.length]
      e.posicao.copy(evento.posicao)
      e.raio = Math.max(0.1, evento.raio ?? 3)
      e.intensidade = THREE.MathUtils.clamp(evento.intensidade ?? 0.5, -2, 2)
      e.duracao = e.restante = Math.max(0.1, evento.duracao ?? 2)
      e.giro = evento.giro ?? 0.4
      stats.eventos++
    },
    atualizar(delta: number, reduzir: boolean, tempoQuadro = delta) {
      if (delta <= 0) return
      reduzido = reduzir
      const dt = Math.min(delta, 0.05)
      tempo += reduzir ? 0 : dt
      const cz = camera.position.z
      velocidade = THREE.MathUtils.damp(velocidade, THREE.MathUtils.clamp((cz - anteriorZ) / dt, -45, 45), 6, dt)
      anteriorZ = cz
      mediaQuadro = THREE.MathUtils.damp(mediaQuadro, Math.min(tempoQuadro, 0.2), 0.6, dt)
      amostra += dt
      if (amostra > 3) {
        if (mediaQuadro > 0.029) densidade = Math.max(0.5, densidade - 0.12)
        else if (mediaQuadro < 0.020) densidade = Math.min(1.08, densidade + 0.04)
        amostra = 0
      }
      uniforms.uDensidade.value = THREE.MathUtils.damp(uniforms.uDensidade.value, densidade * ATMOSFERA.densidade, 0.7, dt)
      geometria.setDrawRange(0, Math.min(total, Math.ceil(total * (uniforms.uDensidade.value + 0.04))))
      uniforms.uDetalhe.value = perfil !== 'mobile' && densidade > 0.75 ? 1 : 0
      uniforms.uTempo.value = tempo
      uniforms.uEscala.value = alturaViewport * pixelRatio / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * ATMOSFERA.tamanho
      const entrada = THREE.MathUtils.smoothstep(9 - cz, 0, 14)
      uniforms.uOpacidade.value = ATMOSFERA.opacidade * (0.5 + entrada * 0.5)
      uniforms.uNevoa.value = ATMOSFERA.nevoa * (0.55 + entrada * 0.45)
      uniforms.uEvento.value.w = 0
      for (const e of eventos) {
        e.restante = reduzir ? 0 : Math.max(0, e.restante - dt)
        if (e.restante > 0) uniforms.uEvento.value.set(e.posicao.x, e.posicao.y, e.posicao.z, e.restante / e.duracao * Math.abs(e.intensidade))
      }
      proximas.sort((a, b) => Math.abs(a.position.z - cz) - Math.abs(b.position.z - cz))
      for (let j = 0; j < 8; j++) {
        const l = proximas[j]
        if (l) {
          uniforms.uLuzes.value[j].set(l.position.x, l.position.y, l.position.z, Math.min(3, l.intensity / 9))
          uniforms.uCores.value[j].copy(l.color)
        }
      }
      for (let i = 0; i < total; i++) {
        const k = i * 3, fase = fases[i], alcance = alcances[i]
        let x = pos[k], y = pos[k + 1], z = pos[k + 2]
        // Só reciclar além das bordas invisíveis, em ambas as direções.
        if (z > cz + 6 || z < cz + 6 - alcance) {
          z = cz + 6 - THREE.MathUtils.euclideanModulo(cz + 6 - z, alcance)
          stats.recicladas++
        }
        if (!reduzir) {
          const perto = Math.exp(-((z - cz) ** 2) / 14) * Math.exp(-(x * x + (y - 1.7) ** 2) / 10)
          x += dt * (ATMOSFERA.corrente * Math.sin(tempo * 0.21 + fase + z * 0.12) + 0.022 * Math.sin(y * 1.7 + tempo * 0.36 + fase))
          x += dt * Math.sign(x || Math.sin(fase)) * Math.abs(velocidade) * perto * ATMOSFERA.respostaAr
          y += dt * (-velocidades[i] + 0.028 * Math.sin(tempo * 0.28 + fase + x))
          z += dt * 0.024 * Math.cos(tempo * 0.17 + fase) + dt * velocidade * perto * 0.018
          for (const e of eventos) {
            if (e.restante <= 0) continue
            const dx = x - e.posicao.x, dy = y - e.posicao.y, dz = z - e.posicao.z
            const peso = Math.max(0, 1 - (dx * dx + dy * dy + dz * dz) / (e.raio * e.raio)) * e.restante / e.duracao * e.intensidade * dt
            x += (dx - dz * e.giro) * peso
            y += (0.3 + dy * 0.15) * peso
            z += (dz + dx * e.giro) * peso
          }
          if (Math.abs(x) > ATMOSFERA.largura) x = THREE.MathUtils.clamp(x, -ATMOSFERA.largura, ATMOSFERA.largura) * -0.99
          if (y < 0.1) y = ATMOSFERA.altura
          if (y > ATMOSFERA.altura + 0.1) y = 0.12
        }
        pos[k] = x; pos[k + 1] = y; pos[k + 2] = z
      }
      atributo.needsUpdate = true
      for (const mesh of laminas) {
        const faixa = qualidade.laminas * 5
        if (mesh.position.z > cz + 12 || mesh.position.z < cz + 12 - faixa) {
          mesh.position.z = cz + 12 - THREE.MathUtils.euclideanModulo(cz + 12 - mesh.position.z, faixa)
        }
      }
      stats.velocidade = velocidade
      stats.densidade = uniforms.uDensidade.value
      stats.ativos = Math.round(total * Math.min(1, stats.densidade))
      stats.mediaMs = mediaQuadro * 1000
    },
    dispose() {
      scene.remove(particulas, ...laminas)
      geometria.dispose(); material.dispose(); plano.dispose(); materialNevoa.dispose()
    },
  }
}
