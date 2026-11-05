import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const origin=process.env.BAU_TEST_ORIGIN||'http://localhost:5175'
const destination='tests/artifacts/criaturas'
await mkdir(destination,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
const resultados=[]
try {
  const context=await browser.newContext({viewport:{width:1280,height:800},recordVideo:{dir:`${destination}/video`,size:{width:960,height:600}}})
  const page=await context.newPage(),erros=[]
  const video=page.video()
  page.on('pageerror',e=>erros.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader|GLSL/i.test(m.text()))erros.push(m.text())})
  await page.goto(`${origin}/?criatura=lobo&acao=parado`)
  await page.waitForFunction(()=>window.__bauCriaturas?.inspecionar().quadros>3)
  await page.getByRole('button',{name:'Pausar',exact:true}).click()
  for(const tipo of ['lobo','saci','corvo','alta']) {
    await page.getByLabel('Criatura',{exact:true}).selectOption(tipo)
    await page.waitForFunction(tipo=>window.__bauCriaturas.inspecionar().modelos.some(m=>m.tipo===tipo&&m.visivel),tipo)
    await page.getByLabel('Ação',{exact:true}).selectOption('parado')
    await page.waitForTimeout(180)
    await page.screenshot({path:`${destination}/${tipo}-anatomia.png`})
    await page.getByLabel('Ação',{exact:true}).selectOption('movimento')
    for(const [i,t] of [.22,.41,.68].entries()) {
      await page.evaluate(t=>window.__bauCriaturas.tempo(t),t)
      await page.waitForTimeout(130)
      await page.screenshot({path:`${destination}/${tipo}-movimento-${i+1}.png`})
      const estado=await page.evaluate(()=>window.__bauCriaturas.inspecionar())
      resultados.push(estado)
      assert.ok(estado.triangulos>1000)
      const modelo=estado.modelos.find(m=>m.tipo===tipo)
      assert.ok(Math.abs(modelo.sombraY-.018)<.001,'Sombra de contato deve permanecer no piso, inclusive durante voo/salto')
      if(tipo==='lobo') {
        assert.ok(modelo.superficieContinua)
        assert.equal(modelo.pelagem,4200)
        assert.equal(modelo.patas.length,4)
        modelo.patas.filter(p=>p.contato).forEach(p=>assert.ok(Math.abs(p.y-.12)<.002,'Pata em contato deve permanecer no piso'))
      }
      if(tipo==='saci')assert.equal(modelo.patas.length,1)
    }
    await page.getByLabel('Velocidade',{exact:true}).selectOption('0.25')
    await page.getByRole('button',{name:'Continuar',exact:true}).click()
    await page.waitForTimeout(700)
    await page.getByLabel('Velocidade',{exact:true}).selectOption('1')
    await page.waitForTimeout(700)
    await page.getByRole('button',{name:'Pausar',exact:true}).click()
    if(tipo==='lobo') {
      await page.getByRole('button',{name:'Perfil',exact:true}).click()
      await page.waitForTimeout(200)
      await page.screenshot({path:`${destination}/lobo-perfil.png`})
    }
    if(tipo==='saci') {
      await page.getByLabel('Ação',{exact:true}).selectOption('desaparecer')
      await page.evaluate(()=>window.__bauCriaturas.tempo(3.2))
      await page.waitForTimeout(200)
      await page.screenshot({path:`${destination}/saci-desaparecendo.png`})
    }
    console.log(`${tipo}: anatomia e três fases da animação renderizadas sem erros.`)
  }
  // Voltar ao primeiro modelo força descarte/recriação após exceder três residentes.
  await page.getByLabel('Criatura',{exact:true}).selectOption('lobo')
  await page.waitForTimeout(400)
  const cache=await page.evaluate(()=>window.__bauCriaturas.inspecionar())
  assert.ok(cache.modelos.length<=3)
  assert.deepEqual(erros,[])
  await context.close()
  await video.saveAs(`${destination}/criaturas-inspecao.webm`)

  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true})
  await mobile.goto(`${origin}/?criatura=lobo&acao=parado&apresentacao=1`)
  await mobile.waitForFunction(()=>window.__bauCriaturas?.inspecionar().quadros>3)
  await mobile.screenshot({path:`${destination}/lobo-mobile-projecao.png`})
  const mob=await mobile.evaluate(()=>window.__bauCriaturas.inspecionar())
  assert.equal(mob.modelos[0].pelagem,1500)
  resultados.push(mob)
  await mobile.close()
  await writeFile(`${destination}/resultados.json`,JSON.stringify(resultados,null,2))
} finally {await browser.close()}
