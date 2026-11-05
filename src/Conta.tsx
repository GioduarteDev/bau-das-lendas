import { useEffect, useState, type FormEvent } from 'react'
import { api, notifyAuth, type User } from './api'

export default function Conta({ aoExplorar, aoAbrirAlbum }: { aoExplorar: () => void; aoAbrirAlbum: () => void }) {
  const [user, setUser] = useState<User | null>(null)
  const [register, setRegister] = useState(false)
  const [busy, setBusy] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    api<User>('/auth/me').then(setUser).catch(error => {
      if (error.status !== 401) setMessage(error.message)
    }).finally(() => setBusy(false))
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const body = { email: data.get('email'), password: data.get('password'),
      ...(register ? { username: data.get('username') } : {}) }
    setBusy(true); setMessage('')
    try {
      setUser(await api<User>(`/auth/${register ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      }))
      notifyAuth()
      const retorno = new URLSearchParams(window.location.search).get('retorno')
      if (retorno === 'ritual') window.location.assign('/ra.html')
      else if (retorno === 'cartas') window.location.assign('/casa/cartas.html')
      else if (retorno === 'album') aoAbrirAlbum()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }

  async function logout() {
    setBusy(true); setMessage('')
    try {
      await api('/auth/logout', { method: 'POST' })
      setUser(null); notifyAuth()
    } catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }

  return <div className="conta-texto">
    {user ? <>
      <p>Bem-vindo, {user.username}. Sua coleção está salva na sua conta.</p>
      <p><button type="button" className="botao-ritual" onClick={aoExplorar}>Explorar as lendas →</button></p>
      <p><button type="button" className="botao-discreto" onClick={aoAbrirAlbum}>Abrir meu grimório</button></p>
      <p><a className="botao-discreto" href="/ra.html">Invocar o baú em RA →</a></p>
      <p><a className="botao-discreto" href="/casa/cartas.html">Ver cartas ilustradas →</a></p>
      <button type="button" className="botao-discreto" disabled={busy} onClick={logout}>Sair da conta</button>
    </> : <form onSubmit={submit}>
      {register && <p><label>Nome<br /><input name="username" autoComplete="nickname" minLength={2} maxLength={80} required /></label></p>}
      <p><label>E-mail<br /><input name="email" type="email" autoComplete="email" maxLength={254} required /></label></p>
      <p><label>Senha (10 a 128 caracteres)<br /><input name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={10} maxLength={128} required /></label></p>
      <button className="botao-ritual" disabled={busy}>{busy ? 'Aguarde…' : register ? 'Criar conta' : 'Entrar'}</button>
      <p><button type="button" className="botao-discreto" disabled={busy} onClick={() => { setRegister(!register); setMessage('') }}>
        {register ? 'Já tenho conta' : 'Criar uma conta'}
      </button></p>
    </form>}
    <p role="status" aria-live="polite">{message}</p>
  </div>
}
