import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
const dest='tests/artifacts/assombracoes'
await mkdir(dest,{recursive:true})
try {
  for(const tipo of ['espelho','olhos']) {
    const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'}),erros=[]
    page.on('pageerror',e=>erros.push(e.message))
    await page.goto(`${process.env.BAU_TEST_ORIGIN||'http://localhost:5175'}/?assombracao=${tipo}&apresentacao=1&atmosferaDebug=1`)
    await page.locator('.botao-explorar').click()
    await page.waitForFunction(tipo=>{const s=window.__bauAtmosfera?.inspecionar();return s?.aparicao===tipo&&s.tempoAparicao>2.4},tipo)
    await page.evaluate(()=>window.__bauAtmosfera.pausar(true))
    const s=await page.evaluate(()=>window.__bauAtmosfera.inspecionar())
    assert.equal(s.perfil,'mobile')
    assert.equal(s.espelho.pixels,256)
    assert.equal(s.ghostNaCameraPrincipal,false)
    assert.deepEqual(s.diretor.erros,[]);assert.deepEqual(erros,[])
    await page.screenshot({path:`${dest}/${tipo}-mobile-reduzido.png`})
    await page.close();console.log(`${tipo}: mobile, projeção e movimento reduzido sem erros.`)
  }
  const page=await browser.newPage({viewport:{width:900,height:650}})
  await page.goto(`${process.env.BAU_PRODUCTION_ORIGIN||'http://localhost:4175'}/?assombracoes=1&assombracao=boitata&atmosferaDebug=1`)
  await page.locator('.limiar').waitFor()
  assert.equal(await page.locator('.assombracoes-painel').count(),0)
  assert.equal(await page.evaluate(()=>typeof window.__bauAssombracoes),'undefined')
  await page.locator('.botao-explorar').click()
  await page.locator('.site.cena-travessia').waitFor()
  assert.notEqual(await page.evaluate(()=>window.__bauAtmosfera.inspecionar().aparicao),'boitata')
  console.log('Produção: painel e API de testes indisponíveis; atalho de evento desabilitado.')
} finally {await browser.close()}
