import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Download, FileSpreadsheet, LogOut, Search, ShieldCheck, Upload } from 'lucide-react'

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
    password_setup_pending: boolean
  }
}

type ApiError = { message?: string; errors?: Record<string, string[]> }
type Program = { id: number; name: string }
type ProgramField = { field_key: string; label: string; is_required: boolean }
type PreviewRow = {
  row: number
  values: Record<string, string | null>
  valid: boolean
  errors: Record<string, string[]>
}
type ImportResult = {
  data: Array<{
    row: number
    full_name: string
    username: string
    membership_no: string
    registration_id: number
    setup_url: string
  }>
  meta: { imported: number; skipped: number; total: number }
  skipped_rows: PreviewRow[]
}

const sharedColumns = ['full_name', 'username', 'phone', 'email', 'gender', 'dob', 'local_church_id']

function downloadCsv(filename: string, rows: string[][]) {
  const contents = rows.map((row) => row.map((value) => {
    const safeValue = /^[\s]*[=+\-@]/.test(value) ? `'${value}` : value
    return `"${safeValue.replaceAll('"', '""')}"`
  }).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/csv;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

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
  const [programs, setPrograms] = useState<Program[]>([])
  const [selectedProgramId, setSelectedProgramId] = useState('')
  const [loadedProgramFields, setLoadedProgramFields] = useState<{ programId: string; fields: ProgramField[] } | null>(null)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<{ previewId: string; rows: PreviewRow[]; meta: { total: number; valid: number; invalid: number } } | null>(null)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [setupLinks, setSetupLinks] = useState<Record<number, string>>({})
  const programFields = loadedProgramFields?.programId === selectedProgramId
    ? loadedProgramFields.fields
    : []

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
    // oxlint-disable-next-line react/set-state-in-effect
    if (token) void loadRegistrations()
  }, [token, loadRegistrations])

  useEffect(() => {
    let active = true
    void fetch(`${apiBaseUrl}/api/v1/programs`, { headers: { Accept: 'application/json' } })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load programs.')
        return await response.json() as { data: Program[] }
      })
      .then((result) => {
        if (!active) return
        // oxlint-disable-next-line react/set-state-in-effect
        setPrograms(result.data)
        if (result.data.length > 0) setSelectedProgramId(String(result.data[0].id))
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load programs.')
      })
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (!selectedProgramId) return
    let active = true
    void fetch(`${apiBaseUrl}/api/v1/programs/${selectedProgramId}/form-fields`, {
      headers: { Accept: 'application/json' },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('Unable to load program import fields.')
        return await response.json() as { fields: ProgramField[] }
      })
      .then((result) => {
        if (active) setLoadedProgramFields({ programId: selectedProgramId, fields: result.fields })
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Unable to load program import fields.')
      })
    return () => { active = false }
  }, [selectedProgramId])

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

  async function submitBulk(action: 'preview' | 'import') {
    if (!token || !selectedProgramId || !csvFile) return
    setBulkLoading(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('program_id', selectedProgramId)
      formData.append('file', csvFile)
      if (action === 'import' && preview?.previewId) {
        formData.append('preview_id', preview.previewId)
      }
      const response = await fetch(`${apiBaseUrl}/api/v1/admin/bulk-registrations/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
        body: formData,
      })
      const result = await response.json() as ApiError & {
        rows?: PreviewRow[]
        meta?: ImportResult['meta'] & { valid?: number; invalid?: number }
        preview_id?: string
        data?: ImportResult['data']
        skipped_rows?: PreviewRow[]
      }
      if (!response.ok) {
        throw new Error(result.errors?.file?.[0] ?? result.errors?.program_id?.[0] ?? result.message ?? 'Bulk registration failed.')
      }

      if (action === 'preview' && result.rows && result.meta && result.preview_id) {
        setPreview({
          previewId: result.preview_id,
          rows: result.rows,
          meta: {
            total: result.meta.total,
            valid: result.meta.valid ?? 0,
            invalid: result.meta.invalid ?? 0,
          },
        })
        setImportResult(null)
      } else if (action === 'import' && result.data && result.meta) {
        const imported = {
          data: result.data,
          meta: result.meta,
          skipped_rows: result.skipped_rows ?? [],
        }
        setImportResult(imported)
        setPreview(null)
        setCsvFile(null)
        const input = document.getElementById('bulk-registration-file') as HTMLInputElement | null
        if (input) input.value = ''
        await loadRegistrations()
      }
    } catch (bulkError) {
      setError(bulkError instanceof Error ? bulkError.message : 'Bulk registration failed.')
    } finally {
      setBulkLoading(false)
    }
  }

  async function regenerateSetupLink(registrationId: number) {
    setError('')
    try {
      const response = await fetch(
        `${apiBaseUrl}/api/v1/admin/registrations/${registrationId}/setup-link`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' } },
      )
      const result = await response.json() as ApiError & { setup_url?: string }
      if (!response.ok || !result.setup_url) {
        throw new Error(result.message ?? 'Unable to create a password setup link.')
      }
      setSetupLinks((current) => ({ ...current, [registrationId]: result.setup_url! }))
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Unable to create a password setup link.')
    }
  }

  function downloadSetupLinks() {
    if (!importResult) return
    downloadCsv('member-password-setup-links.csv', [
      ['full_name', 'username', 'membership_no', 'setup_url'],
      ...importResult.data.map((member) => [
        member.full_name,
        member.username,
        member.membership_no,
        member.setup_url,
      ]),
    ])
  }

  function signOut() {
    localStorage.removeItem(tokenKey)
    setToken('')
    setRegistrations([])
    setImportResult(null)
    setSetupLinks({})
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
          <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700"><FileSpreadsheet size={22} /></div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Bulk registration</h2>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  Upload a CSV to validate member rows, preview errors, then import valid rows. Imports create accounts with temporary credentials and pending program registrations.
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold">
                  Program
                  <select
                    value={selectedProgramId}
                    onChange={(event) => {
                      setSelectedProgramId(event.target.value)
                      setPreview(null)
                      setImportResult(null)
                    }}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal"
                  >
                    {programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  CSV file
                  <input
                    id="bulk-registration-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(event) => {
                      setCsvFile(event.target.files?.[0] ?? null)
                      setPreview(null)
                      setImportResult(null)
                    }}
                    className="mt-2 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={!selectedProgramId || programs.length === 0}
                onClick={() => downloadCsv('member-registration-template.csv', [[...sharedColumns, ...programFields.map((field) => field.field_key)]])}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
              >
                <Download size={16} /> Download template
              </button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Required columns: full_name, username, local_church_id, plus any selected-program fields configured as required. Optional shared columns: phone, email, gender, dob. Email and phone may be shared; usernames must be unique. CSV only, up to 5 MB and 500 rows.
            </p>

            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={!csvFile || !selectedProgramId || bulkLoading}
                onClick={() => void submitBulk('preview')}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-900 disabled:opacity-50"
              >
                <Search size={16} /> {bulkLoading ? 'Working…' : 'Validate and preview'}
              </button>
              {preview && preview.meta.valid > 0 && (
                <button
                  type="button"
                  disabled={bulkLoading}
                  onClick={() => void submitBulk('import')}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Upload size={16} /> Import {preview.meta.valid} valid row{preview.meta.valid === 1 ? '' : 's'}
                </button>
              )}
            </div>

            {preview && (
              <div className="mt-5">
                <p className="mb-3 text-sm font-semibold text-slate-700">
                  Preview: {preview.meta.valid} valid, {preview.meta.invalid} invalid of {preview.meta.total} rows. The server revalidates before import.
                </p>
                <div className="max-h-80 overflow-auto rounded-lg border border-slate-200">
                  <table className="w-full min-w-[620px] text-left text-sm">
                    <thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500">
                      <tr><th className="px-3 py-2">CSV row</th><th className="px-3 py-2">Name</th><th className="px-3 py-2">Username</th><th className="px-3 py-2">Result</th><th className="px-3 py-2">Errors</th></tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.rows.map((row) => (
                        <tr key={row.row} className="align-top">
                          <td className="px-3 py-2">{row.row}</td>
                          <td className="px-3 py-2">{row.values.full_name ?? '—'}</td>
                          <td className="px-3 py-2">{row.values.username ?? '—'}</td>
                          <td className={`px-3 py-2 font-semibold ${row.valid ? 'text-emerald-700' : 'text-rose-700'}`}>{row.valid ? 'Valid' : 'Invalid'}</td>
                          <td className="px-3 py-2 text-rose-700">
                            {Object.entries(row.errors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).join('; ') || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {importResult && (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-emerald-900">Imported {importResult.meta.imported} of {importResult.meta.total} rows</h3>
                    <p className="mt-1 text-sm text-emerald-800">
                      {importResult.meta.skipped} invalid rows were skipped. Setup links expire in 7 days and can only be used once. Distribute them securely; they are not emailed.
                    </p>
                  </div>
                  {importResult.data.length > 0 && (
                    <button type="button" onClick={downloadSetupLinks} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-800">
                      <Download size={16} /> Download setup links
                    </button>
                  )}
                </div>
                {importResult.data.length > 0 && (
                  <ul className="mt-4 space-y-2 text-sm">
                    {importResult.data.map((member) => (
                      <li key={member.registration_id} className="break-all">
                        <span className="font-semibold">{member.full_name} (@{member.username}):</span>{' '}
                        <a href={member.setup_url} target="_blank" rel="noreferrer" className="text-sky-800 underline">Open one-time setup link</a>
                      </li>
                    ))}
                  </ul>
                )}
                {importResult.skipped_rows.length > 0 && (
                  <details className="mt-4 text-sm text-rose-900">
                    <summary className="cursor-pointer font-semibold">Skipped rows and errors</summary>
                    <ul className="mt-2 space-y-1">
                      {importResult.skipped_rows.map((row) => (
                        <li key={row.row}>Row {row.row}: {Object.entries(row.errors).flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`)).join('; ')}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}
          </section>

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
                <table className="w-full min-w-[1000px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-5 py-3">Applicant</th><th className="px-5 py-3">Program</th><th className="px-5 py-3">Church / Parish</th><th className="px-5 py-3">Registered</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Review</th><th className="px-5 py-3">Account setup</th></tr>
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
                        <td className="px-5 py-4">
                          {registration.member.password_setup_pending ? (
                            <div>
                              <button type="button" onClick={() => void regenerateSetupLink(registration.id)} className="rounded-lg border border-sky-200 px-3 py-2 text-xs font-semibold text-sky-800 hover:bg-sky-50">
                                Generate setup link
                              </button>
                              {setupLinks[registration.id] && (
                                <p className="mt-2 max-w-56 break-all text-xs">
                                  <a href={setupLinks[registration.id]} target="_blank" rel="noreferrer" className="text-sky-800 underline">Open one-time link</a>
                                </p>
                              )}
                            </div>
                          ) : <span className="text-xs text-slate-500">Password set</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          </div>
        )}
      </div>
    </main>
  )
}
