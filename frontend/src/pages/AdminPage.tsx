import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { LogOut, Search, ShieldCheck } from 'lucide-react'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? 'http://localhost:8001' : window.location.origin
)
const tokenKey = 'nyeri-youth-admin-token'

type Registration = {
  id: number
  status: 'pending' | 'approved' | 'rejected'
  registration_date: string
  program: { id: number; name: string }
  member: {
    full_name: string
    membership_no: string
    username: string
    phone: string | null
    email: string | null
    local_church: string
    parish: string
  }
}

type ApiError = { message?: string; errors?: Record<string, string[]> }

export default function AdminPage() {
  const [token, setToken] = useState(() => localStorage.getItem(tokenKey) ?? '')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadRegistrations = useCallback(async () => {
    if (!token) return
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter) params.set('status', statusFilter)
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/registrations?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )

      if (response.status === 401 || response.status === 403) {
        localStorage.removeItem(tokenKey)
        setToken('')
        throw new Error('Your admin session is no longer valid. Please sign in again.')
      }
      if (!response.ok) throw new Error('Unable to load registrations.')

      const result = await response.json() as {
        data: Registration[]
        meta: { total: number }
      }
      setRegistrations(result.data)
      setTotal(result.meta.total)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load registrations.')
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, token])

  useEffect(() => {
    if (token) void loadRegistrations()
  }, [token, loadRegistrations])

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/auth/login`, {
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

  async function updateStatus(registrationId: number, status: Registration['status']) {
    setError('')
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/registrations/${registrationId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status }),
        },
      )
      if (!response.ok) {
        const result = await response.json() as ApiError
        throw new Error(result.errors?.status?.[0] ?? result.message ?? 'Unable to update status.')
      }
      await loadRegistrations()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'Unable to update status.')
    }
  }

  function signOut() {
    localStorage.removeItem(tokenKey)
    setToken('')
    setRegistrations([])
    setError('')
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 text-slate-800 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-600 p-3 text-white"><ShieldCheck size={23} /></div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Admin portal</h1>
              <p className="text-sm text-slate-500">Youth registration review</p>
            </div>
          </div>
          {token && (
            <button onClick={signOut} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100">
              <LogOut size={16} /> Sign out
            </button>
          )}
        </header>

        {error && <p role="alert" className="mb-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}

        {!token ? (
          <form onSubmit={signIn} className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Administrator sign in</h2>
            <p className="mt-1 text-sm text-slate-500">Use an administrator account provisioned on the server.</p>
            <label className="mt-6 block text-sm font-semibold" htmlFor="admin-username">Username</label>
            <input id="admin-username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
            <label className="mt-4 block text-sm font-semibold" htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500" />
            <button disabled={loading} className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700 disabled:opacity-60">{loading ? 'Signing in…' : 'Sign in'}</button>
          </form>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Registrations <span className="ml-1 text-sm font-medium text-slate-500">({total})</span></h2>
                <p className="mt-1 text-sm text-slate-500">Search applicants and review their program enrollment.</p>
              </div>
              <form onSubmit={(event) => { event.preventDefault(); void loadRegistrations() }} className="flex flex-col gap-2 sm:flex-row">
                <div className="relative">
                  <Search size={17} className="absolute left-3 top-3 text-slate-400" />
                  <input aria-label="Search registrations" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name, phone or membership no." className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm sm:w-64" />
                </div>
                <select aria-label="Filter by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-slate-300 px-3 py-2.5 text-sm">
                  <option value="">All statuses</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
                <button className="rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white">Search</button>
              </form>
            </div>
            {loading ? (
              <p className="p-8 text-center text-sm text-slate-500">Loading registrations…</p>
            ) : registrations.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">No registrations match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-3">Applicant</th><th className="px-5 py-3">Program</th><th className="px-5 py-3">Church / Parish</th><th className="px-5 py-3">Registered</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Review</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {registrations.map((registration) => (
                      <tr key={registration.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-900">{registration.member.full_name}</p>
                          <p className="mt-1 text-xs text-slate-500">{registration.member.membership_no} · @{registration.member.username}</p>
                          <p className="mt-1 text-xs text-slate-500">{registration.member.phone ?? registration.member.email ?? 'No contact provided'}</p>
                        </td>
                        <td className="px-5 py-4">{registration.program.name}</td>
                        <td className="px-5 py-4">{registration.member.local_church}<p className="mt-1 text-xs text-slate-500">{registration.member.parish}</p></td>
                        <td className="px-5 py-4">{registration.registration_date}</td>
                        <td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${registration.status === 'approved' ? 'bg-emerald-100 text-emerald-800' : registration.status === 'rejected' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>{registration.status}</span></td>
                        <td className="px-5 py-4">
                          <select aria-label={`Update ${registration.member.full_name} status`} value={registration.status} onChange={(event) => void updateStatus(registration.id, event.target.value as Registration['status'])} className="rounded-lg border border-slate-300 px-2.5 py-2 text-sm">
                            <option value="pending">Pending</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  )
}
