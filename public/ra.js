import * as THREE from 'three';
import { QRTrackerThree } from '/qr-tracker.js';
import { MindARThree } from '/vendor/mindar/mindar-image-three.prod.js';
import { api } from '/api.js';
import { legendImages } from '/legend-images.js';

const $ = (selector) => document.querySelector(selector);
const STATUS = $('#status');
const faceA = $('#faceA');
const faceB = $('#faceB');
// Rastreamento: por padrão, o cartaz da casa (MindAR, imagem-alvo em /alvos/casa.mind).
// /ra.html?rastreio=qr usa o rastreador antigo pelo próprio QR 02 (contingência e testes).
const MODO_QR = new URLSearchParams(globalThis.location?.search || '').get('rastreio') === 'qr';
const ALVO = MODO_QR ? 'QR 02' : 'cartaz da casa';

// Abre o MindAR com as mesmas peças que o resto do ritual já usa (renderer, scene, camera, âncora).
function criarRastreador(container) {
  if (MODO_QR) return new QRTrackerThree({ container });
  const mind = new MindARThree({
    container,
    imageTargetSrc: '/alvos/casa.mind',
    uiLoading: 'no', uiScanning: 'no', uiError: 'no',
    filterMinCF: 0.0001, filterBeta: 0.001,      // suaviza o tremor do baú
    warmupTolerance: 3, missTolerance: 10          // perde o alvo só depois de alguns quadros
  });
  const iniciar = mind.start.bind(mind);
  mind.start = async () => {
    if (!globalThis.isSecureContext) throw Object.assign(new Error('A câmera exige HTTPS.'), { name: 'SecurityError' });
    if (!globalThis.navigator?.mediaDevices?.getUserMedia) throw Object.assign(new Error('Este navegador não oferece câmera.'), { name: 'NotFoundError' });
    // Pede a câmera antes: o MindAR engole o motivo do erro (permissão negada, sem câmera…).
    const teste = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
    teste.getTracks().forEach(t => t.stop());
    try { await iniciar(); }
    catch (erro) { throw erro || new Error('Não foi possível iniciar a câmera.'); }
  };
  mind.dispose = () => {
    try { mind.stop(); } catch { /* já parado */ }
    mind.renderer.setAnimationLoop(null);
  };
  return mind;
}

