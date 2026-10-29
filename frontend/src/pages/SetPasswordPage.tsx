import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useSearchParams } from 'react-router-dom'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || (
  import.meta.env.DEV ? 'http://localhost:8001' : window.location.origin
)

type ApiError = { message?: string; errors?: Record<string, string[]> }

export default function SetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [complete, setComplete] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/auth/first-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          token,
          password,
          password_confirmation: confirmation,
        }),
      })
      const result = await response.json() as ApiError
      if (!response.ok) {
        throw new Error(
          result.errors?.token?.[0]
          ?? result.errors?.password?.[0]
          ?? result.message
          ?? 'Unable to set your password.',
        )
      }

      setComplete(true)
      setPassword('')
      setConfirmation('')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to set your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-800">
      <section className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm">
        <h1 className="text-xl font-black text-slate-900">Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose a private password to activate your member account. This setup link can only be used once.
        </p>

        {complete ? (
          <>
            <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Password saved. Your member account is ready.
            </div>
            <Link to="/login" className="mt-5 inline-flex rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700">Sign in</Link>
          </>
        ) : !token ? (
          <p role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
            This setup link is missing its token. Ask an administrator for a new link.
          </p>
        ) : (
          <form onSubmit={submit} className="mt-6">
            {error && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{error}</p>}
            <label htmlFor="new-password" className="block text-sm font-semibold">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500"
            />
            <label htmlFor="password-confirmation" className="mt-4 block text-sm font-semibold">Confirm password</label>
            <input
              id="password-confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-sky-500"
            />
            <button disabled={loading} className="mt-6 w-full rounded-lg bg-sky-600 px-4 py-3 font-bold text-white hover:bg-sky-700 disabled:opacity-60">
              {loading ? 'Saving…' : 'Set password'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}
