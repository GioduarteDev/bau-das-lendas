import * as THREE from 'three';
import { estimateQrPose, isRitualQr } from '/qr-pose.js';

// Detector do próprio QR 02. Não usa imagem MIND, plano invisível ou alvo extra.
// A pose é estimada dos quatro cantos; validação física está descrita em docs/VALIDACAO-VISUAL.md.
export class QRTrackerThree {
  constructor({ container, decoder = globalThis.jsQR }) {
    if (typeof decoder !== 'function') throw Error('O leitor de QR não carregou. Recarregue a página.');
    this.container = container; this.decoder = decoder;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, .01, 150);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.setClearColor(0x000000, 0);
    this.video = document.createElement('video');
    this.video.muted = true; this.video.playsInline = true; this.video.autoplay = true;
    this.video.setAttribute('playsinline', ''); this.video.setAttribute('aria-hidden', 'true');
    this.video.className = 'ritual-camera';
    this.canvas = document.createElement('canvas');
    this.context = this.canvas.getContext('2d', { willReadFrequently: true });
    this.anchor = { group: new THREE.Group(), onTargetFound: null, onTargetLost: null };
    this.anchor.group.visible = false; this.scene.add(this.anchor.group);
    container.append(this.video, this.renderer.domElement);
    this.found = false; this.hits = 0; this.lastScan = 0; this.lastFound = 0;
    this.resize = () => {
      const { width, height } = container.getBoundingClientRect();
      if (!width || !height) return;
      this.renderer.setSize(width, height);
      const vw = this.video.videoWidth || width, vh = this.video.videoHeight || height;
      const focal = vh / (2 * Math.tan(Math.PI/6)) * Math.max(width/vw, height/vh);
      this.camera.fov = 2*Math.atan(height/(2*focal))*180/Math.PI;
      this.camera.aspect = width/height; this.camera.updateProjectionMatrix();
    };
    this.onVisibility = () => {
      if (document.hidden) { this.loseTarget(); this.video.pause(); }
      else if (this.running) this.video.play().catch(() => this.stop());
    };
    window.addEventListener('resize', this.resize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.resize();
  }

  addAnchor() { return this.anchor; }

  async start() {
    if (this.running) return;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw Error('Abra o site por HTTPS em um navegador com acesso à câmera.');
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      this.video.srcObject = this.stream;
      await this.video.play();
      this.resize(); this.running = true;
      const scan = now => {
        if (!this.running) return;
        if (!document.hidden && this.video.readyState >= 2 && now-this.lastScan >= 100) {
          this.lastScan = now;
          try { this.scanFrame(now); } catch { this.loseTarget(); }
        }
        this.frame = requestAnimationFrame(scan);
      };
      this.frame = requestAnimationFrame(scan);
    } catch (error) { this.stop(); throw error; }
  }

  scanFrame(now) {
    const video = this.video;
    const factor = Math.min(1, 720 / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth*factor), height = Math.round(video.videoHeight*factor);
    if (!width || !height) return;
    if (this.canvas.width !== width || this.canvas.height !== height) { this.canvas.width = width; this.canvas.height = height; }
    this.context.drawImage(video,0,0,width,height);
    const pixels = this.context.getImageData(0,0,width,height);
    const result = this.decoder(pixels.data,width,height,{ inversionAttempts: 'dontInvert' });
    let pose = null;
    if (result && isRitualQr(result.data, window.location.origin)) {
      const l = result.location;
      pose = estimateQrPose([l.topLeftCorner,l.topRightCorner,l.bottomRightCorner,l.bottomLeftCorner],width,height);
    }
    if (pose) {
      const matrix = new THREE.Matrix4().fromArray(pose);
      const position = new THREE.Vector3(), rotation = new THREE.Quaternion(), scale = new THREE.Vector3();
      matrix.decompose(position,rotation,scale);
      const group = this.anchor.group;
      if (!this.found) { group.position.copy(position); group.quaternion.copy(rotation); }
      else { group.position.lerp(position,.55); group.quaternion.slerp(rotation,.55); }
      this.lastFound = now; this.hits++;
      if (this.hits >= 2 && !this.found) {
        this.found = true; group.visible = true; this.anchor.onTargetFound?.();
      }
    } else {
      this.hits = 0;
      if (now-this.lastFound > 350) this.loseTarget();
    }
  }

  loseTarget() {
    this.hits = 0; this.anchor.group.visible = false;
    if (this.found) { this.found = false; this.anchor.onTargetLost?.(); }
  }

  stop() {
    this.running = false; cancelAnimationFrame(this.frame);
    this.stream?.getTracks().forEach(track => track.stop());
    this.video.srcObject = null; this.loseTarget();
  }

  dispose() {
    this.stop(); this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize',this.resize);
    document.removeEventListener('visibilitychange',this.onVisibility);
    this.scene.traverse(object => {
      object.geometry?.dispose();
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.filter(Boolean).forEach(material => { material.map?.dispose(); material.dispose(); });
    });
    this.renderer.dispose(); this.container.replaceChildren();
  }
}