const flipLabels = ['FACE 1 DE 3 · FRENTE E ATRIBUTOS', 'FACE 2 DE 3 · HISTÓRIA DA LENDA', 'FACE 3 DE 3 · VERSO DA COLEÇÃO'];

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
}
function clamp01(value) { return Math.max(0, Math.min(1, value)); }
function easeOutCubic(t) { return 1 - Math.pow(1 - clamp01(t), 3); }
function makeFace(entry, stage) {
  const n = String(entry.numero).padStart(3,'0');
  const origin = escapeHtml(entry.origem || 'Origem em revisão');
  const name = escapeHtml(entry.nome);
  if (stage === 0) {
    const path = /^\/lendas\/[\w.-]+$/.test(entry.imagem || '') ? entry.imagem : '';
    const image = legendImages.find(art => art.id === entry.id && art.src);
    const src = image?.src || path;
    const art = src ? `<img src="${escapeHtml(src)}" srcset="${escapeHtml(image?.srcSet || '')}" sizes="(max-width:600px) 72vw, 275px" decoding="async" alt="Ilustração de ${name}" />` : '<span class="placeholderSymbol" aria-hidden="true">✦</span>';
    const threat = entry.ameaca == null ? '—' : `${Number(entry.ameaca)}/100`;
    const encounter = entry.encontro == null ? '—' : `${Number(entry.encontro)}/10`;
    return `<div class="faceContent">
      <div class="cardTop"><span>BAÚ DAS LENDAS</span><span>${n} / 060</span></div>
      <div class="cardArtwork">${art}</div>
      <h3 class="cardName">${name}</h3>
      <div class="cardOrigin">${origin}</div>
      <div class="cardStats"><span>AMEAÇA (JOGO)<b>${escapeHtml(threat)}</b></span><span>ENCONTRO (FICÇÃO)<b>${escapeHtml(encounter)}</b></span></div>
    </div>`;
  }
  if (stage === 1) {
    return `<div class="faceContent">
      <div class="cardTop"><span>DOSSIÊ DA LENDA</span><span>${n} / 060</span></div>
      <h3 class="dossierTitle">${name}</h3><div class="dossierSub">${origin}</div>
      <div class="textContent">${escapeHtml(entry.historia || 'História ainda em preparação.')}</div>
      <div class="cardTop"><span>RELATO · VERSÃO EM REVISÃO</span><span>02/03</span></div>
    </div>`;
  }
  return `<div class="faceContent rear">
    <div class="cardTop" style="position:absolute;top:19px;left:19px;right:19px"><span>ARQUIVO DAS SOMBRAS</span><span>${n}/060</span></div>
    <span class="rearSigil" aria-hidden="true">✦</span>
    <h3 class="rearTitle">BAÚ<br>DAS LENDAS</h3>
    <div class="rearDetails">TERCEIRA FACE · VERSO<br>UMA HISTÓRIA NÃO DEVE SER ESQUECIDA</div>
    <div class="cardTop" style="position:absolute;bottom:19px;left:19px;right:19px"><span>COLEÇÃO 2026</span><span>03/03</span></div>
  </div>`;
}
function setFace(element, entry, stage) {
  element.innerHTML = makeFace(entry, stage);
  element.querySelectorAll('img').forEach(image => image.addEventListener('error', () => {
    const fallback = document.createElement('span');
    fallback.className = 'placeholderSymbol';
    fallback.textContent = '✦';
    fallback.setAttribute('role', 'img');
    fallback.setAttribute('aria-label', `Imagem indisponível: ${entry.nome}`);
    image.replaceWith(fallback);
  }, { once: true }));
}
function drawCanvasCard(ctx, item) {
  ctx.clearRect(0,0,512,724);
  const grad = ctx.createLinearGradient(0,0,0,724);
  grad.addColorStop(0,'#24141b'); grad.addColorStop(1,'#090b10');
  ctx.fillStyle=grad;ctx.fillRect(0,0,512,724);
  ctx.strokeStyle='#a56a70';ctx.lineWidth=12;ctx.strokeRect(18,18,476,688);
  ctx.strokeStyle='#5e4248';ctx.lineWidth=3;ctx.strokeRect(37,37,438,650);
  ctx.fillStyle='#c7ada7';ctx.font='23px Georgia';ctx.textAlign='center';
  ctx.fillText('BAÚ DAS LENDAS',256,105);
  ctx.fillStyle='#a05b61';ctx.font='165px Georgia';ctx.fillText('✦',256,334);
  ctx.fillStyle='#eadcd5';ctx.font='bold 34px Georgia';
  const words=item.nome.toUpperCase().split(/\s+/);
  const lines=[''];
  for (const word of words) {
    const last=lines.length-1;
    const test=(lines[last]+' '+word).trim();
    if (ctx.measureText(test).width>425 && lines[last]) lines.push(word);
    else lines[last]=test;
  }
  lines.slice(0,3).forEach((line,index)=>ctx.fillText(line,256,478+index*49));
  ctx.font='20px Georgia';ctx.fillStyle='#caa5a0';
  ctx.fillText(`${String(item.numero).padStart(3,'0')} / 060`,256,650);
}

