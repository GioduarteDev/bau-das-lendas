import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const origin=process.env.BAU_TEST_ORIGIN||'http://localhost:5175',destination='tests/artifacts/criaturas'
await mkdir(destination,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
const resultados=[]
const solicitados=process.argv.slice(2)
try {
  for(const [tipo,mobile] of [['lobo',false],['saci',false],['corvo',false],['alta',false],['lobo',true]]) {
    if(solicitados.length&&!solicitados.includes(tipo))continue
    const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1280,height:800},isMobile:mobile,hasTouch:mobile})
    const erros=[]
    page.on('pageerror',e=>erros.push(e.message))
    page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GLSL/i.test(m.text()))erros.push(m.text())})
    await page.goto(`${origin}/?assombracao=${tipo}&atmosferaDebug=1`)
    await page.locator('.botao-explorar').click()
    // Capture a pose no centro do trajeto antes de congelar o renderizador.
    await page.waitForFunction(tipo=>{
      const s=window.__bauAtmosfera?.inspecionar()
      return s?.aparicao===tipo&&s.tempoAparicao>1.6&&s.tempoAparicao<2.7
    },tipo)
    await page.evaluate(()=>window.__bauAtmosfera.pausar(true))
    const snapshot=await page.evaluate(()=>window.__bauAtmosfera.inspecionar())
    assert.ok(snapshot.criaturas.some(c=>c.tipo===tipo&&c.visivel))
    await page.waitForTimeout(200)
    await page.screenshot({path:`${destination}/${tipo}-corredor${mobile?'-mobile':''}.png`})
    await page.evaluate(()=>window.__bauAtmosfera.pausar(false))
    await page.waitForFunction(tipo=>{
      const s=window.__bauAtmosfera.inspecionar()
      return s.aparicao===null&&s.criaturas.every(c=>!c.visivel)
    },tipo)
    await page.mouse.wheel(0,400);await page.mouse.wheel(0,-200)
    assert.deepEqual(erros,[])
    resultados.push({tipo,mobile,snapshot,erros})
    console.log(`${tipo}${mobile?' mobile':''}: aparição visível, finalização e scroll sem erros.`)
    await page.close()
  }
  if(!solicitados.length||solicitados.includes('natural')) {
  const natural=await browser.newPage({viewport:{width:1280,height:800}})
  await natural.goto(`${origin}/?atmosferaDebug=1`)
  await natural.locator('.botao-explorar').click()
  await natural.locator('.site.cena-travessia').waitFor()
  await natural.getByRole('button',{name:'Lendas',exact:true}).click()
  await natural.locator('.indice-lendas').getByRole('button',{name:/Peter Stumpp/}).click()
  const antes=await natural.evaluate(()=>window.__bauAtmosfera.inspecionar())
  assert.equal(antes.aparicao,null,'Salto longo não deve iniciar evento longe da câmera')
  await natural.waitForFunction(()=>{const s=window.__bauAtmosfera.inspecionar();return s.aparicao==='lobo'&&s.tempoAparicao>1.6})
  await natural.evaluate(()=>window.__bauAtmosfera.pausar(true))
  await natural.screenshot({path:`${destination}/lobo-registro-12-natural.png`})
  const snapshot=await natural.evaluate(()=>window.__bauAtmosfera.inspecionar())
  assert.ok(Math.abs(snapshot.cameraZ-(-8-11*7+5.5))<6)
  resultados.push({tipo:'lobo-natural',snapshot})
  await natural.close()
  console.log('Registro 12: evento aguarda proximidade após salto pelo índice.')
  }
  await writeFile(`${destination}/corredor-resultados${solicitados.length?'-'+solicitados.join('-'):''}.json`,JSON.stringify(resultados,null,2))
} finally {await browser.close()}
