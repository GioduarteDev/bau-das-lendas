// API e PostgreSQL reais. Só o vídeo da câmera é sintético; não aprova celular físico.
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir } from 'node:fs/promises'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const headers = { Origin: origin, 'X-Bau-Request': '1' }
const artifacts = 'tests/artifacts/integration'
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 },
      isMobile: mobile, hasTouch: mobile })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(20000)
    const email = `integration-${randomUUID()}@example.com`, password = randomUUID()
    await page.goto(`${origin}/?conta=1`)
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Auditoria')
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha (10 a 128 caracteres)', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Bem-vindo, Auditoria.', { exact: false }).waitFor()
    const catalog = await (await context.request.get(`${origin}/api/legends`)).json()
    assert.equal(catalog.length, 60)
    await page.goto(`${origin}/?portais=1`)
    assert.equal(await page.locator('.portal-qr svg').count(), 2)
    const qrs = await page.locator('.portal-qr svg').evaluateAll(async elements => {
      return await Promise.all(elements.map(async svg => {
        const image = new Image()
        image.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg))
        await image.decode()
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 800
        canvas.getContext('2d').drawImage(image, 0, 0, 800, 800)
        return canvas.toDataURL()
      }))
    })
    await context.addInitScript(({ qrs }) => {
      const images = qrs.map(src => { const image = new Image(); image.src = src; return image })
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720
      const ctx = canvas.getContext('2d')
      let marker = -1
      function paint() {
        ctx.fillStyle = '#888'; ctx.fillRect(0, 0, 1280, 720)
        if (marker >= 0 && images[marker].complete) ctx.drawImage(images[marker], 390, 110, 500, 500)
      }
      globalThis.auditCamera = { marker(value) { marker = value; paint() } }
      navigator.mediaDevices.getUserMedia = async () => {
        await Promise.all(images.map(image => image.decode())); paint()
        const interval = setInterval(paint, 66)
        addEventListener('pagehide', () => clearInterval(interval), { once: true })
        return canvas.captureStream(15)
      }
    }, { qrs })
    let draws = 0
    page.on('request', request => { if (request.url().endsWith('/api/draws')) draws++ })
    await page.goto(`${origin}/ra.html?rastreio=qr`)
    await page.getByRole('button', { name: 'INICIAR CÂMERA' }).click()
    await page.evaluate(() => auditCamera.marker(0))
    await page.waitForTimeout(700)
    assert.ok(await page.locator('#openChest').isHidden(), 'QR 01 não abre o baú')
    await page.evaluate(() => auditCamera.marker(1))
    await page.locator('#openChest:not([hidden])').waitFor()
    assert.equal(draws, 0)
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-bau.png` })
    await page.evaluate(() => auditCamera.marker(-1))
    await page.locator('#openChest[hidden]').waitFor({ state: 'attached' })
    await page.evaluate(() => auditCamera.marker(1))
    await page.locator('#openChest:not([hidden])').waitFor()
    await page.locator('#openChest').click()
    await page.locator('#rewardOverlay:not([hidden])').waitFor()
    assert.equal(draws, 1)
    assert.match(await page.locator('#flipLabel').textContent(), /FACE 1 DE 3/)
    await page.locator('#flipButton').click()
    assert.match(await page.locator('#flipLabel').textContent(), /FACE 2 DE 3/)
    await page.waitForTimeout(800)
    await page.locator('#flipButton').click()
    assert.match(await page.locator('#flipLabel').textContent(), /FACE 3 DE 3/)
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-carta.png` })
    const firstAlbum = await (await context.request.get(`${origin}/api/album`)).json()
    const firstId = firstAlbum.positions.find(position => position.unlocked).legend.id
    await page.getByRole('link', { name: 'Abrir meu grimório' }).click()
    await page.getByText('1/60', { exact: true }).waitFor()
    assert.equal(await page.locator('.posicao').count(), 60)
    assert.equal(await page.locator('.posicao.revelada').count(), 1)
    await page.reload()
    await page.getByText('1/60', { exact: true }).waitFor()
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-album.png` })
    await context.request.post(`${origin}/api/auth/logout`, { headers })
    assert.equal((await context.request.get(`${origin}/api/album`)).status(), 401)
    await page.goto(`${origin}/?conta=1`)
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha (10 a 128 caracteres)', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByText('Bem-vindo, Auditoria.', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Abrir meu grimório', exact: true }).click()
    await page.getByText('1/60', { exact: true }).waitFor()
    assert.equal((await (await context.request.get(`${origin}/api/album`)).json()).positions.find(p => p.unlocked).legend.id, firstId)
    const other = await browser.newContext()
    assert.equal((await other.request.post(`${origin}/api/auth/register`, { headers,
      data: { username: 'Outra conta', email: `isolation-${randomUUID()}@example.com`, password: randomUUID() } })).status(), 201)
    assert.equal((await (await other.request.get(`${origin}/api/album/progress`)).json()).obtained, 0)
    await other.close()
    assert.deepEqual(errors, [])
    console.log(`${mobile ? 'Celular emulado' : 'Desktop'} APROVADO: cadastro, login, QR incorreto/correto, perda/retorno, baú, carta, três faces, PostgreSQL, reload, Grimório, logout, novo login e isolamento. Câmera sintética.`)
    await context.close()
  }
} finally { await browser.close() }
