import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const dest='tests/artifacts/assombracoes',origin=process.env.BAU_TEST_ORIGIN||'http://localhost:5175'
await mkdir(dest,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
try {
  const context=await browser.newContext({viewport:{width:960,height:640},recordVideo:{dir:`${dest}/video`,size:{width:960,height:640}}})
  const page=await context.newPage(),video=page.video(),erros=[],vistos=[],capturados=new Set(),amostras=[]
  page.on('pageerror',e=>erros.push(e.message))
  page.on('console',m=>{if(m.type()==='error'&&/THREE|WebGL|shader/.test(m.text()))erros.push(m.text())})
  await page.goto(`${origin}/?apresentacao=1&demonstracao=1&atmosferaDebug=1`)
  await page.locator('.botao-explorar').click()
  const limite=Date.now()+180000
  let terminou=false
  while(Date.now()<limite) {
    await page.waitForTimeout(400)
    const s=await page.evaluate(()=>window.__bauAtmosfera?.inspecionar())
    if(!s)continue
    if(s.aparicao&&vistos.at(-1)!==s.aparicao){vistos.push(s.aparicao);console.log(`Apresentação: ${s.aparicao}, Z=${s.cameraZ.toFixed(1)}`)}
    if(s.aparicao&&s.tempoAparicao>(s.diretor.ativo?.duracao??4)*.6&&!capturados.has(s.aparicao)){
      capturados.add(s.aparicao)
      await page.evaluate(()=>window.__bauAtmosfera.pausar(true))
      await page.screenshot({path:`${dest}/apresentacao-${s.aparicao}.png`})
      await page.evaluate(()=>window.__bauAtmosfera.pausar(false))
      amostras.push(s)
    }
    if(s.demonstracaoCompleta){terminou=true;break}
  }
  assert.ok(terminou,'A sequência autônoma deve terminar')
  assert.deepEqual(vistos,['olhos','espelho','saci','lobo','boitata'])
  assert.deepEqual(erros,[])
  const final=await page.evaluate(()=>window.__bauAtmosfera.inspecionar())
  assert.ok(final.cameraZ < -25&&final.cameraZ > -36,'Travessia compacta de cinco baias')
  assert.deepEqual(final.diretor.erros,[])
  await writeFile(`${dest}/apresentacao-resultados.json`,JSON.stringify({vistos,erros,amostras,final},null,2))
  await context.close();await video.saveAs(`${dest}/apresentacao.webm`)
  console.log('Apresentação autônoma: cinco manifestações na ordem e intervalos previstos, sem erros.')
} finally {await browser.close()}
