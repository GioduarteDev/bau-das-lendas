import assert from 'node:assert/strict'
import { readdir,readFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

for(const file of (await readdir('dist/assets')).filter(f=>f.endsWith('.js'))) {
  const js=await readFile(`dist/assets/${file}`,'utf8')
  assert.ok(!js.includes('Estudo de criaturas')&&!js.includes('Controles de inspeção'),'Galeria de desenvolvimento excluída do bundle')
}
const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
try {
  const page=await browser.newPage({viewport:{width:800,height:600}})
  const erros=[];page.on('pageerror',e=>erros.push(e.message))
  await page.goto(`${process.env.BAU_PRODUCTION_ORIGIN||'http://localhost:4175'}/?criatura=lobo&assombracao=lobo&atmosferaDebug=1`)
  await page.locator('.limiar').waitFor()
  assert.equal(await page.locator('.criaturas-inspector').count(),0)
  assert.equal(await page.evaluate(()=>typeof window.__bauCriaturas),'undefined')
  assert.equal(await page.evaluate(()=>typeof window.__bauAtmosfera?.pausar),'undefined')
  await page.locator('.botao-explorar').click()
  await page.locator('.site.cena-travessia').waitFor()
  await page.waitForTimeout(1200)
  assert.notEqual(await page.evaluate(()=>window.__bauAtmosfera.inspecionar().aparicao),'lobo','Atalho de aparição desabilitado em produção; eventos naturais continuam disponíveis')
  assert.deepEqual(erros,[])
  console.log('Produção: galeria, pausa de captura e aparição forçada indisponíveis; site normal sem erros.')
} finally {await browser.close()}
