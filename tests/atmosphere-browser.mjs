import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const destination = 'tests/artifacts/atmosfera'
await mkdir(destination, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'],
})
const resultados = []
try {
  for (const perfil of ['desktop', 'mobile', 'apresentacao']) {
    const page = await browser.newPage({
      viewport: perfil === 'mobile' ? { width: 390, height: 844 } : { width: 1280, height: 800 },
      isMobile: perfil === 'mobile', hasTouch: perfil === 'mobile',
    })
    const erros = []
    page.on('pageerror', e => erros.push(e.message))
    page.on('console', msg => {
      if (msg.type() === 'error' && /THREE|WebGL|shader|GLSL/i.test(msg.text())) erros.push(msg.text())
    })
    await page.goto(`${origin}/?atmosferaDebug=1&assombracao=saci${perfil === 'apresentacao' ? '&apresentacao=1' : ''}`)
    await page.waitForFunction(() => window.__bauAtmosfera?.inspecionar().chamadas > 0)
    const ler = () => page.evaluate(() => window.__bauAtmosfera.inspecionar())
    const entrada = await ler()
    assert.equal(entrada.perfil, perfil)
    assert.equal(entrada.total, perfil === 'mobile' ? 660 : perfil === 'desktop' ? 1650 : 1880)
    await page.screenshot({ path: `${destination}/${perfil}-entrada.png` })
    await page.mouse.wheel(0, 110)
    await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().velocidade < -0.5)
    const primeiroScroll = await ler()
    assert.ok(primeiroScroll.cameraZ < entrada.cameraZ, 'A câmera deve atravessar o volume')
    // Antes da reciclagem, o Z das partículas permanece no mundo, em vez de seguir a câmera.
    const amostra = primeiroScroll.particulas.filter((_, i) => i % 3 === 2)
    const inicial = entrada.particulas.filter((_, i) => i % 3 === 2)
    assert.ok(amostra.some((z, i) => Math.abs(z - inicial[i]) < Math.abs(primeiroScroll.cameraZ - entrada.cameraZ) * 0.5), 'Parallax deve vir do deslocamento real da câmera')
    await page.screenshot({ path: `${destination}/${perfil}-portal.png` })
    await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().cameraZ < -3)
    await page.locator('.site.cena-travessia').waitFor()
    await page.mouse.wheel(0, 780)
    await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().cameraZ < -12)
    await page.screenshot({ path: `${destination}/${perfil}-corredor.png` })
    const antesReverso = await ler()
    await page.mouse.wheel(0, -600)
    await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().velocidade > 0.4)
    const reverso = await ler()
    assert.ok(reverso.cameraZ > antesReverso.cameraZ)
    assert.ok(reverso.recicladas > 0, 'Volumes devem reciclar partículas')
    assert.ok(reverso.eventos > 0, 'Aparição deve perturbar a atmosfera')
    await page.screenshot({ path: `${destination}/${perfil}-reverso.png` })
    assert.deepEqual(erros, [], 'Sem erros WebGL ou JavaScript')
    resultados.push({ perfil, entrada, primeiroScroll, reverso, erros })
    console.log(`${perfil}: shaders, parallax, scroll direto/reverso, reciclagem e aparição aprovados; ${reverso.total} partículas, ${reverso.chamadas} draw calls na cena completa, média ${reverso.mediaMs.toFixed(1)} ms (Chrome headless/SwiftShader).`)
    await page.close()
  }
  // Movimento reduzido mantém a perspectiva e suspende deriva e eventos.
  const page = await browser.newPage({ reducedMotion: 'reduce', viewport: { width: 800, height: 600 } })
  await page.goto(`${origin}/?atmosferaDebug=1`)
  await page.waitForFunction(() => window.__bauAtmosfera?.inspecionar().chamadas > 0)
  const a = await page.evaluate(() => window.__bauAtmosfera.inspecionar())
  await page.waitForTimeout(600)
  const b = await page.evaluate(() => window.__bauAtmosfera.inspecionar())
  assert.deepEqual(a.particulas, b.particulas, 'Movimento reduzido deve suspender deriva')
  console.log('Movimento reduzido: partículas estáveis.')
  await page.close()
  await writeFile(`${destination}/resultados.json`, JSON.stringify(resultados, null, 2))
} finally { await browser.close() }
