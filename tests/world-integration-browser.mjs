import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'

// Regressão dos caminhos que continham referências indefinidas na cena existente.
const browser = await chromium.launch({
  executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'],
})
try {
  for (const appearance of ['olhos', 'saci']) {
    const page = await browser.newPage({ viewport: {width:800,height:600} })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.goto(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/?assombracao=${appearance}&atmosferaDebug=1`)
    await page.locator('.botao-explorar').click()
    await page.locator('.site.cena-travessia').waitFor()
    await page.waitForTimeout(5000)
    assert.ok(await page.locator('.world3d canvas').isVisible())
    assert.deepEqual(errors, [], `A aparição ${appearance} não pode interromper a cena`)
    if (appearance === 'olhos') {
      const { instalacoes } = await page.evaluate(() => window.__bauAtmosfera.inspecionar())
      assert.ok(!instalacoes.some(item => item.id.startsWith('olhos-')), 'A aparição preta de olhos luminosos permanece desativada')
    }
    console.log(`${appearance}: cena 3D executou sem erro JavaScript.`)
    await page.close()
  }
  const cameraPage = await browser.newPage({ viewport: {width:1100,height:750} })
  await cameraPage.goto(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/?atmosferaDebug=1`)
  await cameraPage.locator('.botao-explorar').click()
  await cameraPage.locator('.site.cena-travessia').waitFor()
  await cameraPage.waitForFunction(() => window.__bauAtmosfera.inspecionar().cameraZ < 0)
  const zBeforeScroll = await cameraPage.evaluate(() => window.__bauAtmosfera.inspecionar().cameraZ)
  await cameraPage.mouse.wheel(0, 620)
  await cameraPage.waitForFunction(z => window.__bauAtmosfera.inspecionar().cameraZ < z - 2, zBeforeScroll)
  const canvas = cameraPage.locator('.world3d canvas')
  const box = await canvas.boundingBox()
  assert.ok(box)
  await cameraPage.mouse.move(2, box.y + box.height / 2)
  await cameraPage.waitForTimeout(500)
  const yawLeft = await cameraPage.evaluate(() => window.__bauAtmosfera.inspecionar().orientacao.yaw)
  await cameraPage.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
  await cameraPage.waitForTimeout(500)
  const yawRight = await cameraPage.evaluate(() => window.__bauAtmosfera.inspecionar().orientacao.yaw)
  assert.ok(yawLeft > 0.6 && yawRight < -0.6, 'O mouse deve permitir olhar para ambos os lados')
  await cameraPage.mouse.move(box.x + box.width - 70, box.y + box.height / 2)
  await cameraPage.mouse.down({button:'right'})
  await cameraPage.mouse.move(box.x + box.width - 2, box.y + box.height / 2)
  await cameraPage.mouse.up({button:'right'})
  await cameraPage.waitForTimeout(500)
  const yawDragged = await cameraPage.evaluate(() => window.__bauAtmosfera.inspecionar().orientacao.yaw)
  assert.ok(yawDragged < yawRight - 0.15, 'Arrastar com o botão direito deve ampliar a rotação')
  const zAfterScroll = await cameraPage.evaluate(() => window.__bauAtmosfera.inspecionar().cameraZ)
  await cameraPage.mouse.wheel(0, -620)
  await cameraPage.waitForFunction(z => window.__bauAtmosfera.inspecionar().cameraZ > z + 2, zAfterScroll)
  assert.ok(await cameraPage.getByRole('button', {name:'Meu Grimório'}).isVisible())
  await cameraPage.getByRole('button', {name:'Meu Grimório'}).click()
  await cameraPage.getByRole('dialog', {name:'Grimório dos Esquecidos'}).waitFor()
  await cameraPage.locator('.grimorio-fechar').click()
  assert.ok(await cameraPage.getByRole('button', {name:'Investigar este registro'}).isVisible())
  await cameraPage.close()
  console.log('Scroll, mouse em ambos os lados, arraste direito, retorno e acesso ao Grimório aprovados.')

  const cardPage = await browser.newPage({ viewport: {width:1100,height:750} })
  cardPage.on('pageerror', error => { throw error })
  await cardPage.goto(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/?atmosferaDebug=1`)
  await cardPage.locator('.botao-explorar').click()
  await cardPage.locator('.site.cena-travessia').waitFor()
  await cardPage.waitForFunction(() => window.__bauAtmosfera.inspecionar().cameraZ < 0)
  const cardCanvas = cardPage.locator('.world3d canvas')
  const cardBox = await cardCanvas.boundingBox()
  assert.ok(cardBox)
  let target
  for (const x of [2, cardBox.width * .15, cardBox.width * .25, cardBox.width * .35, cardBox.width * .65, cardBox.width * .75, cardBox.width * .85, cardBox.width - 2]) {
    await cardPage.mouse.move(x, cardBox.height / 2)
    await cardPage.waitForTimeout(550)
    const result = await cardPage.evaluate(() => {
      const {cenario} = window.__bauAtmosfera.inspecionar()
      const canvas = document.querySelector('.world3d canvas')
      const rect = canvas.getBoundingClientRect()
      const cards = cenario.cartoes.map(card => ({
        ...card,
        x: rect.x + (card.x + 1) * rect.width / 2,
        y: rect.y + (1 - card.y) * rect.height / 2,
      }))
      return {cards,target:cards.find(card => card.z < 1 && card.x > 5 && card.x < innerWidth - 5
        && card.y > 85 && card.y < innerHeight - 100
        && document.elementFromPoint(card.x, card.y) === canvas)}
    })
    target=result.target
    if (target) break
  }
  assert.ok(target, 'Um card deve ficar visível ao olhar para as paredes laterais')
  await cardPage.mouse.move(target.x, target.y)
  await cardPage.mouse.click(target.x, target.y)
  const dialog = cardPage.getByRole('dialog', {name:/Dossiê de /})
  await dialog.waitFor()
  const selectedName = await dialog.getAttribute('aria-label')
  const record = JSON.parse(await (await cardPage.request.get(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/lendas-ra.json`)).text())[target.indice]
  assert.equal(selectedName, `Dossiê de ${record.nome}`, 'O card deve abrir o dossiê do seu registro')
  await cardPage.keyboard.press('Escape')
  assert.ok(await cardPage.getByRole('button', {name:'Meu Grimório'}).isVisible())
  await cardPage.goto(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/?portais`)
  assert.equal(await cardPage.locator('.portal-qr svg').count(), 2)
  assert.match(await cardPage.locator('.portal-selo').nth(1).getByRole('link').getAttribute('href'), /\/ra\.html$/)
  await cardPage.close()
  console.log('Card lateral abre o dossiê do registro correspondente; Grimório e RA permanecem acessíveis.')

  const page = await browser.newPage({ viewport: {width:1100,height:750} })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(`${process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'}/?atmosferaDebug=1`)
  await page.locator('.botao-explorar').click()
  await page.evaluate(() => window.__bauAssombracoes.localizar('porta-respira'))
  await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().cenario.salasVisiveis.includes(7))
  assert.ok(await page.locator('.world3d canvas').isVisible())
  await page.evaluate(() => window.__bauAssombracoes.localizar('porta-banheiro'))
  await page.waitForFunction(() => window.__bauAtmosfera.inspecionar().cenario.salasVisiveis.includes(20))
  assert.deepEqual(errors, [], 'Os dois interiores devem abrir sem interromper a cena')
  await page.close()
  console.log('Quarto e banheiro: portas revelam interiores 3D ao explorar seus registros.')
} finally { await browser.close() }