async function startExperience() {
  const user = await api('/auth/me');
  let progress = await api('/album/progress');
  if(progress.total !== 60) throw Error('O catálogo do servidor ainda não está pronto.');
  // Guarda só a chave da abertura pendente, nunca a coleção nem o token.
  const pendingStorage = `bau-pending-draw:${user.id}`;
  let openingKey = null;
  try { openingKey = sessionStorage.getItem(pendingStorage); } catch { /* chave em memória */ }
  let current=null, phase='idle', detected=false, started=false;
  let freshScanRequired=false, hasSeenTargetAway=false, openingAt=0;
  let flipStage=0, flipTurns=0;
  const rotor=$('#cardRotor'), reward=$('#rewardOverlay'), stage=$('#cardStage');
  const startButton=$('#start'), openButton=$('#openChest'), rescanButton=$('#rescanButton');

  function updateProgress() { $('#progress').textContent=`${progress.obtained} / 60 REGISTROS DESCOBERTOS`; }
  updateProgress();
  STATUS.textContent=`Inicie a câmera e aponte para o ${ALVO}.`;
  startButton.disabled=false;

  const tracker=criarRastreador($('#ar'));
  window.addEventListener('pagehide', () => tracker.dispose(), {once:true});
  window.addEventListener('pageshow', event => { if(event.persisted) window.location.reload(); });
  const {renderer,scene,camera}=tracker;
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  const anchor=tracker.addAnchor(0);
  // No cartaz (largura = 1), o baú fica menor e encostado na porta da casa desenhada.
  const root=new THREE.Group();anchor.group.add(root);
  if(!MODO_QR){root.scale.setScalar(.62);root.position.set(0,-.44,0);}
  scene.add(new THREE.AmbientLight(0xffffff,1.2));
  const light=new THREE.DirectionalLight(0xf4c6b4,2.1);light.position.set(2,3,5);scene.add(light);
  const rim=new THREE.DirectionalLight(0x8a839f,1.0);rim.position.set(-3,-1,3);scene.add(rim);
  const innerGlow=new THREE.PointLight(0xdf4157,0,.95);innerGlow.position.set(0,.28,.2);root.add(innerGlow);

  const madeira=new THREE.MeshStandardMaterial({color:0x36201f,roughness:.78,metalness:.15});
  const bronze=new THREE.MeshStandardMaterial({color:0x826467,roughness:.42,metalness:.65});
  const lidMat=new THREE.MeshStandardMaterial({color:0x1d171e,roughness:.65,metalness:.2});
  const chest=new THREE.Group();chest.position.set(0,-.12,.16);root.add(chest);
  function box(parent,w,h,d,x,y,z,material) {
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
    mesh.position.set(x,y,z);parent.add(mesh);return mesh;
  }
  box(chest,.77,.36,.43,0,-.04,0,madeira);
  box(chest,.8,.045,.46,0,-.19,0,bronze);
  for (const x of [-.31,.31]) box(chest,.045,.38,.47,x,-.04,0,bronze);
  box(chest,.16,.13,.045,0,.02,.236,bronze);
  const hinge=new THREE.Group();hinge.position.set(0,.16,-.205);chest.add(hinge);
  box(hinge,.8,.14,.44,0,.045,.20,lidMat);
  box(hinge,.8,.045,.45,0,.13,.20,bronze);

  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=724;
  const context=canvas.getContext('2d');
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const card3d=new THREE.Mesh(new THREE.PlaneGeometry(.42,.59),new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,transparent:true,depthTest:false}));
  card3d.position.set(0,.05,.22);card3d.scale.setScalar(.13);card3d.visible=false;root.add(card3d);

  function showReady() {
    const full=progress.complete && !openingKey;
    openButton.hidden=full || !detected || freshScanRequired;
    if (full) STATUS.textContent='Você encontrou todas as 60 cartas da coleção!';
    else if(freshScanRequired) STATUS.textContent=hasSeenTargetAway?`Aponte novamente para o ${ALVO} para iniciar outra abertura.`:`Afaste a câmera do ${ALVO} e volte a apontar para ele.`;
    else if(detected) STATUS.textContent=`${MODO_QR?'QR 02 reconhecido':'A casa apareceu'}. Toque em ABRIR BAÚ para descobrir uma carta!`;
    else STATUS.textContent=MODO_QR?'Aponte para o QR 02 impresso ou exibido em outra tela.':'Aponte para o cartaz da casa, inteiro na tela e com boa luz.';
  }
  anchor.onTargetFound=()=>{
    detected=true;
    if(freshScanRequired && hasSeenTargetAway) {
      freshScanRequired=false;
      phase='ready';
    }
    if(phase==='idle'||phase==='ready') showReady();
  };
  anchor.onTargetLost=()=>{
    detected=false;
    openButton.hidden=true;
    if(freshScanRequired) hasSeenTargetAway=true;
    if(phase==='idle'||phase==='ready') showReady();
  };

  function showReward() {
    phase='reward';card3d.visible=false;
    setFace(faceA,current,0);
    setFace(faceB,current,1);
    flipStage=0;flipTurns=0;
    rotor.style.transition='none';rotor.style.transform='rotateY(0deg)';
    void rotor.offsetWidth;rotor.style.transition='transform .78s cubic-bezier(.2,.8,.2,1)';
    $('#flipLabel').textContent=flipLabels[0];
    const allCollected=progress.complete;
    rescanButton.textContent=allCollected?'COLEÇÃO COMPLETA':'ESCANEAR NOVAMENTE';
    rescanButton.disabled=allCollected;

    // Posição projetada da carta 3D: a carta em HTML parece vir de onde está o baú.
    let x=0,y=110;
    if(detected) {
      scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
      const v=new THREE.Vector3();card3d.getWorldPosition(v);v.project(camera);
      if(Number.isFinite(v.x)&&Number.isFinite(v.y)) {
        x=Math.max(-innerWidth,Math.min(innerWidth,v.x*innerWidth*.5));
        y=Math.max(-innerHeight,Math.min(innerHeight,-v.y*innerHeight*.5));
      }
    }
    stage.style.setProperty('--from-x',`${x}px`);
    stage.style.setProperty('--from-y',`${y}px`);
    reward.hidden=false;reward.classList.remove('entrance');void reward.offsetWidth;reward.classList.add('entrance');
    $('#flipButton').focus();
    STATUS.textContent=`${current.nome} entrou na sua coleção. Gire a carta para revelar as três faces.`;
  }

  openButton.addEventListener('click',async()=>{
    if(!started || !detected || freshScanRequired || (phase!=='idle' && phase!=='ready')) return;
    if(progress.complete && !openingKey){showReady();return;}
    phase='requesting';openButton.hidden=true;
    STATUS.textContent='Consultando o baú…';
    openingKey ||= crypto.randomUUID();
    try { sessionStorage.setItem(pendingStorage, openingKey); } catch { /* chave em memória */ }
    try {
      const result = await api('/draws', {method:'POST', headers:{'Idempotency-Key':openingKey}});
      // Uma repetição devolve o snapshot original; progresso pode ter avançado em outra aba.
      progress=result.progress;updateProgress();
      // O sorteio idempotente é um snapshot; consulte também o progresso atual.
      api('/album/progress').then(latest => { progress=latest;updateProgress(); }).catch(() => {});
      if(!result.legend) { openingKey=null; try { sessionStorage.removeItem(pendingStorage); } catch {} phase='ready';showReady();return; }
      current=result.legend;
    } catch(error) {
      phase='ready';showReady();
      STATUS.textContent=`${error.message} Toque em ABRIR BAÚ para tentar recuperar esta abertura.`;
      if(error.status===401) {
        const link=document.createElement('a');link.href='/?conta=1&retorno=ritual';link.textContent=' Entrar na conta';STATUS.append(link);
      }
      return;
    }
    drawCanvasCard(context,current);texture.needsUpdate=true;
    const art = legendImages.find(image => image.id === current.id && image.src);
    if (art) {
      const card = current, image = new Image();
      image.onload = () => {
        if (current !== card) return;
        context.fillStyle='#151117';context.fillRect(64,136,384,258);
        const scale=Math.min(384/image.naturalWidth,258/image.naturalHeight);
        const w=image.naturalWidth*scale,h=image.naturalHeight*scale;
        context.drawImage(image,256-w/2,265-h/2,w,h);texture.needsUpdate=true;
      };
      image.src=art.src;
    }
    phase='opening';openingAt=performance.now();
    card3d.visible=false;
    openButton.hidden=true;
    STATUS.textContent='O baú foi aberto... algo está saindo de dentro dele!';
  });

  $('#flipButton').addEventListener('click',()=>{
    if(phase!=='reward') return;
    const next=(flipStage+1)%3;
    setFace(flipTurns%2===0?faceB:faceA,current,next);
    flipStage=next;flipTurns+=1;
    rotor.style.transform=`rotateY(${flipTurns*180}deg)`;
    $('#flipLabel').textContent=flipLabels[next];
  });

  rescanButton.addEventListener('click',()=>{
    if(phase!=='reward'||progress.complete) return;
    openingKey=null;
    try { sessionStorage.removeItem(pendingStorage); } catch { /* chave em memória */ }
    reward.hidden=true;reward.classList.remove('entrance');
    card3d.visible=false;hinge.rotation.x=0;innerGlow.intensity=0;
    phase='ready';
    freshScanRequired=true;
    hasSeenTargetAway=!detected;
    showReady();
  });

  startButton.addEventListener('click',async()=>{
    if(started)return;
    startButton.disabled=true;STATUS.textContent=`Abrindo a câmera para reconhecer o ${ALVO}…`;
    try {
      await tracker.start();started=true;startButton.hidden=true;showReady();
      renderer.setAnimationLoop(()=>{
        if(phase==='opening') {
          const elapsed=performance.now()-openingAt;
          const lid=easeOutCubic(elapsed/850);
          hinge.rotation.x=-1.65*lid;
          innerGlow.intensity=8*lid;
          const t=easeOutCubic((elapsed-340)/1300);
          card3d.visible=elapsed>=360;
          card3d.position.set(0,.05+.68*t,.22+.8*t);
          card3d.scale.setScalar(.13+1.08*t);
          card3d.rotation.z=Math.sin(t*Math.PI)*-.06;
          if(elapsed>=1750) { globalThis.navigator?.vibrate?.([30,60,120]); showReward(); }
        } else if(phase==='ready'||phase==='idle') {
          hinge.rotation.x=THREE.MathUtils.lerp(hinge.rotation.x,0,.12);
          innerGlow.intensity=THREE.MathUtils.lerp(innerGlow.intensity,0,.12);
        }
        renderer.render(scene,camera);
      });
    } catch(error) {
      console.error(error);
      STATUS.textContent=error?.name==='NotAllowedError' ? 'Permita o acesso à câmera no navegador e tente novamente.'
        : error?.name==='NotFoundError' ? 'Nenhuma câmera foi encontrada neste dispositivo.'
        : `Não foi possível iniciar a câmera: ${error?.message || 'erro desconhecido'}`;
      startButton.disabled=false;
    }
  });
}

startExperience().catch(error=>{
  console.error(error);
  STATUS.textContent=`Não foi possível preparar a RA: ${error.message}`;
  const retry=$('#start');
  retry.disabled=error.status===401;
  if(error.status!==401) {
    retry.textContent='TENTAR NOVAMENTE';
    retry.addEventListener('click',()=>window.location.reload(),{once:true});
  }
  if(error.status===401) {
    const link=document.createElement('a');link.href='/?conta=1&retorno=ritual';link.textContent=' Entrar na conta';STATUS.append(link);
  }
});
