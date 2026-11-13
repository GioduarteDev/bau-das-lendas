// Reino 3D, Quiz e Mapa: abrem sem erro como visitante e com cartas coletadas.
// Uso: com backend (8000) e vite (5175) rodando →  node tests/paginas-extras-browser.mjs
import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { randomUUID } from 'node:crypto'

const BASE = process.env.BAU_URL || 'http://localhost:5175'
const browser = await chromium.launch({ executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] })

async function abrir(cartas) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
  const page = await ctx.newPage()
  const erros = []
  page.on('pageerror', e => erros.push(e.message))
  if (cartas) {
    await page.goto(BASE + '/')
    await page.evaluate(async ({ n, u }) => {
      const h = { 'Content-Type': 'application/json', 'X-Bau-Request': '1' }
      await fetch('/api/auth/register', { method: 'POST', headers: h, credentials: 'include', body: JSON.stringify({ username: u, email: u + '@exemplo.com', password: 'SenhaForte123!' }) })
      for (let i = 0; i < n; i++) await fetch('/api/draws', { method: 'POST', headers: { ...h, 'Idempotency-Key': `${u}-${i}` }, credentials: 'include' })
    }, { n: cartas, u: 'extra' + randomUUID().slice(0, 8) })
  }
  return { ctx, page, erros }
}

for (const cartas of [0, 11]) {
  const { ctx, page, erros } = await abrir(cartas)

  await page.goto(BASE + '/reino/index.html')
  await page.waitForFunction(() => window.__reino, null, { timeout: 90000 })
  assert.equal(await page.evaluate(() => window.__reino.total), cartas, 'Reino mostra as cartas do usuário')
  await page.evaluate(() => window.__reino.trocarCena('mesa'))
  if (cartas) { await page.evaluate(() => { window.__reino.despertar(0); window.__reino.virar(0); window.__reino.virar(0) }) }

  await page.goto(BASE + '/quiz/index.html')
  await page.waitForFunction(() => window.__quiz)
  await page.click('#comecar')
  for (let i = 0; i < 10; i++) { await page.evaluate(() => window.__quiz.responder(true)); await page.evaluate(() => window.__quiz.proxima()) }
  assert.match(await page.textContent('#jogo'), /FIM DA RODADA/)

  await page.goto(BASE + '/mapa/index.html')
  await page.waitForFunction(() => window.__mapa, null, { timeout: 30000 })
  assert.equal(await page.evaluate(() => window.__mapa.total), 60, 'Mapa tem as 60 lendas')
  assert.equal(await page.evaluate(() => window.__mapa.coletadas), cartas)
  await page.evaluate(() => { window.__mapa.irPara('japao', false); window.__mapa.abrir(2) })
  assert.equal(await page.isVisible('#painel'), true)

  assert.deepEqual(erros, [], 'sem erros de JavaScript')
  console.log(`Reino 3D, Quiz e Mapa APROVADOS com ${cartas} cartas.`)
  await ctx.close()
}
await browser.close()
