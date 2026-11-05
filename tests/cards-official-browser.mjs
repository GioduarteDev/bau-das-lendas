// Coleção e autenticação reais. Credenciais locais são usadas sem sair no log.
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { officialArtFiles } from '../public/card-art.js'

const credentials = JSON.parse(await readFile('backend/.demo-account.local.json', 'utf8'))
const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const headers = { Origin: origin, 'X-Bau-Request': '1' }
const destination = 'tests/artifacts/cards-official'
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
await mkdir(destination, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'] })
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: mobile ? 'reduce' : 'no-preference' })
    const page = await context.newPage()
    page.setDefaultTimeout(25000)
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${origin}/?conta=1`)
    await page.getByLabel('E-mail', { exact: true }).fill(credentials.email)
    await page.getByLabel('Senha (10 a 128 caracteres)', { exact: true }).fill(credentials.password)
    await page.getByRole('button', { name: 'Entrar', exact: true }).click()
    await page.getByText('Bem-vindo, Demonstração Baú das Lendas.', { exact: false }).waitFor()
    const album = await (await context.request.get(`${origin}/api/album`)).json()
    const catalog = await (await context.request.get(`${origin}/api/legends`)).json()
    assert.deepEqual(album.positions.filter(p => p.unlocked).map(p => p.legend.id).sort(), Object.keys(officialArtFiles).sort())
    await page.goto(`${origin}/casa/cartas.html`)
    await page.waitForFunction(() => document.querySelectorAll('#mesa .carta-x[data-unlocked="true"]').length === 8)
    assert.equal(await page.locator('#mesa .carta-x').count(), 9)
    await page.waitForFunction(() => [...document.querySelectorAll('#mesa .cx-frente img')].length === 9 && [...document.querySelectorAll('#mesa .cx-frente img')].every(img => img.naturalWidth > 0))
    for (const [id, file] of Object.entries(officialArtFiles)) {
      const image = page.locator(`#mesa [data-legend-id="${id}"] .cx-frente img`)
      assert.equal(await image.getAttribute('src'), `/casa/img/cartas/${file}`)
      assert.equal(await image.evaluate(img => getComputedStyle(img).objectFit), 'contain')
    }
    const loira = page.locator('#mesa [data-legend-id="loira-do-banheiro"]')
    assert.equal(await loira.getAttribute('data-face'), 'frente')
    if (mobile) await loira.tap(); else await loira.click()
    assert.equal(await loira.getAttribute('data-face'), 'verso')
    await loira.press('Space')
    assert.equal(await loira.getAttribute('data-face'), 'frente')
    await loira.press('Enter')
    assert.equal(await loira.getAttribute('data-face'), 'verso')
    const transition = await loira.locator('.cx-virador').evaluate(el => getComputedStyle(el).transitionDuration)
    assert.equal(transition, mobile ? '0s' : '1s')
    await page.screenshot({ path: `${destination}/${mobile ? 'mobile' : 'desktop'}-flip.png`, animations: 'disabled' })
    await page.reload()
    await page.waitForFunction(() => document.querySelectorAll('#mesa .carta-x[data-unlocked="true"]').length === 8)
    await page.getByRole('button', { name: 'AMPLIAR Loira do Banheiro', exact: true }).click()
    await page.locator('#revelar:not([hidden])').waitFor()
    assert.equal(await page.locator('#revelar .carta-x').getAttribute('data-face'), 'frente')
    if (!mobile) {
      await page.setViewportSize({ width:844, height:390 })
      const modalCard = await page.locator('#revelar .carta-x').boundingBox()
      assert.ok(modalCard.y >= 0 && modalCard.y + modalCard.height <= 390)
      await page.locator('#revelar-fechar').click()
      await page.setViewportSize({ width:1365, height:900 })
    } else await page.locator('#revelar-fechar').click()
    await page.goto(`${origin}/casa/cartas.html?carta=saci-perere`)
    await page.locator('#revelar:not([hidden])').waitFor()
    await page.evaluate(() => dispatchEvent(new Event('focus')))
    await page.waitForFunction(() => globalThis.Bau?.colecao?.user)
    assert.ok(await page.locator('#revelar').isVisible(), 'A consulta da conta não fecha a exposição pública do Saci')
    assert.match(await page.locator('#revelar-instrucao').textContent(), /NÃO CONTA NAS 60/)
    await page.goto(`${origin}/?album=1`)
    await page.getByText('8/60', { exact: true }).waitFor()
    assert.equal(await page.locator('.posicao').count(), 60)
    assert.equal(await page.locator('.posicao.revelada').count(), 8)
    await page.getByRole('button', { name: 'Próxima folha', exact: true }).click()
    await page.getByRole('button', { name: 'Abrir carta Loira do Banheiro', exact: true }).click()
    const reactCard = page.locator('.inspecao-arte .carta-x')
    await reactCard.waitFor()
    await reactCard.click()
    assert.equal(await reactCard.getAttribute('data-face'), 'verso')
    await reactCard.press('Enter')
    assert.equal(await reactCard.getAttribute('data-face'), 'frente')
    await page.screenshot({ path: `${destination}/${mobile ? 'mobile' : 'desktop'}-grimorio.png`, animations: 'disabled' })
    await page.goto(`${origin}/casa/index.html`)
    await page.waitForFunction(() => globalThis.Bau?.lendas?.length === 60 && Bau.corredor?.kit?.D)
    await page.waitForFunction(() => Bau.colecao.cards.size === 8)
    assert.equal(await page.locator('#mundo .carta[data-legend-id]').count(), 60)
    assert.equal(await page.locator('#mundo .carta[data-exhibit-id="saci-perere"]').count(), 1)
    assert.ok(await page.locator('.j-fachada').count() > 0)
    const houseIds = await page.evaluate(() => Bau.lendas.map(l => [l.id, l.numero]))
    assert.deepEqual(houseIds, catalog.map(l => [l.id, l.numero]))
    assert.equal(new Set(houseIds.map(l => l[0])).size, 60)
    for (let i = 0; i < 18 && !await page.evaluate(() => Bau.corredor.estado.dentro); i++) {
      await page.mouse.wheel(0, 500); await page.waitForTimeout(100)
    }
    await page.waitForFunction(() => Bau.corredor.estado.dentro)
    // Usa os controles existentes, sem ajustar a câmera por script.
    for (let i = 0; i < 12 && await page.evaluate(() => Bau.corredor.estado.i > 0); i++) {
      await page.locator('#btn-ant').click(); await page.waitForTimeout(200)
    }
    await page.waitForFunction(() => Bau.corredor.estado.i === 0)
    await page.locator('#btn-dossie').click()
    await page.locator('#dossie:not([hidden])').waitFor()
    await page.locator('#dossie').getByRole('heading', { name: 'Loira do Banheiro', exact: true }).waitFor()
    const houseCard = page.locator('#dossie-carta .carta-x')
    await houseCard.click()
    assert.equal(await houseCard.getAttribute('data-face'), 'verso')
    await houseCard.press('Space')
    assert.equal(await houseCard.getAttribute('data-face'), 'frente')
    const box = await houseCard.boundingBox()
    assert.ok(box.width <= 281)
    await page.screenshot({ path: `${destination}/${mobile ? 'mobile' : 'desktop'}-corredor.png`, animations: 'disabled' })
    await page.locator('#btn-fechar').click()
    for (let i = 0; i < 22 && await page.evaluate(() => Bau.corredor.estado.camZ > -4500); i++) {
      await page.mouse.wheel(0, -500); await page.waitForTimeout(100)
    }
    await page.waitForFunction(() => !Bau.corredor.estado.dentro && Bau.corredor.estado.camZ < -4500)
    assert.deepEqual(errors, [])
    console.log(`${mobile ? 'Celular emulado com movimento reduzido' : 'Desktop'}: 9 imagens, 8 cartas oficiais, Saci em exposição, flip/toque/teclado, persistência, Grimório e scroll jardim ↔ corredor APROVADOS.`)
    await context.close()
  }
  const context = await browser.newContext()
  for (const path of ['/backend/.demo-account.local.json', '/backend/app/main.py', '/@fs/C:/Users/User/Downloads/bau-das-lendas/backend/.demo-account.local.json']) {
    const privateResponse = await context.request.get(`${origin}${path}`)
    assert.equal(privateResponse.status(), 403, 'Arquivos do backend não podem ser servidos pelo Vite')
    const body = await privateResponse.text()
    assert.ok(!body.includes(credentials.password), 'A página de bloqueio não pode expor a senha')
  }
  const response = await context.request.post(`${origin}/api/auth/register`, { headers,
    data: { username: 'Isolamento cartas', email: `cards-${randomUUID()}@example.com`, password: randomUUID() } })
  assert.equal(response.status(), 201)
  const page = await context.newPage()
  await page.goto(origin)
  await page.evaluate(ids => localStorage.setItem('bau-grimorio', JSON.stringify(ids)), Object.keys(officialArtFiles))
  await page.goto(`${origin}/casa/cartas.html?carta=loira-do-banheiro`)
  await page.getByText('Coleção de Isolamento cartas.', { exact: false }).waitFor()
  assert.equal(await page.locator('#mesa [data-unlocked="true"]').count(), 0)
  assert.ok(await page.locator('#revelar').isHidden())
  assert.equal(await page.locator('#mesa .cx-frente img').count(), 1, 'Só Saci é exposição; localStorage não concede cartas')
  await context.request.post(`${origin}/api/auth/login`, { headers, data: { email: credentials.email, password: credentials.password } })
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await page.waitForFunction(() => document.querySelectorAll('#mesa [data-unlocked="true"]').length === 8)
  await context.request.post(`${origin}/api/auth/logout`, { headers })
  await page.evaluate(() => dispatchEvent(new Event('focus')))
  await page.waitForFunction(() => document.querySelectorAll('#mesa [data-unlocked="true"]').length === 0)
  await context.close()
  console.log('Isolamento, troca de conta, logout e rejeição de coleção forjada no localStorage APROVADOS.')
} finally { await browser.close() }
