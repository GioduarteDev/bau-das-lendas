import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { randomUUID } from 'node:crypto'
import { mkdir, readFile } from 'node:fs/promises'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const artifacts = 'tests/artifacts/visual'
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
await mkdir(artifacts, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'],
})
const results = []
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1365, height: 900 },
      isMobile: mobile, hasTouch: mobile, reducedMotion: 'no-preference' })
    // Usa a mesma versão local do Three; o teste não depende do CDN.
    await context.route('https://unpkg.com/three@0.160.0/build/three.module.js', async route =>
      route.fulfill({ contentType: 'text/javascript', body: await readFile('node_modules/three/build/three.module.js', 'utf8') }))
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    page.setDefaultTimeout(20000)
    await page.goto(`${origin}/?conta=1`)
    await page.getByRole('button', { name: 'Criar uma conta', exact: true }).click()
    await page.getByLabel('Nome', { exact: true }).fill('Guardião de teste')
    const email = `visual-${randomUUID()}@example.com`, password = randomUUID()
    await page.getByLabel('E-mail', { exact: true }).fill(email)
    await page.getByLabel('Senha (10 a 128 caracteres)', { exact: true }).fill(password)
    await page.getByRole('button', { name: 'Criar conta', exact: true }).click()
    await page.getByText('Bem-vindo, Guardião de teste.', { exact: false }).waitFor()
    await page.getByRole('button', { name: 'Explorar as lendas' }).click()
    await page.locator('.site.cena-travessia').waitFor()
    const initial = await page.locator('.presenca h2').textContent()
    if (mobile) {
      await page.evaluate(() => {
        const site = document.querySelector('.site')
        site.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, touches: [new Touch({ identifier: 1, target: site, clientX: 150, clientY: 600 })] }))
        site.dispatchEvent(new TouchEvent('touchend', { bubbles: true, changedTouches: [new Touch({ identifier: 1, target: site, clientX: 150, clientY: 300 })] }))
      })
    } else await page.mouse.wheel(0, 250)
    await page.waitForFunction(name => document.querySelector('.presenca h2')?.textContent !== name, initial)
    assert.ok(await page.locator('.world3d canvas').isVisible())
    await page.getByRole('button', { name: 'Meu Grimório' }).click()
    await page.getByText('0/60', { exact: true }).waitFor()
    assert.equal(await page.locator('.posicao').count(), 60)
    assert.equal(await page.locator('.posicao.revelada').count(), 0)
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-capa.png` })
    await page.getByRole('button', { name: 'Próxima folha', exact: true }).click()
    await page.waitForTimeout(140)
    const moving = await page.locator('.stf__item').evaluateAll(items => items.some(item => /rotate|matrix/.test(item.style.transform)))
    assert.ok(moving, 'A capa deve girar fisicamente durante a abertura')
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-paginas.png` })
    const sheet = page.locator('.stf__item').filter({ has: page.locator(`[data-posicao="${mobile ? 1 : 7}"]`) })
    // O gesto inicia no papel selado, não em um botão de carta.
    const box = await sheet.boundingBox()
    assert.ok(box)
    const sx = box.x + box.width - 8, sy = box.y + box.height - 10
    let touch
    if (mobile) {
      touch = await context.newCDPSession(page)
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{x:sx,y:sy}] })
      for (let i=1;i<=12;i++) {
        await touch.send('Input.dispatchTouchEvent', {type:'touchMove',touchPoints:[{x:sx-box.width*.55*i/12,y:sy-box.height*.2*i/12}]})
        await page.waitForTimeout(16)
      }
    } else {
      await page.mouse.move(sx, sy); await page.mouse.down()
      await page.mouse.move(sx - box.width * .55, sy - box.height * .2, { steps: 12 })
    }
    await page.waitForTimeout(100)
    const curl = await page.locator('.stf__item').evaluateAll(items => items.some(item => item.style.clipPath.includes('polygon')))
    assert.ok(curl, 'Arrastar deve produzir recorte curvo da folha')
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-dobra.png` })
    if (mobile) await touch.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]})
    else await page.mouse.up()
    await page.waitForTimeout(1300)
    await page.getByRole('button', { name: 'Fechar', exact: false }).first().click()
    if (mobile) await page.getByRole('button', { name: 'Menu', exact: true }).click()
    await page.getByRole('button', { name: 'Portais', exact: true }).click()
    assert.equal(await page.locator('.portal-qr svg').count(), 2)
    await page.addScriptTag({url:`${origin}/vendor/jsQR.js`})
    const decoded = await page.locator('.portal-qr svg').evaluateAll(async svgs => Promise.all(svgs.map(async svg => {
      const image=new Image()
      image.src='data:image/svg+xml;base64,'+btoa(new XMLSerializer().serializeToString(svg))
      await image.decode()
      const canvas=document.createElement('canvas');canvas.width=800;canvas.height=800
      const ctx=canvas.getContext('2d');ctx.drawImage(image,0,0,800,800)
      return globalThis.jsQR(ctx.getImageData(0,0,800,800).data,800,800).data
    })))
    assert.deepEqual(decoded,[`${origin}/`,`${origin}/ra.html`],'Os dois QRs devem decodificar os destinos reais')
    const qr = await page.locator('.portal-qr svg').nth(1).evaluate(async svg => {
      const image = new Image()
      image.src = 'data:image/svg+xml;base64,' + btoa(new XMLSerializer().serializeToString(svg))
      await image.decode()
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 800
      canvas.getContext('2d').drawImage(image,0,0,800,800)
      return canvas.toDataURL()
    })
    await context.addInitScript(({ qr }) => {
      const image = new Image(); image.src = qr
      const canvas = document.createElement('canvas'); canvas.width = 1280; canvas.height = 720
      const ctx = canvas.getContext('2d')
      let visible = true
      const paint = () => { ctx.fillStyle = '#777'; ctx.fillRect(0,0,1280,720); if (visible && image.complete) ctx.drawImage(image,390,110,500,500) }
      globalThis.__cameraFixture = { setVisible(value) { visible = value; paint() } }
      navigator.mediaDevices.getUserMedia = async () => { await image.decode(); paint(); return canvas.captureStream(15) }
    }, { qr })
    const drawKeys=[]
    await context.route('**/api/draws', async route => {
      drawKeys.push(route.request().headers()['idempotency-key'])
      if (drawKeys.length===1) await route.abort('failed')
      else await route.continue()
    })
    await page.locator('.portal-selo').nth(1).getByRole('link', { name: 'Atravessar este portal' }).click()
    await page.getByRole('button', { name: 'INICIAR CÂMERA' }).click()
    await page.getByText('QR 02 reconhecido.', { exact: false }).waitFor()
    await page.screenshot({path:`${artifacts}/${mobile ? 'mobile' : 'desktop'}-bau.png`})
    assert.equal(drawKeys.length,0,'Reconhecer o QR não sorteia')
    await page.getByRole('button', { name: 'ABRIR BAÚ', exact: true }).click()
    await page.getByText('Toque em ABRIR BAÚ para tentar recuperar', {exact:false}).waitFor()
    await page.getByRole('button', { name: 'ABRIR BAÚ', exact: true }).click()
    await page.locator('#rewardOverlay:not([hidden])').waitFor()
    await page.getByText('1 / 60 REGISTROS DESCOBERTOS', { exact: true }).waitFor()
    await page.getByRole('button', { name: 'GIRAR CARTA' }).click()
    await page.getByText('FACE 2 DE 3', { exact: false }).waitFor()
    await page.waitForTimeout(800)
    await page.getByRole('button', { name: 'GIRAR CARTA' }).click()
    await page.getByText('FACE 3 DE 3', { exact: false }).waitFor()
    await page.waitForTimeout(800)
    await page.screenshot({ path: `${artifacts}/${mobile ? 'mobile' : 'desktop'}-carta.png` })
    assert.equal(drawKeys[0],drawKeys[1],'Retry mantém a chave da abertura')
    await page.getByRole('button',{name:'ESCANEAR NOVAMENTE',exact:true}).click()
    await page.evaluate(()=>globalThis.__cameraFixture.setVisible(false))
    await page.waitForTimeout(600)
    await page.evaluate(()=>globalThis.__cameraFixture.setVisible(true))
    await page.getByRole('button', { name: 'ABRIR BAÚ', exact: true }).click()
    await page.locator('#rewardOverlay:not([hidden])').waitFor()
    assert.notEqual(drawKeys[2],drawKeys[1],'Outra abertura tem chave nova')
    await page.getByRole('link', { name: 'Abrir meu grimório' }).click()
    await page.getByText('2/60', { exact: true }).waitFor()
    assert.equal(await page.locator('.posicao.revelada').count(), 2)
    const card=page.locator('.posicao.revelada').first()
    for(let i=0;i<10 && !await card.isVisible();i++) {
      await page.getByRole('button',{name:'Próxima folha',exact:true}).click()
      await page.waitForTimeout(1150)
    }
    await card.click()
    await page.getByRole('button',{name:'Virar carta'}).click()
    await page.getByRole('heading',{name:'O relato',exact:true}).waitFor()
    await page.getByRole('button',{name:'Virar carta'}).click()
    await page.locator('.inspecao-verso').waitFor()
    await page.locator('.inspecao-fechar').click()
    await page.locator('.grimorio-fechar').click()
    const logout=await page.request.post(`${origin}/api/auth/logout`,{headers:{Origin:origin,'X-Bau-Request':'1'}})
    assert.equal(logout.status(),204)
    await page.goto(`${origin}/?conta=1`)
    await page.getByLabel('E-mail',{exact:true}).fill(email)
    await page.getByLabel('Senha (10 a 128 caracteres)',{exact:true}).fill(password)
    await page.getByRole('button',{name:'Entrar',exact:true}).click()
    await page.getByText('Bem-vindo, Guardião de teste.',{exact:false}).waitFor()
    await page.getByRole('button',{name:'Abrir meu grimório',exact:true}).click()
    await page.getByText('2/60',{exact:true}).waitFor()
    assert.deepEqual(errors, [], 'Nenhum erro JavaScript não tratado')
    results.push(`${mobile ? 'Mobile emulado' : 'Desktop'}: cadastro/login, scroll 3D, capa/dobra, 60 posições, dois QRs decodificados, câmera sintética, sorteio real/retry/nova chave, três faces e álbum individual passaram.`)
    console.log(results.at(-1))
    await context.close()
  }
} finally { await browser.close() }
