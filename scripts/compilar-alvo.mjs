// Gera public/alvos/casa.mind a partir de public/alvos/casa.jpg (imagem que a câmera reconhece).
// Use quando mudar o desenho do cartaz:  node scripts/compilar-alvo.mjs
// Roda o compilador do próprio MindAR 1.2.5 num Chromium sem janela (Playwright).
import { createServer } from 'node:http'
import { readFile, writeFile } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { chromium } from '@playwright/test'

const raiz = join(import.meta.dirname, '..', 'public')
const tipos = { '.js': 'text/javascript', '.jpg': 'image/jpeg', '.png': 'image/png', '.html': 'text/html' }
const pagina = `<!doctype html><img id="alvo" src="/alvos/casa.jpg"><script type="module">
import { Compiler } from '/vendor/mindar/mindar-image.prod.js';
window.compilar = async () => {
  const img = document.getElementById('alvo'); await img.decode();
  const c = new Compiler(); const dados = await c.compileImageTargets([img], () => {});
  const u = new Uint8Array(await c.exportData()); let s = '';
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return { b64: btoa(s), pontos: dados[0].trackingData.map(t => t.points.length) };
}; window.pronto = true;</script>`

const servidor = createServer(async (req, res) => {
  const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  if (caminho === '/compilar') { res.writeHead(200, { 'Content-Type': 'text/html' }); return res.end(pagina) }
  try {
    const arquivo = join(raiz, caminho)
    if (!arquivo.startsWith(raiz)) throw Error('fora da pasta')
    res.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] || 'application/octet-stream' })
    res.end(await readFile(arquivo))
  } catch { res.writeHead(404); res.end() }
}).listen(0)

const porta = servidor.address().port
const navegador = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
try {
  const p = await navegador.newPage()
  await p.goto(`http://localhost:${porta}/compilar`)
  await p.waitForFunction(() => window.pronto, null, { timeout: 60000 })
  const r = await p.evaluate(() => window.compilar())
  await writeFile(join(raiz, 'alvos', 'casa.mind'), Buffer.from(r.b64, 'base64'))
  console.log('public/alvos/casa.mind gerado. Pontos de rastreio por escala:', r.pontos.join(', '))
} finally { await navegador.close(); servidor.close() }
