// Descobertas e imagens reais, sem respostas de API simuladas.
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const headers = { Origin: origin, 'X-Bau-Request': '1' }
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
await mkdir('tests/artifacts/integration', { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--enable-unsafe-swiftshader'] })
try {
  const context = await browser.newContext({ viewport: { width: 1365, height: 900 } })
  const response = await context.request.post(`${origin}/api/auth/register`, { headers,
    data: { username: 'Auditoria de imagens', email: `assets-${randomUUID()}@example.com`, password: randomUUID() } })
  assert.equal(response.status(), 201)
  const user = await response.json()
  let loiraKey
  const ids = new Set()
  for (let i = 0; i < 60; i++) {
    const response = await context.request.post(`${origin}/api/draws`, { headers: { ...headers, 'Idempotency-Key': `assets-${i}` } })
    assert.equal(response.status(), 200)
    const draw = await response.json()
    ids.add(draw.legend.id)
    if (draw.legend.id === 'loira-do-banheiro') loiraKey = `assets-${i}`
  }
  assert.equal(ids.size, 60)
  const page = await context.newPage()
  page.on('pageerror', error => console.error('Erro JavaScript:', error.message))
  page.setDefaultTimeout(20000)
  await page.goto(`${origin}/?album=1`)
  await page.getByText('60/60', { exact: true }).waitFor()
  await page.getByRole('button', { name: 'Próxima folha', exact: true }).click()
  const image = page.locator('.posicao[data-posicao="1"] img')
  await image.waitFor()
  await page.waitForFunction(() => document.querySelector('.posicao[data-posicao="1"] img')?.naturalWidth > 0)
  assert.equal(await image.getAttribute('src'), '/casa/img/cartas/loira.jpg')
  assert.equal(await image.evaluate(img => getComputedStyle(img).objectFit), 'contain')
  assert.match(await image.getAttribute('alt'), /Loira do Banheiro/)
  await page.getByRole('button', { name: 'Abrir carta Loira do Banheiro', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('.inspecao-arte img')?.naturalWidth > 0)
  await page.screenshot({ path: 'tests/artifacts/integration/loira-arte.png', animations: 'disabled' })
  await page.getByRole('button', { name: 'Virar carta' }).click()
  await page.getByRole('heading', { name: 'O relato', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Virar carta' }).click()
  await page.locator('.inspecao-verso').waitFor()
  await page.goto(origin)
  await page.getByRole('button', { name: 'Lendas', exact: true }).click()
  assert.equal(await page.locator('.indice-lendas li').count(), 60)
  assert.equal(await page.locator('.indice-lendas img').count(), 8)
  await page.waitForFunction(() => [...document.querySelectorAll('.indice-lendas img')].every(img => img.naturalWidth > 0))
  // Recupera na RA o sorteio real da Loira pela mesma chave, sem alterar a coleção.
  await page.goto(`${origin}/?portais=1`)
  const qr = await page.locator('.portal-qr svg').nth(1).evaluate(async svg => {
    const image = new Image(); image.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg))
    await image.decode()
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 800
    canvas.getContext('2d').drawImage(image, 0, 0, 800, 800)
    return canvas.toDataURL()
  })
  await context.addInitScript(({ qr, userId, key }) => {
    if (location.pathname !== '/ra.html') return
    sessionStorage.setItem(`bau-pending-draw:${userId}`, key)
    const image = new Image(); image.src = qr
    const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720
    navigator.mediaDevices.getUserMedia = async () => {
      await image.decode()
      const ctx = canvas.getContext('2d'); ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 1280, 720)
      ctx.drawImage(image, 390, 110, 500, 500)
      return canvas.captureStream(15)
    }
  }, { qr, userId: user.id, key: loiraKey })
  await page.goto(`${origin}/ra.html?rastreio=qr`)
  await page.locator('#start').click()
  await page.locator('#openChest:not([hidden])').waitFor()
  await page.locator('#openChest').click()
  await page.locator('#rewardOverlay:not([hidden])').waitFor()
  await page.waitForFunction(() => document.querySelector('#faceA img')?.naturalWidth > 0)
  assert.match(await page.locator('#faceA img').getAttribute('src'), /loira\.jpg/)
  await page.screenshot({ path: 'tests/artifacts/integration/loira-ra.png', animations: 'disabled' })
  // Falha de transporte da imagem, mantendo a API e a coleção reais.
  await context.route('**/casa/img/cartas/*.jpg', route => route.abort())
  await page.goto(`${origin}/?album=1`)
  await page.getByText('60/60', { exact: true }).waitFor().catch(async error => {
    console.error('Aviso do álbum:', await page.locator('.grimorio-aviso').allTextContents())
    await page.screenshot({ path: 'tests/artifacts/integration/fallback-error.png' })
    throw error
  })
  await page.locator('.posicao[data-posicao="1"] [role="img"]').waitFor({ state: 'attached' })
  await page.getByRole('button', { name: 'Próxima folha', exact: true }).click()
  await page.getByRole('button', { name: 'Abrir carta Loira do Banheiro', exact: true }).click()
  await page.locator('.inspecao-arte [role="img"]').waitFor()
  await page.screenshot({ path: 'tests/artifacts/integration/loira-fallback.png', animations: 'disabled' })
  await page.goto(`${origin}/casa/cartas.html`)
  await page.waitForFunction(() => document.getElementById('contagem')?.textContent === '60')
  assert.equal(await page.locator('#mesa [data-unlocked="true"]').count(), 8, 'O progresso inclui as 60 cartas, mesmo que só oito tenham arte')
  await context.close()

  const anonymous = await browser.newContext()
  const unauthPage = await anonymous.newPage()
  await unauthPage.goto(`${origin}/ra.html?rastreio=qr`)
  const loginLink = unauthPage.getByRole('link', { name: 'Entrar na conta', exact: true })
  await loginLink.click()
  await unauthPage.getByLabel('E-mail', { exact: true }).waitFor()
  await anonymous.close()
  console.log('APROVADO: 60 cartas únicas persistidas; artes responsivas no catálogo/Grimório/RA; recuperação idempotente da Loira; três faces; fallback em falha de imagem; link de login da RA clicável. Câmera sintética.')
} finally { await browser.close() }
