// Executar com Vite e API ativos; cria uma conta de teste no banco configurado.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'

const origin = process.env.BAU_TEST_ORIGIN || 'http://localhost:5175'
let cookie = ''
async function request(path, method = 'GET', data, extraHeaders = {}) {
  const response = await fetch(`${origin}${path}`, { method,
    headers: { Origin: origin, 'X-Bau-Request': '1',
      ...(cookie ? { Cookie: cookie } : {}),
      ...(data ? { 'Content-Type': 'application/json' } : {}), ...extraHeaders },
    ...(data ? { body: JSON.stringify(data) } : {}),
  })
  if (response.headers.has('set-cookie')) cookie = response.headers.get('set-cookie').split(';')[0]
  return response
}

for (const path of ['/', '/ra.html', '/ra.js', '/api.js']) {
  const response = await request(path)
  assert.equal(response.status, 200, path)
  if (path === '/api.js') assert.match(await response.text(), /export async function api/)
}
assert.equal((await request('/api/health')).status, 200)
assert.equal((await request('/api/album')).status, 401)
const credentials = { username: 'Teste HTTP', email: `smoke-${randomUUID()}@example.com`, password: randomUUID() }
const registration = await request('/api/auth/register', 'POST', credentials)
assert.equal(registration.status, 201, await registration.clone().text())
assert.match(registration.headers.get('set-cookie'), /HttpOnly/i)
assert.equal((await request('/api/auth/me')).status, 200)
assert.equal((await (await request('/api/legends')).json()).length, 60)
const firstResponse = await request('/api/draws', 'POST', undefined, { 'Idempotency-Key': 'http-opening' })
assert.equal(firstResponse.status, 200, await firstResponse.clone().text())
const first = await firstResponse.json()
assert.equal(first.progress.obtained, 1)
assert.deepEqual(await (await request('/api/draws', 'POST', undefined, { 'Idempotency-Key': 'http-opening' })).json(), first)
const album = await (await request('/api/album')).json()
assert.equal(album.positions.filter(p => p.unlocked).length, 1)
assert.equal(album.positions.find(p => p.unlocked).legend.id, first.legend.id)
assert.equal((await request('/api/auth/logout', 'POST')).status, 204)
assert.equal((await request('/api/album')).status, 401)
assert.equal((await request('/api/auth/login', 'POST', { email: credentials.email, password: credentials.password })).status, 200)
assert.equal((await (await request('/api/album/progress')).json()).obtained, 1)
await request('/api/auth/logout', 'POST')
console.log('HTTP real aprovado: assets da RA, proxy, PostgreSQL, conta, cookie, sorteio, retry, álbum e logout.')
