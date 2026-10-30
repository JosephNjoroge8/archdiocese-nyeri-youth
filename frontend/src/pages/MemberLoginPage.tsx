import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, UserRound } from 'lucide-react'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? 'http://localhost:8001' : window.location.origin
)
const tokenKey = 'nyeri-youth-member-token'

type MemberProfile = {
  full_name: string
  membership_no: string
  status: string
  local_church?: {
    name: string
    parish?: { name: string; deanery?: { name: string } | null } | null
  } | null
  programs?: Array<{
    id: number
    name: string
    pivot?: { status: string; registration_date: string }
  }>
}

type ApiError = { message?: string; errors?: Record<string, string[]> }

export default function MemberLoginPage() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [member, setMember] = useState<MemberProfile | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!token) return
    let active = true

    void fetch(`${apiBaseUrl}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
      .then(async (response) => {
        const result = await response.json() as ApiError & {
          user?: { member?: MemberProfile | null }
        }
        if (!response.ok || !result.user?.member) {
          throw new Error(result.message ?? 'Unable to load your member profile.')
        }
        return result.user.member
      })
      .then((profile) => { if (active) setMember(profile) })
      .catch((loadError: unknown) => {
        if (!active) return
        localStorage.removeItem(tokenKey)
        setToken('')
        setMember(null)
        setError(loadError instanceof Error ? loadError.message : 'Unable to load your member profile.')
      })

    return () => { active = false }
  }, [token])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const result = await response.json() as ApiError & { token?: string }
      if (!response.ok || !result.token) {
        throw new Error(result.errors?.username?.[0] ?? result.message ?? 'Unable to sign in.')
      }

      localStorage.setItem(tokenKey, result.token)
      setToken(result.token)
      setPassword('')
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Unable to sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    setError('')
    try {
      await fetch(`${apiBaseUrl}/api/v1/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      })
    } catch {
      setError('Unable to contact the server. Your sign-in was cleared from this device.')
    } finally {
      localStorage.removeItem(tokenKey)
      setToken('')
      setMember(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 flex items-center gap-3">
          <div className="rounded-xl bg-sky-600 p-3 text-white"><UserRound size={23} /></div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Member portal</h1>
            <p className="text-sm text-slate-500">Sign in to view your membership and program registrations.</p>
          </div>
        </header>

        {error && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {!token ? (
          <form onSubmit={signIn} className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Member sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use your username and password. Imported members must first set a password using their one-time setup link.</p>
            <label className="mt-6 block text-sm font-semibold" htmlFor="member-username">Username</label>
            <input id="member-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
            <label className="mt-4 block text-sm font-semibold" htmlFor="member-password">Password</label>
            <input id="member-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
            <button disabled={loading} className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
            <p className="mt-4 text-center text-sm text-slate-500">New member? <Link to="/register" className="font-semibold text-sky-700 underline">Register here</Link></p>
          </form>
        ) : !member ? (
          <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">Loading your member profile…</p>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Welcome</p>
                <h2 className="mt-1 text-2xl font-black text-slate-900">{member.full_name}</h2>
                <p className="mt-1 text-sm text-slate-600">Membership number: <span className="font-semibold">{member.membership_no}</span></p>
              </div>
              <button onClick={() => void signOut()} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold hover:bg-slate-50">
                <LogOut size={16} /> Sign out
              </button>
            </div>

            <dl className="mt-6 grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Membership status</dt><dd className="mt-1 font-semibold capitalize">{member.status}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Local church</dt><dd className="mt-1 font-semibold">{member.local_church?.name ?? 'Not listed'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Parish</dt><dd className="mt-1 font-semibold">{member.local_church?.parish?.name ?? 'Not listed'}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Deanery</dt><dd className="mt-1 font-semibold">{member.local_church?.parish?.deanery?.name ?? 'Not listed'}</dd></div>
            </dl>

            <h3 className="mt-7 font-bold text-slate-900">Program registrations</h3>
            {!member.programs?.length ? (
              <p className="mt-3 text-sm text-slate-500">No program registrations are linked to this account.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200">
                {member.programs.map((program) => (
                  <li key={program.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                    <span className="font-semibold">{program.name}</span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold capitalize text-amber-800">{program.pivot?.status ?? 'pending'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
