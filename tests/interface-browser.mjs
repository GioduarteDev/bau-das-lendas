import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { mkdir, readFile } from 'node:fs/promises'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
const destination = 'tests/artifacts/interface'
const catalog = JSON.parse(await readFile('public/lendas-ra.json', 'utf8'))
process.env.PW_TEST_SCREENSHOT_NO_FONTS_READY = '1'
await mkdir(destination, { recursive: true })
const browser = await chromium.launch({
  executablePath: process.env.EDITOR_TEST_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true, args: ['--enable-unsafe-swiftshader'],
})
const requested = process.argv.slice(2)
const sizes = [[1440,900],[1024,768],[390,844],[360,740],[844,390],[667,375]]
  .filter(([width,height]) => !requested.length || requested.includes(`${width}x${height}`))

function intersects(a,b) {
  return a.x < b.x+b.width && a.x+a.width > b.x && a.y < b.y+b.height && a.y+a.height > b.y
}
async function boxOnScreen(page,selector,width,height) {
  const box=await page.locator(selector).boundingBox()
  assert.ok(box,selector)
  assert.ok(box.x>=-1 && box.y>=-1 && box.x+box.width<=width+1 && box.y+box.height<=height+1,`${selector} fora da tela: ${JSON.stringify(box)}`)
  return box
}
try {
  for (const [width,height] of sizes) {
    const label=`${width}x${height}`
    const context=await browser.newContext({viewport:{width,height},isMobile:width<760,hasTouch:width<760,reducedMotion:'no-preference'})
    // Fixture só para a revisão de interface: estes testes não validam persistência.
    await context.route('**/api/**',route=>route.fulfill({json: route.request().url().endsWith('/album') ? {
      positions:catalog.map(l=>({numero:l.numero,unlocked:false,legend:null,collected_at:null})),
      progress:{total:60,obtained:0,remaining:60,complete:false},
    } : {detail:'Entre na sua conta.'},status:route.request().url().endsWith('/album') ? 200 : 401}))
    const page=await context.newPage()
    const errors=[]
    page.on('pageerror',error=>errors.push(error.message))
    page.setDefaultTimeout(20000)
    await page.goto(origin)
    await page.locator('.world3d canvas').waitFor().catch(error=>{ console.error('Erros da página:',errors); throw error })
    await page.waitForTimeout(700)
    await boxOnScreen(page,'.limiar',width,height)
    const brand=await boxOnScreen(page,'.marca',width,height)
    if(width>1050) {
      const nav=await boxOnScreen(page,'#menu-principal',width,height)
      assert.ok(!intersects(brand,nav),'Marca e navegação se sobrepõem')
    }
    await page.screenshot({path:`${destination}/${label}-entrada.png`})
    await page.locator('.botao-explorar').click()
    await page.locator('.site.cena-travessia').waitFor()
    const meter=page.getByRole('progressbar',{name:'Percurso pelas lendas'})
    assert.equal(await meter.getAttribute('aria-valuenow'),'1')
    assert.ok(await page.getByRole('button',{name:'Lenda anterior',exact:true}).isDisabled())
    await page.getByRole('button',{name:'Próxima lenda',exact:true}).click()
    assert.equal(await meter.getAttribute('aria-valuenow'),'2')
    await page.keyboard.press('ArrowDown')
    assert.equal(await meter.getAttribute('aria-valuenow'),'3')
    await page.getByRole('button',{name:'Lenda anterior',exact:true}).click()
    assert.equal(await meter.getAttribute('aria-valuenow'),'2')
    const marker=await boxOnScreen(page,'.passos',width,height)
    const book=await boxOnScreen(page,'.grimorio-botao',width,height)
    assert.ok(!intersects(marker,book),'Percurso e grimório se sobrepõem')
    if(width<=1050) {
      await page.getByRole('button',{name:'Menu',exact:true}).click()
      await boxOnScreen(page,'#menu-principal',width,height)
      await page.mouse.wheel(0,220)
      assert.equal(await meter.getAttribute('aria-valuenow'),'2','Menu aberto deve suspender a navegação da cena')
      await page.waitForTimeout(450)
      await page.screenshot({path:`${destination}/${label}-menu.png`})
      await page.keyboard.press('Escape')
      assert.equal(await page.locator('.menu-alternar').getAttribute('aria-expanded'),'false')
      assert.ok(await page.locator('.menu-alternar').evaluate(el=>el===document.activeElement))
      await page.getByRole('button',{name:'Menu',exact:true}).click()
    }
    await page.getByRole('button',{name:'Lendas',exact:true}).click()
    const longest=catalog.reduce((a,b)=>a.nome.length>b.nome.length?a:b)
    await page.locator('.indice-lendas li').nth(catalog.findIndex(l=>l.id===longest.id)).getByRole('button').click()
    await page.waitForTimeout(900)
    const presence=await boxOnScreen(page,'.presenca',width,height)
    assert.ok(!intersects(presence,marker),'Título e percurso se sobrepõem')
    await page.screenshot({path:`${destination}/${label}-exploracao.png`})
    await page.getByRole('button',{name:'Investigar este registro',exact:false}).click()
    await page.getByRole('dialog',{name:`Dossiê de ${longest.nome}`}).waitFor()
    await page.waitForTimeout(600)
    await page.screenshot({path:`${destination}/${label}-dossie.png`})
    await page.keyboard.press('Escape')
    if(width<=1050) await page.getByRole('button',{name:'Menu',exact:true}).click()
    await page.getByRole('button',{name:'Portais',exact:true}).click()
    assert.equal(await page.locator('.portal-qr svg').count(),2)
    await page.waitForTimeout(650)
    await page.screenshot({path:`${destination}/${label}-portais.png`})
    await page.getByRole('button',{name:'Fechar',exact:false}).first().click()
    await page.getByRole('button',{name:'Meu Grimório',exact:false}).click()
    await page.getByText('0/60',{exact:true}).waitFor()
    assert.equal(await page.locator('.posicao').count(),60)
    await page.locator('.grimorio-fechar').click()
    assert.deepEqual(errors,[])
    console.log(`${label}: composição sem colisões, contador/setas/teclado, menu, dossiê, dois QRs e grimório aprovados.`)
    await context.close()
  }
} finally { await browser.close() }
