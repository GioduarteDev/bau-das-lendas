import assert from 'node:assert/strict'
import { mkdir,writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const origin=process.env.BAU_TEST_ORIGIN||'http://localhost:5175',dest='tests/artifacts/assombracoes'
await mkdir(dest,{recursive:true})
const browser=await chromium.launch({executablePath:process.env.EDITOR_TEST_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--enable-unsafe-swiftshader']})
const resultados=[],solicitados=process.argv.slice(2)
try {
  for(const tipo of ['olhos','espelho','lobo','saci','alta','estacao','boneca','boitata','porta','lampada','sombra','cortina','pegada','corvo','retrato']) {
    if(solicitados.length&&!solicitados.includes(tipo))continue
    const page=await browser.newPage({viewport:{width:1100,height:750}}),erros=[]
    page.on('pageerror',e=>erros.push(e.message));page.on('console',m=>{if(m.type()==='error'&&/WebGL|THREE|shader|GLSL/.test(m.text()))erros.push(m.text())})
    await page.goto(`${origin}/?assombracao=${tipo}&atmosferaDebug=1`)
    await page.locator('.botao-explorar').click()
    await page.waitForFunction(tipo=>{const s=window.__bauAtmosfera?.inspecionar();return s?.aparicao===tipo&&s.tempoAparicao>(s.diretor.ativo?.duracao??4)*.6},tipo)
    await page.evaluate(()=>window.__bauAtmosfera.pausar(true))
    const snapshot=await page.evaluate(()=>window.__bauAtmosfera.inspecionar())
    assert.equal(snapshot.cenario.modulos,11,'A câmera deve reaproveitar um conjunto limitado de módulos')
    if(tipo==='porta')assert.ok(snapshot.cenario.portasAbertas.length,'O evento deve abrir uma porta residencial do corredor')
    if(tipo==='retrato')assert.ok(snapshot.instalacoes.some(i=>i.id==='retrato-inquieto'&&i.retratoAlterado),'O retrato deve mudar durante a manifestação')
    await page.waitForTimeout(180)
    await page.screenshot({path:`${dest}/${tipo}.png`})
    assert.deepEqual(snapshot.diretor.erros,[])
    if(tipo==='lobo') {
      const wolf=snapshot.criaturas.find(c=>c.tipo==='lobo')
      assert.ok(Math.abs(wolf.posicao[0])<1.5,'A captura deve conter o centro da travessia')
      const indiceCamera=Math.max(0,Math.round((-2.5-snapshot.cameraZ)/7))
      assert.ok(wolf.posicao[2]>-8-indiceCamera*7+.4,'A placa deve ficar atrás da criatura')
    }
    if(tipo==='espelho') {
      assert.ok(snapshot.reflexos>2)
      assert.equal(snapshot.ghostNaCameraPrincipal,false)
      assert.equal(snapshot.espelho.camadaEntidade,2)
      assert.ok(snapshot.espelho.camadaReflexo&2)
      assert.equal(snapshot.espelho.entidadeVisivel,true)
    }
    await page.evaluate(()=>window.__bauAtmosfera.pausar(false))
    await page.waitForFunction(()=>window.__bauAtmosfera.inspecionar().aparicao===null)
    const final=await page.evaluate(()=>window.__bauAtmosfera.inspecionar())
    if(tipo==='espelho')assert.equal(final.espelho.entidadeVisivel,false)
    assert.deepEqual(erros,[])
    resultados.push({tipo,snapshot,erros})
    console.log(`${tipo}: efeito visível, estado/limpeza e shaders aprovados.`)
    await page.close()
  }
  if(!solicitados.length||solicitados.includes('painel')) {
    const page=await browser.newPage({viewport:{width:1000,height:750}})
    await page.goto(`${origin}/?assombracoes=1`)
    await page.locator('.botao-explorar').click()
    await page.locator('.site.cena-travessia').waitFor()
    await page.getByLabel('Evento sobrenatural').selectOption('olhos-limiar')
    await page.getByLabel('Duração do evento').fill('2')
    await page.getByRole('button',{name:'Disparar aqui',exact:true}).click()
    await page.waitForFunction(()=>window.__bauAssombracoes.inspecionar().diretor.ativo?.id==='olhos-limiar')
    await page.getByRole('button',{name:'Pausar cena',exact:true}).click()
    const antes=await page.evaluate(()=>window.__bauAssombracoes.inspecionar().diretor.ativo.decorrido)
    await page.waitForTimeout(400)
    assert.equal(await page.evaluate(()=>window.__bauAssombracoes.inspecionar().diretor.ativo.decorrido),antes)
    await page.screenshot({path:`${dest}/laboratorio.png`})
    await page.getByRole('button',{name:'Continuar cena',exact:true}).click()
    await page.getByRole('button',{name:'Disparar aqui',exact:true}).click()
    const d=await page.evaluate(()=>window.__bauAssombracoes.inspecionar().diretor)
    assert.equal(d.ativo.duracao,2)
    assert.ok(d.estados.find(e=>e.id==='olhos-limiar').execucoes>=2)
    await page.close();console.log('Laboratório: disparo, duração, pausa e repetição aprovados.')
  }
  await writeFile(`${dest}/resultados${solicitados.length?'-'+solicitados.join('-'):''}.json`,JSON.stringify(resultados,null,2))
} finally {await browser.close()}
